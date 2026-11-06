import type { LookingAt } from "@/lib/types";

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function lookingLine(items: LookingAt[]) {
  if (!items.length) return null;
  return items
    .map((item) => {
      const house = `${ordinal(item.house)} house`;
      const planets = (item.planets ?? []).filter(Boolean);
      return planets.length ? `${house} (${planets.join(", ")})` : house;
    })
    .join(", ");
}

export function formatPct(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function isChart(value: unknown): value is import("@/lib/types").Chart {
  if (!value || typeof value !== "object") return false;
  const chart = value as { ascendant?: unknown; planets?: unknown };
  if (typeof chart.ascendant !== "string" || !Array.isArray(chart.planets)) return false;
  return chart.planets.every((planet) => {
    if (!planet || typeof planet !== "object") return false;
    const row = planet as { name?: unknown; sign?: unknown; house?: unknown };
    return typeof row.name === "string" && typeof row.sign === "string" && typeof row.house === "number";
  });
}
