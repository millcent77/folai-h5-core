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
    taker_code: String(request.headers.get('x-taker-code') || url.searchParams.get('taker_code') || url.searchParams.get('channel_code') || '').trim()
  };
}

export async function ensureTakerUser(db, { phone = '', taker_code = '', nickname = '', real_name = '' } = {}) {
  const code = String(taker_code || '').trim();
  if (!code) return null;
  const existing = await db.prepare('SELECT * FROM users WHERE taker_code = ?').bind(code).first();
  if (existing) {
    const nextPhone = phone || existing.phone || '';
    const nextNickname = nickname || existing.nickname || existing.real_name || code;
    const nextRealName = real_name || existing.real_name || nextNickname;
    await db.prepare("UPDATE users SET role = 'taker', phone = ?, nickname = ?, real_name = ?, status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?")
      .bind(nextPhone, nextNickname, nextRealName, existing.id).run();
    return { ...existing, role: 'taker', phone: nextPhone, nickname: nextNickname, real_name: nextRealName, status: 'ACTIVE' };
  }
  const displayName = nickname || real_name || code;
  const inserted = await db.prepare("INSERT INTO users (role, phone, nickname, real_name, taker_code, status) VALUES ('taker', ?, ?, ?, ?, 'ACTIVE')")
    .bind(phone || '', displayName, real_name || displayName, code).run();
  return { id: inserted.meta.last_row_id, role: 'taker', phone: phone || '', nickname: displayName, real_name: real_name || displayName, taker_code: code, status: 'ACTIVE' };
}

export async function getTakerIdentity(request, env, { create = false, nickname = '', real_name = '' } = {}) {
  if (!env.DB) return null;
  const credentials = getTakerCredentials(request);
  if (!credentials.taker_code) return null;
  if (create) return ensureTakerUser(env.DB, { ...credentials, nickname, real_name });
  const user = await env.DB.prepare("SELECT * FROM users WHERE role = 'taker' AND status = 'ACTIVE' AND taker_code = ?").bind(credentials.taker_code).first();
  if (!user) return null;
  if (credentials.phone && user.phone && credentials.phone !== user.phone) return null;
  return user;
}

export async function canAccessBlessing(db, blessing, taker) {
  if (!blessing || !taker?.id) return false;
  if (blessing.channel_code && blessing.channel_code === taker.taker_code) return true;
  if (String(blessing.current_taker_id || '') === String(taker.id)) return true;
  const record = await db.prepare('SELECT id FROM blessing_records WHERE blessing_id = ? AND (actor_user_id = ? OR from_taker_id = ? OR to_taker_id = ?) LIMIT 1')
    .bind(blessing.id, taker.id, taker.id, taker.id).first();
  return Boolean(record);
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
