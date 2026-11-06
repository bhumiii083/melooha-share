"use client";

import { usePrefs } from "@/components/providers";
import { buttonLabel, empty, uiCopy } from "@/lib/copy";
import type { Chart } from "@/lib/types";
import { Button } from "@/components/ui";

export function ChartPanel({ chart, onAsk }: { chart: Chart; onAsk: () => void }) {
  const { vibe } = usePrefs();
  return (
    <section className="flex flex-col gap-5" aria-labelledby="chart-heading">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold/80">Ascendant</p>
        <h1 id="chart-heading" className="mt-1 font-serif text-4xl text-gold">
          {chart.ascendant}
        </h1>
      </div>
      {chart.planets.length === 0 ? (
        <p className="text-sm text-white/80">{uiCopy(vibe, empty.planets.classic, empty.planets.chill)}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/15 bg-black/15">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Planets by sign and house</caption>
            <thead className="text-xs uppercase tracking-[0.14em] text-gold/80">
              <tr>
                <th className="px-4 py-3 font-medium">Planet</th>
                <th className="px-4 py-3 font-medium">Sign</th>
                <th className="px-4 py-3 text-right font-medium">House</th>
              </tr>
            </thead>
            <tbody>
              {chart.planets.map((planet) => (
                <tr key={planet.name} className="border-t border-white/10">
                  <th className="px-4 py-3 font-serif text-base font-medium" scope="row">
                    {planet.name}
                  </th>
                  <td className="px-4 py-3">{planet.sign}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{planet.house}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button onClick={onAsk}>{buttonLabel(vibe, "askQuestion")}</Button>
    </section>
  );
}
