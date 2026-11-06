"use client";

import { usePrefs } from "@/components/providers";
import { calmError, metrics } from "@/lib/api";
import { buttonLabel, NO_DATA } from "@/lib/copy";
import { formatPct } from "@/lib/format";
import type { Metrics } from "@/lib/types";
import { Block, Button } from "@/components/ui";
import { useCallback, useEffect, useRef, useState } from "react";

export function MetricsBoard() {
  const { vibe, online } = usePrefs();
  const [data, setData] = useState<Metrics | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const hasData = useRef(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!online) {
      if (!alive.current) return;
      setMessage("No numbers yet. They will load when you are online.");
      if (!hasData.current) setStatus("error");
      return;
    }
    try {
      const next = await metrics();
      if (!alive.current) return;
      hasData.current = true;
      setData(next);
      setStatus("ready");
      setMessage(null);
      setStale(false);
    } catch (error) {
      if (!alive.current) return;
      setMessage(calmError(error, "The metrics didn't load. We'll try again in a moment."));
      if (!hasData.current) setStatus("error");
      else setStale(true);
    }
  }, [online]);

  useEffect(() => {
    alive.current = true;
    const kick = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      alive.current = false;
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="metrics-heading">
      <div>
        <h1 id="metrics-heading" className="font-serif text-4xl">
          How the readings are landing
        </h1>
        <p className="mt-2 text-sm text-white/70">Updates every 5 seconds.</p>
      </div>
      {status === "loading" ? (
        <div className="grid gap-3" aria-busy="true">
          <span className="sr-only">Loading metrics</span>
          <Block className="h-28" />
          <Block className="h-28" />
          <Block className="h-28" />
          <Block className="h-28" />
        </div>
      ) : null}
      {status === "error" && !data ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-sm leading-6">
            {message}
          </p>
          <Button onClick={() => void load()} disabled={!online}>
            {buttonLabel(vibe, "tryAgain")}
          </Button>
        </div>
      ) : null}
      {data ? (
        <div className="grid gap-3">
          <Metric
            label="Share to activation"
            percent={data.share_to_activation_pct}
            detail={`${data.activated} of ${data.shares}`}
          />
          <Metric
            label="Coach acceptance"
            percent={data.coach_acceptance_pct}
            detail={`${data.coach_accepted} of ${data.coach_shown}`}
          />
          <Metric label="Grounded readings" percent={data.grounded_pct} detail={`${data.grounded} of ${data.answers}`} />
          <article className="rounded-3xl border border-white/15 bg-black/15 p-4">
            <h2 className="text-xs uppercase tracking-[0.16em] text-gold/80">Time to first word</h2>
            <p className={`mt-2 font-serif ${data.answers === 0 ? "text-2xl" : "text-4xl"}`}>
              {data.answers === 0 ? NO_DATA : `${data.avg_first_word_ms.toLocaleString()} ms`}
            </p>
            <p className="mt-1 text-sm text-white/70">{data.answers} readings</p>
          </article>
          {stale && message ? (
            <p role="status" className="text-sm text-white/75">
              Showing the last numbers. {message}
            </p>
          ) : null}
          <p className="text-xs text-white/50">Checked {new Date(data.updated_at).toLocaleTimeString()}</p>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, percent, detail }: { label: string; percent: number | null; detail: string }) {
  const empty = percent === null;
  return (
    <article className="rounded-3xl border border-white/15 bg-black/15 p-4">
      <h2 className="text-xs uppercase tracking-[0.16em] text-gold/80">{label}</h2>
      <p className={`mt-2 font-serif ${empty ? "text-2xl" : "text-4xl"}`}>{empty ? NO_DATA : formatPct(percent)}</p>
      <p className="mt-1 text-sm text-white/70">{detail}</p>
    </article>
  );
}
