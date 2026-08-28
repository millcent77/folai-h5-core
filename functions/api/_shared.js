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
