import { ApiError, guest, me } from "@/lib/api";
import { isChart } from "@/lib/format";
import { keys } from "@/lib/storage";
import type { Chart } from "@/lib/types";

let guestInflight: Promise<{ userId: string; balance: number }> | null = null;

function createGuestOnce() {
  guestInflight ??= guest()
    .then((created) => {
      localStorage.setItem(keys.userId, created.userId);
      return created;
    })
    .finally(() => {
      guestInflight = null;
    });
  return guestInflight;
}

export function readChart(): Chart | null {
  try {
    const raw = localStorage.getItem(keys.chart);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isChart(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberRefFromUrl() {
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) localStorage.setItem(keys.ref, ref);
  return localStorage.getItem(keys.ref);
}

export async function ensureUser() {
  rememberRefFromUrl();
  let userId = localStorage.getItem(keys.userId);
  let balance: number;

  if (!userId) {
    const created = await createGuestOnce();
    userId = created.userId;
    balance = created.balance;
  } else {
    try {
      const profile = await me(userId);
      balance = profile.balance;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      localStorage.removeItem(keys.userId);
      localStorage.removeItem(keys.chart);
      const created = await createGuestOnce();
      userId = created.userId;
      balance = created.balance;
    }
  }

  return { userId, balance, chart: readChart() };
}
