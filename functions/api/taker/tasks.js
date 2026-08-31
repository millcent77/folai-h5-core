import { ok, error, getTakerIdentity } from '../_shared.js';

async function enrichBlessing(db, row) {
  const items = await db.prepare('SELECT * FROM blessing_items WHERE blessing_id = ? ORDER BY id').bind(row.id).all();
  const media = await db.prepare("SELECT id, owner_type, owner_id, r2_key, url, filename, content_type, size, created_at FROM media_files WHERE owner_id = ? AND owner_type IN ('scenario','blessing') ORDER BY created_at DESC, id DESC").bind(row.id).all();
  const records = await db.prepare('SELECT * FROM blessing_records WHERE blessing_id = ? ORDER BY created_at, id').bind(row.id).all();
  return { ...row, items: items.results || [], media: media.results || [], records: records.results || [] };
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return error('D1 未绑定', 503);
  const taker = await getTakerIdentity(request, env);
  if (!taker) return error('请先用手机号和渠道码/接单员号登录', 401);
  const rows = await env.DB.prepare(`
    SELECT DISTINCT b.*,
      (SELECT COUNT(*) FROM media_files m WHERE m.owner_id = b.id AND m.owner_type IN ('scenario','blessing')) AS media_count
    FROM blessings b
    LEFT JOIN blessing_records r ON r.blessing_id = b.id
    WHERE b.channel_code = ?
       OR b.current_taker_id = ?
       OR r.actor_user_id = ?
       OR r.from_taker_id = ?
       OR r.to_taker_id = ?
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT 100
  `).bind(taker.taker_code, taker.id, taker.id, taker.id, taker.id).all();
  const list = [];
  for (const row of rows.results || []) list.push(await enrichBlessing(env.DB, row));
  return ok({ taker: { id: taker.id, nickname: taker.nickname, taker_code: taker.taker_code }, list, total: list.length });
}
