async function* sseData(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const d = line.slice(5).trim();
                if (d && d !== '[DONE]') yield d;
            }
        }
    }
}

async function* gemini(system: string, user: string) {
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: user }] }],
            }),
            signal: AbortSignal.timeout(20000),
        }
    );
    if (!res.ok || !res.body) throw new Error(`Gemini ${res.status}`);
    for await (const d of sseData(res.body)) {
        const t = JSON.parse(d)?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) yield t as string;
    }
}

async function* groq(system: string, user: string) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
            stream: true,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok || !res.body) throw new Error(`Groq ${res.status}`);
    for await (const d of sseData(res.body)) {
        const t = JSON.parse(d)?.choices?.[0]?.delta?.content;
        if (t) yield t as string;
    }
}

export type LlmEvent =
    | { type: 'chunk'; provider: string; text: string }
    | { type: 'reset' };

export async function* streamAnswer(system: string, user: string): AsyncGenerator<LlmEvent> {
    const providers: [string, typeof gemini][] = [['gemini', gemini], ['groq', groq]];
    let startedAny = false;
    for (const [name, fn] of providers) {
        try {
            if (startedAny) yield { type: 'reset' };
            for await (const text of fn(system, user)) {
                startedAny = true;
                yield { type: 'chunk', provider: name, text };
            }
            return;
        } catch (e) {
            console.error(`${name} failed:`, (e as Error).message);
        }
    }
    throw new Error('All providers failed');
}
export async function completeSmall(system: string, user: string): Promise<string> {
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({
                model: process.env.GROQ_SMALL_MODEL ?? 'llama-3.1-8b-instant',
                response_format: { type: 'json_object' },
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            }),
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`Groq ${res.status}`);
        return (await res.json()).choices[0].message.content;
    } catch {
        const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system }] },
                    contents: [{ role: 'user', parts: [{ text: user }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                }),
                signal: AbortSignal.timeout(8000),
            }
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        return (await res.json()).candidates[0].content.parts[0].text;
    }
}