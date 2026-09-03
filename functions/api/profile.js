import { ok, error, readJson, ensureTakerUser } from './_shared.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error('D1 未绑定，不能保存接单员资料', 503);
  const body = await readJson(request);
  const phone = String(body.phone || '').trim();
  const takerCode = String(body.channel_code || body.taker_code || '').trim();
  const password = String(body.password || '').trim();
  const nickname = String(body.nickname || '').trim();
  if (!phone) return error('手机号必填');
  if (!password) return error('首次登录必须设置密码，后续登录也必须输入密码');
  try {
    const user = await ensureTakerUser(env.DB, {
      phone,
      taker_code: takerCode,
      password,
      nickname: nickname || phone,
      real_name: nickname || phone,
      requirePassword: true,
      allowGenerateCode: true
    });
    return ok({ id: user.id, phone: user.phone, nickname: user.nickname, taker_code: user.taker_code }, '已登录并同步接单员资料');
  } catch (err) {
    return error(err.message || '登录失败', 400);
  }
}
