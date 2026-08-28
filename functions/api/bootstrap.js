import { ok, demoRituals, demoTakers } from './_shared.js';

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return ok({ rituals: demoRituals, takers: demoTakers.map(({ phone, ...taker }) => taker), demo: true });
  }

  const rituals = await env.DB.prepare(
    "SELECT id, name, description, price_cents, cover_url, status FROM rituals WHERE status = 'ACTIVE' ORDER BY sort_order, id"
  ).all();
  const takers = await env.DB.prepare(
    "SELECT id, nickname, taker_code FROM users WHERE role = 'taker' AND status = 'ACTIVE' ORDER BY id"
  ).all();

  return ok({ rituals: rituals.results || [], takers: takers.results || [], demo: false });
}
