export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export function error(message, status = 400, detail = null) {
  return json({ success: false, message, detail }, status);
}

export function ok(data = null, message = 'OK') {
  return json({ success: true, message, data });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (_) {
    return {};
  }
}

export function getPathId(context) {
  const path = context.params?.path;
  if (Array.isArray(path) && path.length > 0) return Number(path[0]);
  if (typeof path === 'string') return Number(path.split('/')[0]);
  return null;
}

export function requireAdmin(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.headers.get('x-admin-token') || '';
  return token === expected;
}

export function getTakerCredentials(request) {
  const url = new URL(request.url);
  return {
    phone: String(request.headers.get('x-taker-phone') || url.searchParams.get('taker_phone') || '').trim(),
    taker_code: String(request.headers.get('x-taker-code') || url.searchParams.get('taker_code') || url.searchParams.get('channel_code') || '').trim(),
    password: String(request.headers.get('x-taker-password') || '').trim()
  };
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

export async function hashPassword(password, salt = crypto.randomUUID()) {
  return `sha256:${salt}:${await sha256(`${salt}:${password}`)}`;
}

export async function verifyPassword(password, stored = '') {
  if (!stored) return false;
  const [method, salt, digest] = String(stored).split(':');
  if (method !== 'sha256' || !salt || !digest) return false;
  return await hashPassword(password, salt) === stored;
}

export async function makeNextTakerCode(db) {
  const row = await db.prepare("SELECT taker_code FROM users WHERE taker_code LIKE 'A____' ORDER BY taker_code DESC LIMIT 1").first();
  const next = row?.taker_code ? Number(String(row.taker_code).slice(1)) + 1 : 1;
  return `A${String(next).padStart(4, '0')}`;
}

export async function ensureTakerUser(db, { phone = '', taker_code = '', nickname = '', real_name = '', password = '', requirePassword = false, allowGenerateCode = false } = {}) {
  const normalizedPhone = String(phone || '').trim();
  const code = String(taker_code || '').trim();
  const normalizedPassword = String(password || '').trim();
  if (requirePassword && !normalizedPassword) throw new Error('密码必填');

  let existing = null;
  if (code) {
    existing = await db.prepare('SELECT * FROM users WHERE taker_code = ?').bind(code).first();
    if (existing?.phone && normalizedPhone && existing.phone !== normalizedPhone) throw new Error('这个渠道码已绑定其他手机号，不能占用');
  }

  if (!existing && normalizedPhone) {
    existing = await db.prepare("SELECT * FROM users WHERE role = 'taker' AND phone = ? AND status = 'ACTIVE' ORDER BY id LIMIT 1").bind(normalizedPhone).first();
    if (existing?.taker_code && code && existing.taker_code !== code) throw new Error('此手机号已绑定其他渠道码');
  }

  let finalCode = code || existing?.taker_code || '';
  if (!finalCode && allowGenerateCode) finalCode = await makeNextTakerCode(db);
  if (!finalCode) return null;

  if (existing) {
    let passwordHash = existing.password_hash || '';
    if (passwordHash) {
      if (!normalizedPassword || !await verifyPassword(normalizedPassword, passwordHash)) throw new Error('手机号或密码不正确');
    } else if (requirePassword) {
      passwordHash = await hashPassword(normalizedPassword);
    }
    const nextPhone = normalizedPhone || existing.phone || '';
    const nextNickname = nickname || existing.nickname || existing.real_name || finalCode;
    const nextRealName = real_name || existing.real_name || nextNickname;
    await db.prepare("UPDATE users SET role = 'taker', phone = ?, nickname = ?, real_name = ?, taker_code = ?, password_hash = ?, status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?")
      .bind(nextPhone, nextNickname, nextRealName, finalCode, passwordHash || null, existing.id).run();
    return { ...existing, role: 'taker', phone: nextPhone, nickname: nextNickname, real_name: nextRealName, taker_code: finalCode, password_hash: passwordHash || null, status: 'ACTIVE' };
  }

  const displayName = nickname || real_name || finalCode;
  const passwordHash = normalizedPassword ? await hashPassword(normalizedPassword) : null;
  const inserted = await db.prepare("INSERT INTO users (role, phone, password_hash, nickname, real_name, taker_code, status) VALUES ('taker', ?, ?, ?, ?, ?, 'ACTIVE')")
    .bind(normalizedPhone || '', passwordHash, displayName, real_name || displayName, finalCode).run();
  return { id: inserted.meta.last_row_id, role: 'taker', phone: normalizedPhone || '', nickname: displayName, real_name: real_name || displayName, taker_code: finalCode, password_hash: passwordHash, status: 'ACTIVE' };
}

export async function getTakerIdentity(request, env, { create = false, nickname = '', real_name = '' } = {}) {
  if (!env.DB) return null;
  const credentials = getTakerCredentials(request);
  if (!credentials.phone || !credentials.taker_code || !credentials.password) return null;
  if (create) return ensureTakerUser(env.DB, { ...credentials, nickname, real_name, requirePassword: true });
  const user = await env.DB.prepare("SELECT * FROM users WHERE role = 'taker' AND status = 'ACTIVE' AND taker_code = ?").bind(credentials.taker_code).first();
  if (!user) return null;
  if (!user.phone || credentials.phone !== user.phone) return null;
  if (!await verifyPassword(credentials.password, user.password_hash)) return null;
  return user;
}

export async function canAccessBlessing(db, blessing, taker) {
  if (!blessing || !taker?.id) return false;
  if (String(blessing.current_taker_id || '') === String(taker.id)) return true;
  const record = await db.prepare('SELECT id FROM blessing_records WHERE blessing_id = ? AND (actor_user_id = ? OR from_taker_id = ? OR to_taker_id = ?) LIMIT 1')
    .bind(blessing.id, taker.id, taker.id, taker.id).first();
  return Boolean(record);
}

export function canOperateBlessing(blessing, taker) {
  return Boolean(blessing && taker?.id && String(blessing.current_taker_id || '') === String(taker.id));
}

export async function all(db, sql, ...binds) {
  const stmt = db.prepare(sql);
  return binds.length ? await stmt.bind(...binds).all() : await stmt.all();
}

export async function first(db, sql, ...binds) {
  const stmt = db.prepare(sql);
  return binds.length ? await stmt.bind(...binds).first() : await stmt.first();
}

export function makeTaskId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `FL${y}${m}${d}${rand}`;
}

export const demoRituals = [
  { id: 1, name: '补财库', description: '补财库祈福项目。正式版可在后台替换图文介绍。', price_cents: 0, status: 'ACTIVE' },
  { id: 2, name: '祈福消灾', description: '祈福消灾项目。', price_cents: 0, status: 'ACTIVE' },
  { id: 3, name: '超度法事', description: '超度类项目。', price_cents: 0, status: 'ACTIVE' }
];

export const demoTakers = [
  { id: 1, nickname: '示例接单员', phone: '18800000001', taker_code: 'T001' }
];

