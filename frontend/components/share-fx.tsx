"use client";

import { keys } from "@/lib/storage";

/**
 * Flip, sparkle, and chime for the share card.
 * sparkle() and chime() must be called from the Share button click,
 * because browsers only start audio inside a user gesture.
 */

let sparkleToken = 0;

export function sparkle() {
  sparkleToken += 1;
}

export function latestSparkle() {
  return sparkleToken;
}

const SPARKS = [
  { left: "4%", top: "12%", delay: "0s", size: 14 },
  { left: "86%", top: "8%", delay: "0.08s", size: 11 },
  { left: "92%", top: "38%", delay: "0.16s", size: 16 },
  { left: "8%", top: "46%", delay: "0.22s", size: 10 },
  { left: "78%", top: "70%", delay: "0.12s", size: 13 },
  { left: "14%", top: "76%", delay: "0.28s", size: 12 },
  { left: "50%", top: "2%", delay: "0.18s", size: 9 },
  { left: "62%", top: "86%", delay: "0.05s", size: 11 },
  { left: "30%", top: "88%", delay: "0.24s", size: 8 },
  { left: "42%", top: "6%", delay: "0.32s", size: 12 },
];

export function Sparkles() {
  return (
    <div className="pointer-events-none absolute -inset-4" aria-hidden>
      {SPARKS.map((spark) => (
        <svg
          key={`${spark.left}-${spark.top}`}
          viewBox="0 0 20 20"
          className="spark"
          style={{
            left: spark.left,
            top: spark.top,
            width: spark.size,
            height: spark.size,
            animationDelay: spark.delay,
          }}
        >
          <path d="M10 0 L11.7 8.3 L20 10 L11.7 11.7 L10 20 L8.3 11.7 L0 10 L8.3 8.3 Z" fill="#F5C86A" />
        </svg>
      ))}
    </div>
  );
}

export function chime() {
  if (localStorage.getItem(keys.mute) === "1") return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const ctx = new AudioContextCtor();
  const now = ctx.currentTime;
  const notes = [392, 523.25, 659.25, 783.99];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + index * 0.11;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.6);
  });
  window.setTimeout(() => void ctx.close(), 1500);
}
