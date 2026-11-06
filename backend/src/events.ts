import { query } from './db.js';

export const track = (type: string, userId?: string, shareId?: string, meta?: object) =>
    query('INSERT INTO events(type, user_id, share_id, meta) VALUES ($1,$2,$3,$4)', [
        type, userId ?? null, shareId ?? null, meta ? JSON.stringify(meta) : null,
    ]).catch((e) => console.error('track failed', e.message));

export const rate = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);

export async function getMetrics() {
    const r = await query(`
    SELECT
      (SELECT count(*) FROM events WHERE type='share_created')::int AS shares,
      (SELECT count(*) FROM events WHERE type='share_opened')::int AS opens,
      (SELECT count(DISTINCT user_id) FROM events WHERE type='activated_from_share')::int AS activated,
      (SELECT count(*) FROM events WHERE type='coach_shown')::int AS coach_shown,
      (SELECT count(*) FROM events WHERE type='coach_accepted')::int AS coach_accepted,
      (SELECT count(*) FROM answers)::int AS answers,
      (SELECT count(*) FROM answers WHERE validated)::int AS grounded,
      (SELECT COALESCE(round(avg(first_token_ms)), 0) FROM answers)::int AS avg_first_word_ms
  `);
    const m = r.rows[0];
    return {
        ...m,
        share_to_activation_pct: rate(m.activated, m.shares),
        coach_acceptance_pct: rate(m.coach_accepted, m.coach_shown),
        grounded_pct: rate(m.grounded, m.answers),
        updated_at: new Date().toISOString(),
    };
}