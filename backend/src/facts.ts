import { query } from './db.js';

export type Fact = { id: string; text: string; planet?: string };

let interp: Record<string, string> = {};
export async function loadInterpretations() {
    const r = await query('SELECT id, text FROM interpretations');
    interp = Object.fromEntries(r.rows.map((x) => [x.id, x.text]));
}

export function buildFacts(chart: any): Fact[] {
    const facts: Fact[] = [{ id: 'F1', text: `The ascendant (lagna) is ${chart.ascendant}.` }];
    chart.planets.forEach((p: any, i: number) => {
        const meaning = interp[`${p.name.toUpperCase()}_H${p.house}`] ?? '';
        facts.push({
            id: `F${i + 2}`,
            planet: p.name,
            text: `${p.name} is in ${p.sign}, house ${p.house}. ${meaning}`.trim(),
        });
    });
    return facts;
}

export function buildPrompt(facts: Fact[], question: string) {
    const system =
        `You are Melooha's friendly astrologer. Use ONLY the numbered facts provided. ` +
        `After every sentence that mentions a planet, sign, house or the ascendant, add its fact tag like [F3]. ` +
        `Never mention any planet or placement that is not in the facts. ` +
        `If the facts cannot answer the question, say so honestly and suggest a better question. ` +
        `No predictions about death, illness, lottery or exact dates. Under 150 words, warm tone.`;
    const user =
        `FACTS:\n${facts.map((f) => `[${f.id}] ${f.text}`).join('\n')}\n\nQUESTION: ${question}`;
    return { system, user };
}