import type { Fact } from './facts.js';
const PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

export function validate(text: string, facts: Fact[]) {
    const byId = new Map(facts.map((f) => [f.id, f]));
    const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
    const kept: string[] = [];
    const used = new Set<string>();
    let problems = 0;

    for (let s of sentences) {
        const tags = [...s.matchAll(/\[(F\d+)\]/g)]
            .map((m) => m[1])
            .filter((tag): tag is string => tag !== undefined);
        const goodTags = tags.filter((t) => byId.has(t));
        for (const t of tags.filter((t) => !byId.has(t))) {
            s = s.split(`[${t}]`).join('');
            problems++;
        }

        const mentioned = PLANETS.filter((p) => new RegExp(`\\b${p}\\b`, 'i').test(s));
        const talksChart = mentioned.length > 0 || /\b(house|ascendant|lagna)\b/i.test(s);
        const taggedPlanets = new Set(goodTags.map((t) => byId.get(t)?.planet?.toLowerCase()));
        const mismatch = mentioned.some((p) => !taggedPlanets.has(p));

        if (talksChart && (goodTags.length === 0 || mismatch)) {
            problems++;
            continue;
        }
        goodTags.forEach((t) => used.add(t));
        kept.push(s);
    }

    return { text: kept.join('').trim(), factIds: [...used], grounded: problems === 0 };
}