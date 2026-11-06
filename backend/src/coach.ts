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
    `focused on a choice, strength, pattern, or useful context]}. ` +
    `Broad questions such as "Will I get a job?", "How is my career?", or "Tell me about love" are vague: ` +
    `always give useful rewrites for them. Return an empty rewrites list only when the question already names ` +
    `a concrete situation and a timeframe or decision. Avoid guarantees and exact predictions.`;

const FALLBACK_REWRITES: Record<string, string[]> = {
    career: [
        'Which strengths can I highlight in my job search?',
        'What kind of role could fit my strengths and work style?',
        'What practical step could I focus on in my job search?',
    ],
    love: [
        'How can I communicate my needs more clearly in a relationship?',
        'What qualities do I value in a supportive relationship?',
        'What relationship pattern could I reflect on with care?',
    ],
    money: [
        'Which financial habits could help me feel more grounded?',
        'What should I consider before making a spending decision?',
        'How can I approach financial planning with more clarity?',
    ],
    education: [
        'What study approach could help me stay focused?',
        'What learning environment may suit my strengths?',
        'How can I approach an education decision thoughtfully?',
    ],
    family: [
        'How can I communicate more clearly with my family?',
        'What boundaries could support healthier family relationships?',
        'How can I approach a family decision with care?',
    ],
    travel: [
        'What should I consider when planning a meaningful trip?',
        'What kind of travel experience may suit me?',
        'How can I approach a travel decision thoughtfully?',
    ],
    general: [
        'What personal strengths can I rely on in this situation?',
        'What pattern might be useful for me to reflect on?',
        'Which choice could I approach with more clarity?',
    ],
};

function inferCategory(question: string) {
    if (/\b(job|career|work|profession|employ|boss|promotion|workplace)\b/i.test(question)) return 'career';
    if (/\b(love|relationship|partner|dating|romance|marriage)\b/i.test(question)) return 'love';
    if (/\b(money|finance|spend|saving|budget|income|debt)\b/i.test(question)) return 'money';
    if (/\b(study|education|school|college|exam|learn|course)\b/i.test(question)) return 'education';
    if (/\b(family|parent|sibling|home|relative)\b/i.test(question)) return 'family';
    if (/\b(travel|trip|journey|move abroad|relocate)\b/i.test(question)) return 'travel';
    return 'general';
}

function isSpecificEnough(question: string) {
    const hasTimeframe = /\b(today|tomorrow|this week|this month|this year|next week|next month|next year|within \d+|in \d+ (days?|weeks?|months?|years?))\b/i.test(question);
    const hasSituation = /\b(interview|job offer|application|exam|course|project|conversation|decision|choice|between|specific role|my partner|my manager)\b/i.test(question);
    return hasTimeframe || (question.trim().split(/\s+/).length >= 8 && hasSituation);
}

export async function coach(question: string, chart: any) {
    for (const b of BLOCKED) {
        if (b.re.test(question))
            return { verdict: 'refuse' as const, message: b.message, category: 'general', rewrites: [], lookingAt: [] };
    }

    let category = inferCategory(question);
    let rewrites: string[] = [];
    try {
        const j = JSON.parse(await completeSmall(SYSTEM, question));
        if (CATEGORIES.includes(j.category)) category = j.category;
        if (Array.isArray(j.rewrites)) {
            const candidates: unknown[] = j.rewrites;
            const cleaned: string[] = candidates
                .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
                .map((x) => x.trim().slice(0, 140));
            rewrites = Array.from(new Set<string>(cleaned)).slice(0, 3);
        }
    } catch (e) {
        console.error('coach failed:', (e as Error).message);
    }

    if (rewrites.length === 0 && !isSpecificEnough(question)) {
        rewrites = FALLBACK_REWRITES[category] ?? FALLBACK_REWRITES.general!;
    }

    const lookingAt = (HOUSES[category] ?? [1]).map((house) => ({
        house,
        planets: chart ? chart.planets.filter((p: any) => p.house === house).map((p: any) => p.name) : [],
    }));
    return { verdict: 'ok' as const, category, rewrites, lookingAt };
}
