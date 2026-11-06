"use client";

import { usePrefs } from "@/components/providers";
import { ApiError, calmError, createChart } from "@/lib/api";
import { buttonLabel } from "@/lib/copy";
import { keys } from "@/lib/storage";
import type { Chart } from "@/lib/types";
import { Block, Button, fieldClass } from "@/components/ui";
import { useState, type FormEvent } from "react";

const CITIES = ["Nagpur", "Mumbai", "Pune", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata"];

export function OnboardingForm({ userId, onChart }: { userId: string; onChart: (chart: Chart) => void }) {
  const { vibe, online } = usePrefs();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!online) return;
    if (!date || !time) {
      setError("Check your date and time");
      return;
    }
    if (!CITIES.includes(city)) {
      setError("Pick a city from the list");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ref = localStorage.getItem(keys.ref) ?? undefined;
      const result = await createChart({
        userId,
        date,
        time: time.slice(0, 5),
        city,
        ...(ref ? { ref } : {}),
      });
      localStorage.removeItem(keys.ref);
      localStorage.setItem(keys.chart, JSON.stringify(result.chart));
      onChart(result.chart);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 0) {
        setError("The connection dropped. Please try again.");
      } else {
        setError(calmError(caught, "Check your date and time"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <Crescent />
        <h1 className="mt-3 font-serif text-4xl leading-tight">Your birth details</h1>
        <p className="mt-2 text-sm leading-6 text-white/75">
          Melooha reads a sidereal chart from the date, time, and city you were born.
        </p>
      </div>
      <label className="block text-sm text-white/80">
        Birth date
        <input
          className={`${fieldClass} mt-1`}
          type="date"
          name="date"
          required
          max="2100-12-31"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <label className="block text-sm text-white/80">
        Birth time
        <input
          className={`${fieldClass} mt-1`}
          type="time"
          name="time"
          required
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      <label className="block text-sm text-white/80">
        City
        <select
          className={`${fieldClass} mt-1`}
          name="city"
          required
          value={city}
          onChange={(event) => setCity(event.target.value)}
        >
          <option value="">Choose a city</option>
          {CITIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-white">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving || !online}>
        {saving ? buttonLabel(vibe, "drawing") : buttonLabel(vibe, "seeChart")}
      </Button>
      {saving ? (
        <div className="grid gap-2" aria-hidden>
          <Block className="h-10" />
          <Block className="h-10" />
          <Block className="h-10" />
        </div>
      ) : null}
    </form>
  );
}

function Crescent() {
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10 text-gold" aria-hidden>
      <path fill="currentColor" d="M42 8a24 24 0 1 0 0 48 20 20 0 1 1 0-48z" />
    </svg>
  );
}
