type AskEvent = {
  text?: string;
  code?: string;
  message?: string;
  balance?: number;
  answerId?: number;
  facts?: unknown;
};

/**
 * EventSource only supports GET. /api/ask is a POST, so the stream is read by hand.
 * Each server message ends with a blank line.
 */
export async function ask(
  body: { userId: string; question: string; coachUsed: boolean },
  on: {
    token: (t: string) => void;
    reset: () => void;
    final: (d: AskEvent) => void;
    error: (d: AskEvent) => void;
  },
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 402) return on.error({ code: "no_balance" });
  if (!res.ok || !res.body) return on.error({ message: "Something went wrong. Try again." });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const event = /^event: (.+)$/m.exec(part)?.[1];
      const data = /^data: (.+)$/m.exec(part)?.[1];
      if (!event || !data) continue;
      const d = JSON.parse(data) as AskEvent;
      if (event === "token") on.token(d.text ?? "");
      else if (event === "reset") on.reset();
      else if (event === "final") on.final(d);
      else if (event === "error") on.error(d);
    }
  }
}
