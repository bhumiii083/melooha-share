import { completeSmall } from './llm.js';

const BLOCKED: { re: RegExp; message: string }[] = [
    {
        re: /\b(lottery|jackpot|satta|betting|casino)\b/i,
        message: "The stars don't do lottery numbers. Ask about timing, choices or patterns instead."
    },
    {
        re: /\b(when|which (date|year)|what age)\b.{0,40}\b(die|death|pass away)\b/i,
        message: "I can't predict that, and nobody honestly can. Want to ask about something you can act on?"
    },
    {
        re: /\b(cancer|tumou?r|diagnos\w*|pregnan\w*)\b/i,
        message: "That's one for a doctor, not a chart. Happy to look at other parts of your life."
    },
    {
        re: /\b(suicide|kill myself|end my life|self.?harm)\b/i,
        message: "That sounds really heavy, and you deserve real support more than a chart reading. Please talk to someone you trust, or call Tele-MANAS at 14416 (free, India). I'm here for chart questions whenever you want."
    },
];

const CATEGORIES = ['career', 'love', 'money', 'education', 'family', 'travel', 'general'];
const HOUSES: Record<string, number[]> = {
    career: [10, 6], love: [7, 5], money: [2, 11], education: [4, 5],
    family: [4], travel: [9, 12], general: [1],
};

const SYSTEM =
    `You coach users of an astrology app to ask better questions. Reply with JSON only: ` +
    `{"category": "career|love|money|education|family|travel|general", ` +
    `"rewrites": [up to 3 sharper versions of the user's question, each under 18 words, same intent, ` +
    `specific about a timeframe or decision]}. If the question is already specific, return an empty rewrites list.`;

export async function coach(question: string, chart: any) {
    for (const b of BLOCKED) {
        if (b.re.test(question))
            return { verdict: 'refuse' as const, message: b.message, category: 'general', rewrites: [], lookingAt: [] };
    }

    let category = 'general';
    let rewrites: string[] = [];
    try {
        const j = JSON.parse(await completeSmall(SYSTEM, question));
        if (CATEGORIES.includes(j.category)) category = j.category;
        if (Array.isArray(j.rewrites))
            rewrites = j.rewrites.filter((x: any) => typeof x === 'string').map((x: string) => x.slice(0, 140)).slice(0, 3);
    } catch (e) {
        console.error('coach failed:', (e as Error).message);
    }

    const lookingAt = (HOUSES[category] ?? [1]).map((house) => ({
        house,
        planets: chart ? chart.planets.filter((p: any) => p.house === house).map((p: any) => p.name) : [],
    }));
    return { verdict: 'ok' as const, category, rewrites, lookingAt };
}