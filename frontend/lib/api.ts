import type { Chart, CoachResult, Fact, Metrics } from "@/lib/types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
}

export function cardPngUrl(id: string, format: "card" | "og" | "story" = "card") {
  const suffix = format === "card" ? "" : `?format=${format}`;
  return `${apiBase()}/api/share/${encodeURIComponent(id)}/card.png${suffix}`;
}

export function sharePagePath(id: string) {
  return `/s/${encodeURIComponent(id)}`;
}

async function parseJson(res: Response) {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new ApiError(500, "This app is missing its API address.");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, init);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "offline");
  }
  const data = await parseJson(res);
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : "Request failed";
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export function guest() {
  return request<{ userId: string; balance: number }>("/api/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export function me(userId: string) {
  return request<{ balance: number }>(`/api/me/${encodeURIComponent(userId)}`);
}

export function topup(userId: string) {
  return request<{ balance: number }>("/api/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

export function createChart(body: { userId: string; date: string; time: string; city: string; ref?: string }) {
  return request<{ chart: Chart }>("/api/chart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function coach(userId: string, question: string) {
  return request<CoachResult>("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, question }),
  });
}

export function createShare(userId: string, answerId: number) {
  return request<{ shareId: string }>("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, answerId }),
  });
}

export function metrics() {
  return request<Metrics>("/api/metrics", { cache: "no-store" });
}

/** Client events. coach_shown is recorded by the API and must not be sent from here. */
export async function track(
  type: "coach_accepted" | "share_opened",
  userId: string | null,
  shareId?: string,
) {
  const base = apiBase();
  if (!base) return;
  try {
    await fetch(`${base}/api/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, userId, shareId }),
    });
  } catch {
    /* best-effort */
  }
}

export function isFact(value: unknown): value is Fact {
  if (!value || typeof value !== "object") return false;
  const fact = value as Fact;
  return typeof fact.id === "string" && typeof fact.text === "string";
}

export function calmError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 0) return "The connection dropped. Please try again.";
  if (error instanceof ApiError && error.message && error.message !== "offline" && error.message !== "no_balance") {
    return error.message;
  }
  return fallback;
}
