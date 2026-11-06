"use client";

import { AskPanel } from "@/components/ask-panel";
import { ChartPanel } from "@/components/chart-panel";
import { OnboardingForm } from "@/components/onboarding-form";
import { usePrefs } from "@/components/providers";
import { calmError } from "@/lib/api";
import { buttonLabel } from "@/lib/copy";
import { keys } from "@/lib/storage";
import { ensureUser } from "@/lib/session";
import type { Chart } from "@/lib/types";
import { Block, Button } from "@/components/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

type Screen = "onboarding" | "chart" | "ask";

export function HomeApp() {
  const { vibe } = usePrefs();
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [bootError, setBootError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [screen, setScreen] = useState<Screen>("onboarding");

  async function boot() {
    setPhase("loading");
    setBootError(null);
    try {
      const session = await ensureUser();
      setUserId(session.userId);
      setBalance(session.balance);
      setChart(session.chart);
      setScreen(session.chart ? "ask" : "onboarding");
      setPhase("ready");
    } catch (error) {
      setBootError(calmError(error, "We couldn't start a session. Please try again."));
      setPhase("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await ensureUser();
        if (cancelled) return;
        setUserId(session.userId);
        setBalance(session.balance);
        setChart(session.chart);
        setScreen(session.chart ? "ask" : "onboarding");
        setPhase("ready");
      } catch (error) {
        if (cancelled) return;
        setBootError(calmError(error, "We couldn't start a session. Please try again."));
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return (
      <div className="grid gap-3" aria-busy="true">
        <span className="sr-only">Loading your session</span>
        <Block className="h-10 w-2/3" />
        <Block className="h-24" />
        <Block className="h-12" />
        <Block className="h-12" />
      </div>
    );
  }

  if (phase === "error" || !userId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-4xl">Melooha is quiet for a moment</h1>
        <p role="alert" className="text-sm leading-6 text-white/80">
          {bootError}
        </p>
        <Button onClick={() => void boot()}>{buttonLabel(vibe, "tryAgain")}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {chart ? (
        <div role="tablist" aria-label="Sections" className="mb-5 grid grid-cols-2 rounded-full bg-black/20 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={screen === "chart"}
            onClick={() => setScreen("chart")}
            className={`min-h-10 rounded-full text-sm ${screen === "chart" ? "bg-gold text-[#3d0a2c]" : "text-white/75"}`}
          >
            Chart
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === "ask"}
            onClick={() => setScreen("ask")}
            className={`min-h-10 rounded-full text-sm ${screen === "ask" ? "bg-gold text-[#3d0a2c]" : "text-white/75"}`}
          >
            Ask
          </button>
        </div>
      ) : null}
      <div className="flex-1">
        {screen === "onboarding" || !chart ? (
          <OnboardingForm
            userId={userId}
            onChart={(next) => {
              setChart(next);
              setScreen("chart");
            }}
          />
        ) : null}
        {screen === "chart" && chart ? <ChartPanel chart={chart} onAsk={() => setScreen("ask")} /> : null}
        {screen === "ask" && chart ? (
          <AskPanel
            userId={userId}
            balance={balance}
            setBalance={setBalance}
            onMissingChart={() => {
              localStorage.removeItem(keys.chart);
              setChart(null);
              setScreen("onboarding");
            }}
          />
        ) : null}
      </div>
      <Link href="/metrics" className="mt-10 text-center text-xs text-white/55 underline-offset-4 hover:underline">
        Metrics
      </Link>
    </div>
  );
}
