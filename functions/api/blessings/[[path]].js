import { ok, error, readJson, getPathId, requireAdmin, makeTaskId, getTakerIdentity, canAccessBlessing, canOperateBlessing } from '../_shared.js';

function makeAccessCode() { return String(Math.floor(Math.random() * 900000 + 100000)); }
function maskMobile(value = '') { if (!value || value.length < 7) return value || ''; return value.slice(0, 3) + '****' + value.slice(-4); }
function normalizeStatus(status) { const allowed = ['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'RETURNED']; return allowed.includes(status) ? status : null; }

async function blessingDetail(db, id) {
  const info = await db.prepare('SELECT * FROM blessings WHERE id = ?').bind(id).first();
  if (!info) return null;
  const items = await db.prepare('SELECT * FROM blessing_items WHERE blessing_id = ? ORDER BY id').bind(info.id).all();
  const records = await db.prepare('SELECT * FROM blessing_records WHERE blessing_id = ? ORDER BY created_at, id').bind(info.id).all();
  const scenarios = await db.prepare('SELECT * FROM scenarios WHERE blessing_id = ? ORDER BY created_at DESC, id DESC').bind(info.id).all();
  const media = await db.prepare("SELECT id, owner_type, owner_id, r2_key, url, filename, content_type, size, created_at FROM media_files WHERE owner_id = ? AND owner_type IN ('scenario','blessing') ORDER BY created_at DESC, id DESC").bind(info.id).all();
  return { info, items: items.results || [], records: records.results || [], scenarios: scenarios.results || [], media: media.results || [] };
}

function safeListRow(row, admin = false) {
  return { ...row, access_code: undefined, mobile: admin ? row.mobile : maskMobile(row.mobile) };
}

function safeDetail(detail, admin = false) {
  return { ...detail, info: { ...detail.info, access_code: undefined, mobile: admin ? detail.info.mobile : maskMobile(detail.info.mobile) } };
}

async function findActiveTakerByCode(db, code) {
  if (!code) return null;
  return await db.prepare("SELECT * FROM users WHERE role = 'taker' AND status = 'ACTIVE' AND taker_code = ?").bind(code).first();
}

async function hasMediaFromTaker(db, blessingId, takerId) {
  const row = await db.prepare("SELECT id FROM scenarios WHERE blessing_id = ? AND uploader_user_id = ? LIMIT 1").bind(blessingId, takerId).first();
  return Boolean(row);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = getPathId(context);
  const url = new URL(request.url);
  const admin = requireAdmin(request, env);
  if (!env.DB) return ok({ list: [], total: 0, demo: true, message: 'D1 未绑定，当前为前端演示模式。' });
  const taskId = (url.searchParams.get('task_id') || '').trim();
  const accessCode = (url.searchParams.get('access_code') || '').trim();

  if (id) {
    const detail = await blessingDetail(env.DB, id);
    if (!detail) return error('祈福需求不存在', 404);
    const taker = admin ? null : await getTakerIdentity(request, env);
    const canTakerRead = taker ? await canAccessBlessing(env.DB, detail.info, taker) : false;
    if (!admin && !canTakerRead && (accessCode !== detail.info.access_code || taskId !== detail.info.task_id)) return error('请提供需求编号和查询码后查看详情', 403);
    return ok(safeDetail(detail, admin || canTakerRead));
  }

  const status = normalizeStatus(url.searchParams.get('status'));
  const takerId = Number(url.searchParams.get('taker_id') || 0);
  const channelCode = (url.searchParams.get('channel_code') || '').trim();
  const where = [];
  const binds = [];
  if (admin) {
    if (status) { where.push('status = ?'); binds.push(status); }
    if (takerId) { where.push('current_taker_id = ?'); binds.push(takerId); }
    if (channelCode) { where.push('channel_code = ?'); binds.push(channelCode); }
  } else if (taskId && accessCode) {
    where.push('task_id = ? AND access_code = ?'); binds.push(taskId, accessCode);
  } else {
    return error('请提供需求编号和查询码进行查询', 400);
  }
  const sql = 'SELECT id, task_id, access_code, channel_code, real_name, mobile, birthday, zodiac, sex, status, payment_status, current_taker_id, created_at, completed_at FROM blessings ' + (where.length ? 'WHERE ' + where.join(' AND ') : '') + ' ORDER BY created_at DESC, id DESC LIMIT 100';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  const list = (rows.results || []).map((row) => safeListRow(row, admin));
  return ok({ list, total: list.length });
}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const realName = String(body.real_name || '').trim();
  const birthday = String(body.birthday || '').trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!realName || !birthday || items.length === 0) return error('姓名、生日和祈福项目必填');
  const taskId = makeTaskId();
  const accessCode = makeAccessCode();
  if (!env.DB) {
    const demoChannelCode = String(body.channel_code || '').trim();
    if (!demoChannelCode) return error('首次未绑定渠道码时，发布需求必须填写渠道码');
    return ok({ task_id: taskId, access_code: accessCode, demo: true, channel_code: demoChannelCode }, '演示模式：需求已模拟提交');
  }

  const takerProfile = await getTakerIdentity(request, env);
  const channelCode = takerProfile?.taker_code || String(body.channel_code || '').trim();
  if (!channelCode) return error('首次未绑定渠道码时，发布需求必须填写渠道码');
  const targetTaker = takerProfile || await findActiveTakerByCode(env.DB, channelCode);
  if (!targetTaker) return error('渠道码不存在，请确认后再发布');

  const remarkImages = Array.isArray(body.remark_images) ? body.remark_images.join(',') : '';
  const insert = await env.DB.prepare('INSERT INTO blessings (task_id, access_code, channel_code, real_name, mobile, birthday, age, zodiac, sex, remark_text, remark_images, current_taker_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(taskId, accessCode, channelCode, realName, body.mobile || '', birthday, Number(body.age || 0), body.zodiac || '', body.sex || '', body.remark_text || '', remarkImages, targetTaker.id)
    .run();
  const blessingId = insert.meta.last_row_id;

  for (const item of items) {
    const ritualId = Number(item.ritual_id);
    const ritual = await env.DB.prepare('SELECT id, name FROM rituals WHERE id = ?').bind(ritualId).first();
    if (!ritual) continue;
    await env.DB.prepare('INSERT INTO blessing_items (blessing_id, ritual_id, ritual_name, quantity) VALUES (?, ?, ?, ?)').bind(blessingId, ritual.id, ritual.name, Number(item.quantity || 1)).run();
  }
  await env.DB.prepare('INSERT INTO blessing_records (blessing_id, action, to_taker_id, note) VALUES (?, ?, ?, ?)').bind(blessingId, 'CREATED', targetTaker.id, '创建祈福需求，自动分配到渠道码 ' + channelCode).run();
  return ok({ id: blessingId, task_id: taskId, access_code: accessCode, channel_code: channelCode, current_taker_id: targetTaker.id }, '需求创建成功');
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const admin = requireAdmin(request, env);
  const id = getPathId(context);
  if (!id) return error('缺少需求 ID');
  if (!env.DB) return error('D1 未绑定，不能执行写操作', 503);
  const body = await readJson(request);
  const action = body.action;
  const blessing = await env.DB.prepare('SELECT * FROM blessings WHERE id = ?').bind(id).first();
  if (!blessing) return error('祈福需求不存在', 404);
  const taker = admin ? null : await getTakerIdentity(request, env);
  if (!admin && !canOperateBlessing(blessing, taker)) return error('只有当前接单员可以操作这条需求', 403);
  const actorId = admin ? (Number(body.actor_user_id || 0) || null) : taker.id;
  const fromTakerId = Number(blessing.current_taker_id || 0) || (taker?.id || null);

  if (action === 'assign') {
    const targetCode = String(body.taker_code || '').trim();
    const target = await findActiveTakerByCode(env.DB, targetCode);
    if (!target) return error('请输入已注册的渠道码/接单员号');
    await env.DB.batch([
      env.DB.prepare("UPDATE blessings SET current_taker_id = ?, status = 'PENDING', updated_at = datetime('now') WHERE id = ?").bind(target.id, id),
      env.DB.prepare('INSERT INTO blessing_records (blessing_id, actor_user_id, action, from_taker_id, to_taker_id, note) VALUES (?, ?, ?, ?, ?, ?)').bind(id, actorId, 'ASSIGNED', fromTakerId, target.id, '流转给接单员 ' + targetCode)
    ]);
    return ok(await blessingDetail(env.DB, id), '已流转分配');
  }

  if (action === 'complete') {
    const currentTakerId = admin ? Number(blessing.current_taker_id || 0) : taker.id;
    if (!currentTakerId || !await hasMediaFromTaker(env.DB, id, currentTakerId)) return error('只有当前最终接单员上传照片或视频后才能完成订单', 400);
  }

  const nextStatus = { accept: 'ACCEPTED', complete: 'COMPLETED', cancel: 'CANCELLED', return: 'RETURNED' }[action];
  const recordAction = { accept: 'ACCEPTED', complete: 'COMPLETED', cancel: 'CANCELLED', return: 'RETURNED' }[action];
  const note = { accept: '确认接单', complete: '完成需求', cancel: '取消需求', return: body.note || '退回需求' }[action];
  if (!nextStatus) return error('未知操作');
  const completedSql = action === 'complete' ? ", completed_at = datetime('now')" : '';
  const acceptedSql = action === 'accept' ? ", accepted_at = datetime('now')" : '';
  await env.DB.batch([
    env.DB.prepare('UPDATE blessings SET status = ?' + completedSql + acceptedSql + ", updated_at = datetime('now') WHERE id = ?").bind(nextStatus, id),
    env.DB.prepare('INSERT INTO blessing_records (blessing_id, actor_user_id, action, from_taker_id, note) VALUES (?, ?, ?, ?, ?)').bind(id, actorId, recordAction, fromTakerId, note)
  ]);
  return ok(await blessingDetail(env.DB, id), note);
}
