"use client";

import { usePrefs } from "@/components/providers";
import Link from "next/link";

export function Header() {
  const { vibe, setVibe, muted, setMuted } = usePrefs();
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="font-serif text-sm tracking-[0.28em] text-gold">
        MELOOHA
      </Link>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-gold/80">Vibe</span>
          <div role="group" aria-label="Vibe" className="flex rounded-full bg-black/25 p-0.5 text-xs">
            <button
              type="button"
              aria-pressed={vibe === "chill"}
              onClick={() => setVibe("chill")}
              className={`min-h-8 rounded-full px-2.5 ${vibe === "chill" ? "bg-gold text-[#3d0a2c]" : "text-white/75"}`}
            >
              Chill
            </button>
            <button
              type="button"
              aria-pressed={vibe === "classic"}
              onClick={() => setVibe("classic")}
              className={`min-h-8 rounded-full px-2.5 ${vibe === "classic" ? "bg-gold text-[#3d0a2c]" : "text-white/75"}`}
            >
              Classic
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-pressed={muted}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          onClick={() => setMuted(!muted)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10"
        >
          {muted ? <SpeakerOff /> : <Speaker />}
        </button>
      </div>
    </header>
  );
}

function Speaker() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 10h3l4-3v10l-4-3H4z" strokeLinejoin="round" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5" strokeLinecap="round" />
      <path d="M18.5 7a6.5 6.5 0 0 1 0 10" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerOff() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 10h3l4-3v10l-4-3H4z" strokeLinejoin="round" />
      <path d="M16 10l5 5M21 10l-5 5" strokeLinecap="round" />
    </svg>
  );
}
