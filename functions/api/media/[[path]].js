import { error, requireAdmin, getTakerIdentity, canAccessBlessing } from '../_shared.js';

function safeDecodePath(value = '') {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}


export async function onRequestGet({ request, params, env }) {
  if (!env.PRAYER_MEDIA) return error('R2 未绑定', 503);
  const rawKey = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const key = safeDecodePath(rawKey || '');
  if (!key) return error('缺少媒体 key');

  const admin = requireAdmin(request, env);
  if (!admin) {
    if (!env.DB) return error('D1 未绑定，不能验证媒体权限', 503);
    const url = new URL(request.url);
    const taskId = url.searchParams.get('task_id') || '';
    const accessCode = url.searchParams.get('access_code') || '';
    const media = await env.DB.prepare('SELECT owner_id FROM media_files WHERE r2_key = ?').bind(key).first();
    if (!media || !media.owner_id) return error('无法验证媒体权限', 403);
    const blessing = await env.DB.prepare('SELECT * FROM blessings WHERE id = ?').bind(media.owner_id).first();
    const taker = await getTakerIdentity(request, env);
    const takerAllowed = taker ? await canAccessBlessing(env.DB, blessing, taker) : false;
    const codeAllowed = blessing && taskId === blessing.task_id && accessCode === blessing.access_code;
    if (!takerAllowed && !codeAllowed) return error('没有媒体访问权限', 403);
  }

  const object = await env.PRAYER_MEDIA.get(key);
  if (!object) return error('文件不存在', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=300');
  return new Response(object.body, { headers });
}
