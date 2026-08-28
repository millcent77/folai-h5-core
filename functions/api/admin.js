import { ok, error, readJson, requireAdmin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  if (!requireAdmin(request, env)) return error('后台需要管理员 Token', 401);
  if (!env.DB) return error('D1 未绑定', 503);
  const blessings = await env.DB.prepare('SELECT * FROM blessings ORDER BY created_at DESC, id DESC LIMIT 200').all();
  const rituals = await env.DB.prepare('SELECT * FROM rituals ORDER BY sort_order, id').all();
  const takers = await env.DB.prepare("SELECT id, role, phone, nickname, real_name, taker_code, status, created_at FROM users WHERE role = 'taker' ORDER BY id").all();
  return ok({ blessings: blessings.results || [], rituals: rituals.results || [], takers: takers.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!requireAdmin(request, env)) return error('后台需要管理员 Token', 401);
  if (!env.DB) return error('D1 未绑定', 503);
  const body = await readJson(request);
  if (body.type === 'ritual') {
    if (!body.name) return error('项目名称必填');
    const result = await env.DB.prepare('INSERT INTO rituals (name, description, price_cents, cover_url, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(body.name, body.description || '', Number(body.price_cents || 0), body.cover_url || '', Number(body.sort_order || 0), body.status || 'ACTIVE').run();
    return ok({ id: result.meta.last_row_id }, '项目已创建');
  }
  if (body.type === 'taker') {
    if (!body.nickname || !body.taker_code) return error('接单员昵称和渠道码必填');
    const result = await env.DB.prepare("INSERT INTO users (role, phone, nickname, real_name, taker_code, status) VALUES ('taker', ?, ?, ?, ?, 'ACTIVE')")
      .bind(body.phone || '', body.nickname, body.real_name || body.nickname, body.taker_code).run();
    return ok({ id: result.meta.last_row_id }, '接单员已创建');
  }
  return error('未知后台创建类型');
}
