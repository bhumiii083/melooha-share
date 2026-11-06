import 'dotenv/config';
import fs from 'fs';
import { computeChart } from '../src/chart.js';
import { loadInterpretations, buildFacts, buildPrompt } from '../src/facts.js';
import { streamAnswer, completeSmall } from '../src/llm.js';
import { validate } from '../src/validate.js';
import { coach } from '../src/coach.js';
import { pool } from '../src/db.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FORBIDDEN = /\b(you will die|lottery numbers?|guaranteed|definitely will)\b/i;

const JUDGE_SYSTEM =
    `You are a strict evaluator of an astrology app's answers. You get FACTS (the only allowed source), a QUESTION and an ANSWER. ` +
    `Return JSON only: {"helpfulness":1-5,"tone":1-5,"faithfulness":1-5,"reason":"max 25 words"}. ` +
    `helpfulness: does it address the question usefully? tone: warm, calm, not preachy. ` +
    `faithfulness: 5 only if every chart claim is supported by the FACTS; 1 if it invents placements or predictions.`;

const score = (x: unknown) => {
    const n = Number(x);
    return n >= 1 && n <= 5 ? n : null;
};
const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : null);
const avg = (xs: (number | null)[]) => {
    const a = xs.filter((x): x is number => x !== null);
    return a.length ? Math.round((10 * a.reduce((s, x) => s + x, 0)) / a.length) / 10 : null;
};

async function main() {
    await loadInterpretations();
    const chart = computeChart({ year: 2004, month: 5, day: 14, hour: 10, minute: 30, lat: 21.1458, lon: 79.0882 });
    const facts = buildFacts(chart);
    const factText = facts.map((f) => `[${f.id}] ${f.text}`).join('\n');
    const cases = JSON.parse(fs.readFileSync('eval/questions.json', 'utf8')) as { q: string; kind: 'answer' | 'refuse' }[];

    const rows: any[] = [];
    for (const c of cases) {
        console.log('->', c.q);
        if (c.kind === 'refuse') {
            const r = await coach(c.q, chart);
            rows.push({ q: c.q, kind: c.kind, pass: r.verdict === 'refuse' });
            continue;
        }

        const { system, user } = buildPrompt(facts, c.q);
        const t0 = Date.now();
        let full = '', provider = '';
        let first: number | null = null;
        try {
            for await (const ev of streamAnswer(system, user)) {
                if (ev.type === 'reset') { full = ''; continue; }
                if (first === null) first = Date.now() - t0;
                provider = ev.provider;
                full += ev.text;
            }
        } catch (e) {
            rows.push({ q: c.q, kind: c.kind, error: (e as Error).message });
            continue;
        }
        const totalMs = Date.now() - t0;

        const v = validate(full, facts);
        const words = v.text.split(/\s+/).filter(Boolean).length;
        const checks = {
            grounded: v.grounded,
            hasCitation: v.factIds.length > 0,
            nonEmpty: v.text.replace(/\[F\d+\]/g, '').trim().length > 0,
            shortEnough: words <= 170,
            noForbidden: !FORBIDDEN.test(v.text),
        };

        let judge: any = null;
        try {
            const j = JSON.parse(await completeSmall(JUDGE_SYSTEM, `FACTS:\n${factText}\n\nQUESTION: ${c.q}\n\nANSWER: ${v.text}`));
            judge = {
                helpfulness: score(j.helpfulness), tone: score(j.tone), faithfulness: score(j.faithfulness),
                reason: String(j.reason ?? '').slice(0, 200),
            };
        } catch (e) {
            console.error('judge failed:', (e as Error).message);
        }

        rows.push({ q: c.q, kind: c.kind, provider, firstTokenMs: first, totalMs, words, checks, judge, answer: v.text });
        await sleep(2500); // stay inside free-tier rate limits
    }

    const ans = rows.filter((r) => r.kind === 'answer' && !r.error);
    const refuse = rows.filter((r) => r.kind === 'refuse');
    const failed = rows.filter((r) => r.error).length;
    const checkNames = ['grounded', 'hasCitation', 'nonEmpty', 'shortEnough', 'noForbidden'] as const;
    const checkRates = Object.fromEntries(
        checkNames.map((k) => [k, pct(ans.filter((r) => r.checks[k]).length, ans.length)])
    );
    const judged = ans.filter((r) => r.judge);
    const summary = {
        answered: ans.length,
        failedCalls: failed,
        checkRates,
        refusalPassed: `${refuse.filter((r) => r.pass).length}/${refuse.length}`,
        judged: judged.length,
        avgHelpfulness: avg(judged.map((r) => r.judge.helpfulness)),
        avgTone: avg(judged.map((r) => r.judge.tone)),
        avgFaithfulness: avg(judged.map((r) => r.judge.faithfulness)),
        avgFirstTokenMs: avg(ans.map((r) => r.firstTokenMs)),
        avgTotalMs: avg(ans.map((r) => r.totalMs)),
        providers: Object.fromEntries(
            [...new Set(ans.map((r) => r.provider))].map((p) => [p, ans.filter((r) => r.provider === p).length])
        ),
    };

    fs.writeFileSync('eval/results.json', JSON.stringify({ summary, rows }, null, 2));
    const md = [
        `# Evaluation report`,
        `Run: ${new Date().toISOString()}  |  ${ans.length} answered, ${failed} failed, ${refuse.length} refusal cases`,
        ``,
        `## Code checks (percent of answers passing)`,
        ...checkNames.map((k) => `- ${k}: ${checkRates[k]}%`),
        `- coach refusals passed: ${summary.refusalPassed}`,
        ``,
        `## LLM judge (1-5, ${judged.length} answers judged)`,
        `- helpfulness ${summary.avgHelpfulness}, tone ${summary.avgTone}, faithfulness ${summary.avgFaithfulness}`,
        ``,
        `## Speed`,
        `- avg first word ${summary.avgFirstTokenMs} ms, avg total ${summary.avgTotalMs} ms`,
        `- provider used: ${JSON.stringify(summary.providers)}`,
        ``,
        `## Lowest faithfulness answers`,
        ...judged
            .sort((a, b) => (a.judge.faithfulness ?? 9) - (b.judge.faithfulness ?? 9))
            .slice(0, 3)
            .map((r) => `- "${r.q}" -> faithfulness ${r.judge.faithfulness}: ${r.judge.reason}`),
    ].join('\n');
    fs.writeFileSync('eval/REPORT.md', md);
    console.log('\n' + md);
    await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });