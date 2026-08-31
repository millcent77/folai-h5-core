import { ok, error, requireAdmin, getTakerIdentity, canAccessBlessing } from './_shared.js';

function makeKey(file) {
  const safe = (file.name || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `blessings/${Date.now()}-${Math.floor(Math.random() * 10000)}-${safe}`;
}

export async function onRequestPost({ request, env }) {
  const admin = requireAdmin(request, env);
  const taker = admin ? null : await getTakerIdentity(request, env, { create: true });
  if (!admin && !taker) return error('请先用手机号和渠道码/接单员号登录后上传', 401);
  if (!env.PRAYER_MEDIA) return error('R2 未绑定，不能上传文件', 503);

  const form = await request.formData();
  const files = form.getAll('file').filter(Boolean);
  const ownerType = form.get('owner_type') || 'scenario';
  const ownerId = Number(form.get('owner_id') || 0) || null;
  const note = String(form.get('note') || '');
  if (files.length === 0) return error('请选择文件');
  if (!env.DB && !admin) return error('D1 未绑定，不能验证接单员上传权限', 503);
  if (env.DB && ownerId && !admin) {
    const blessing = await env.DB.prepare('SELECT * FROM blessings WHERE id = ?').bind(ownerId).first();
    const allowed = await canAccessBlessing(env.DB, blessing, taker);
    if (!allowed) return error('此接单员不能给这条需求上传文件', 403);
  }

  const uploaded = [];
  const imageUrls = [];
  const videoUrls = [];
  for (const file of files) {
    const key = makeKey(file);
    await env.PRAYER_MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });
    const url = `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
    const record = { key, r2_key: key, url, filename: file.name, content_type: file.type, size: file.size };
    uploaded.push(record);
    if ((file.type || '').startsWith('video/')) videoUrls.push(url); else imageUrls.push(url);
    if (env.DB) {
      await env.DB.prepare('INSERT INTO media_files (owner_type, owner_id, r2_key, url, filename, content_type, size) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(ownerType, ownerId, key, url, file.name || '', file.type || '', file.size || 0).run();
    }
  }
  if (env.DB && ownerType === 'scenario' && ownerId) {
    await env.DB.prepare('INSERT INTO scenarios (blessing_id, uploader_user_id, images, videos, note) VALUES (?, ?, ?, ?, ?)')
      .bind(ownerId, taker?.id || null, imageUrls.join(','), videoUrls.join(','), note).run();
    await env.DB.prepare('INSERT INTO blessing_records (blessing_id, actor_user_id, action, note) VALUES (?, ?, ?, ?)')
      .bind(ownerId, taker?.id || null, 'SCENARIO_UPLOADED', '上传现场概况').run();
  }
  return ok({ files: uploaded }, '上传成功');
}
