"use client";

import { keys } from "@/lib/storage";
import type { Vibe } from "@/lib/types";
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

type Prefs = {
  vibe: Vibe;
  setVibe: (vibe: Vibe) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  online: boolean;
  toast: (text: string) => void;
};

const PrefsContext = createContext<Prefs | null>(null);

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function vibeSnapshot(): Vibe {
  return localStorage.getItem(keys.vibe) === "chill" ? "chill" : "classic";
}

function mutedSnapshot() {
  return localStorage.getItem(keys.mute) === "1";
}

function onlineSnapshot() {
  return navigator.onLine;
}

export function usePrefs() {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside Providers");
  return value;
}

export function Providers({ children }: { children: ReactNode }) {
  const vibe = useSyncExternalStore(subscribe, vibeSnapshot, () => "classic" as Vibe);
  const muted = useSyncExternalStore(subscribe, mutedSnapshot, () => false);
  const online = useSyncExternalStore(subscribe, onlineSnapshot, () => true);
  const [message, setMessage] = useState<string | null>(null);

  const value = useMemo<Prefs>(
    () => ({
      vibe,
      setVibe: (next) => {
        localStorage.setItem(keys.vibe, next);
        emit();
      },
      muted,
      setMuted: (next) => {
        localStorage.setItem(keys.mute, next ? "1" : "0");
        emit();
      },
      online,
      toast: (text) => {
        setMessage(text);
        window.setTimeout(() => setMessage((current) => (current === text ? null : current)), 2800);
      },
    }),
    [vibe, muted, online],
  );

  return (
    <PrefsContext.Provider value={value}>
      {children}
      {!online ? (
        <p
          role="status"
          className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-40 mx-auto max-w-md rounded-2xl border border-white/20 bg-[#2a081c]/95 px-4 py-3 text-sm text-white shadow-lg"
        >
          You are offline. Melooha will wait until you reconnect.
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-[#2a081c] px-4 py-3 text-center text-sm text-white shadow-lg ring-1 ring-gold/40"
        >
          {message}
        </p>
      ) : null}
    </PrefsContext.Provider>
  );
}
