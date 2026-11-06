import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import { CITIES } from './cities.js';
import { computeChart } from './chart.js';
import { createGuest, getBalance, spendOne, addBalance } from './users.js';
import { loadInterpretations, buildFacts, buildPrompt } from './facts.js';
import { streamAnswer } from './llm.js';
import { validate } from './validate.js';
import { track, getMetrics } from './events.js';
import { coach } from './coach.js';
import crypto from 'crypto';
import { renderCard } from './card.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/guest', async (req, res) => {
    const user = await createGuest(req.body?.ref);
    await track('guest_created', user.id, req.body?.ref);
    res.json({ userId: user.id, balance: user.balance });
});

app.get('/api/me/:userId', async (req, res) => {
    const balance = await getBalance(req.params.userId);
    if (balance === null) return res.status(404).json({ error: 'Unknown user' });
    res.json({ balance });
});

app.post('/api/topup', async (req, res) => {
    const balance = await addBalance(req.body.userId, 5, 'topup');
    await track('topup', req.body.userId);
    res.json({ balance });
});

app.post('/api/coach', async (req, res) => {
    const { userId } = req.body;
    const question = String(req.body.question ?? '').trim().slice(0, 300);
    if (!question) return res.status(400).json({ error: 'Type a question first' });
    const c = await query('SELECT chart_json FROM charts WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
    const result = await coach(question, c.rows[0]?.chart_json);
    if (result.verdict === 'ok' && result.rewrites.length) await track('coach_shown', userId);
    res.json(result);
});

app.post('/api/chart', async (req, res) => {
    const { userId, date, time, city, ref } = req.body;
    const place = CITIES[city];
    if (!place) return res.status(400).json({ error: 'Pick a city from the list' });
    const dateParts = String(date ?? '').split('-');
    const timeParts = String(time ?? '').split(':');

    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);
    if ([year, month, day, hour, minute].some(Number.isNaN))
        return res.status(400).json({ error: 'Check your date and time' });

    const chart = computeChart({ year, month, day, hour, minute, lat: place.lat, lon: place.lon });
    await query(
        `INSERT INTO charts(user_id, birth_date, birth_time, place, lat, lon, chart_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [userId, date, time, city, place.lat, place.lon, JSON.stringify(chart)]
    );
    if (ref) {
        await query('UPDATE users SET referred_by = $2 WHERE id = $1 AND referred_by IS NULL', [userId, ref]);
        await track('activated_from_share', userId, ref);
    }
    await track('chart_created', userId);
    res.json({ chart });
});
function headlineFrom(text: string) {
    const cleaned = text.replace(/\[F\d+\]/g, '').replace(/\s+/g, ' ').trim();
    const sentences = (cleaned.match(/[^.!?]+[.!?]*/g) ?? [cleaned])
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    const greeting = /^(hello|hi|hey|greetings|dear reader)[,!\s.]*/i;
    const useful = sentences.find((sentence) => !greeting.test(sentence) && sentence.length >= 24)
        ?? sentences.find((sentence) => !greeting.test(sentence))
        ?? '';
    const first = useful || 'A note from your chart';
    return first.length > 118 ? first.slice(0, 115).trimEnd() + '...' : first;
}

const cardCache = new Map<string, Buffer>();

app.post('/api/share', async (req, res) => {
    const { userId, answerId } = req.body;
    const a = await query(
        `SELECT a.text FROM answers a JOIN questions q ON q.id = a.question_id
     WHERE a.id = $1 AND q.user_id = $2`, [answerId, userId]);
    if (!a.rows[0]) return res.status(404).json({ error: 'Answer not found' });

    const c = await query('SELECT chart_json FROM charts WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
    const chart = c.rows[0]?.chart_json;
    const moon = chart?.planets.find((p: any) => p.name === 'Moon');
    const signLine = chart ? `${chart.ascendant} rising \u00B7 Moon in ${moon?.sign}` : '';

    const headline = headlineFrom(a.rows[0].text);
    const ins = await query(
        `INSERT INTO shares(public_id, answer_id, headline, sign_line) VALUES ($1,$2,$3,$4)
     ON CONFLICT (answer_id) DO NOTHING RETURNING public_id`,
        [crypto.randomBytes(5).toString('base64url'), answerId, headline, signLine]);

    let shareId = ins.rows[0]?.public_id;
    if (shareId) await track('share_created', userId, shareId);
    else {
        const existing = await query(
            'UPDATE shares SET headline=$1, sign_line=$2 WHERE answer_id=$3 RETURNING public_id',
            [headline, signLine, answerId]);
        shareId = existing.rows[0]?.public_id;
    }
    if (!shareId) return res.status(500).json({ error: 'Could not create share card' });
    for (const format of ['card', 'og', 'story']) cardCache.delete(`${shareId}:${format}`);
    res.json({ shareId });
});

app.get('/api/share/:id', async (req, res) => {
    const r = await query('SELECT public_id, headline, sign_line FROM shares WHERE public_id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'This card has faded away' });
    res.json(r.rows[0]);
});

app.get('/api/share/:id/card.png', async (req, res) => {
    const format: 'card' | 'og' | 'story' = req.query.format === 'story'
        ? 'story'
        : req.query.format === 'og' ? 'og' : 'card';
    const key = `${req.params.id}:${format}`;
    let png = cardCache.get(key);
    if (!png) {
        const r = await query('SELECT headline, sign_line FROM shares WHERE public_id=$1', [req.params.id]);
        if (!r.rows[0]) return res.sendStatus(404);
        png = Buffer.from(await renderCard({ headline: r.rows[0].headline, signLine: r.rows[0].sign_line, format }));
        cardCache.set(key, png);
    }
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=0, must-revalidate' }).send(png);
});

app.post('/api/event', async (req, res) => {
    const allowed = ['coach_shown', 'coach_accepted', 'share_opened'];
    if (!allowed.includes(req.body.type)) return res.status(400).json({ error: 'bad event' });
    await track(req.body.type, req.body.userId, req.body.shareId);
    res.json({ ok: true });
});

app.get('/api/metrics', async (_req, res) => res.json(await getMetrics()));

app.post('/api/ask', async (req, res) => {
    const { userId } = req.body;
    const question = String(req.body.question ?? '').trim().slice(0, 300);
    const coachUsed = Boolean(req.body.coachUsed);
    if (!question) return res.status(400).json({ error: 'Type a question first' });

    const c = await query('SELECT chart_json FROM charts WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
    if (!c.rows[0]) return res.status(400).json({ error: 'Add your birth details first' });

    const paid = await spendOne(userId);
    if (!paid) return res.status(402).json({ error: 'no_balance' });

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    const send = (event: string, data: object) =>
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const started = Date.now();
    let firstTokenMs: number | null = null;
    let full = '';
    let provider = '';
    try {
        const facts = buildFacts(c.rows[0].chart_json);
        const { system, user } = buildPrompt(facts, question);

        for await (const ev of streamAnswer(system, user)) {
            if (ev.type === 'reset') { full = ''; send('reset', {}); continue; }
            if (firstTokenMs === null) firstTokenMs = Date.now() - started;
            provider = ev.provider;
            full += ev.text;
            send('token', { text: ev.text });
        }

        const v = validate(full, facts);
        if (!v.text) throw new Error('empty after validation');

        const q = await query(
            'INSERT INTO questions(user_id, raw_text, final_text, coach_used) VALUES ($1,$2,$2,$3) RETURNING id',
            [userId, question, coachUsed]
        );
        const a = await query(
            `INSERT INTO answers(question_id, text, fact_ids, provider, first_token_ms, total_ms, validated)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [q.rows[0].id, v.text, v.factIds, provider, firstTokenMs, Date.now() - started, v.grounded]
        );
        await track('answer_delivered', userId, undefined, { grounded: v.grounded, coachUsed });
        send('final', {
            answerId: a.rows[0].id,
            text: v.text,
            grounded: v.grounded,
            facts: facts.filter((f) => v.factIds.includes(f.id)),
            balance: await getBalance(userId),
        });
    } catch (e) {
        console.error('ask failed:', (e as Error).message);
        const balance = await addBalance(userId, 1, 'refund');
        send('error', { message: 'The stars are busy right now. Your question was refunded, try again in a moment.', balance });
    }
    res.end();
});

loadInterpretations().then(() => {
    app.listen(process.env.PORT ?? 4000, () => console.log('API ready'));
});
