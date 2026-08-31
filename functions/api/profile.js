import { ok, error, readJson, ensureTakerUser } from './_shared.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error('D1 未绑定，不能保存接单员资料', 503);
  const body = await readJson(request);
  const phone = String(body.phone || '').trim();
  const takerCode = String(body.channel_code || body.taker_code || '').trim();
  const nickname = String(body.nickname || '').trim();
  if (!phone) return error('手机号必填');
  if (!takerCode) return error('渠道码/接单员号必填');
  const user = await ensureTakerUser(env.DB, {
    phone,
    taker_code: takerCode,
    nickname: nickname || phone,
    real_name: nickname || phone
  });
  return ok({ id: user.id, phone: user.phone, nickname: user.nickname, taker_code: user.taker_code }, '已保存接单员资料');
}
