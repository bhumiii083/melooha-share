"use client";

import { usePrefs } from "@/components/providers";
import { buttonLabel } from "@/lib/copy";
import { Button } from "@/components/ui";

export default function ShareError({ reset }: { error: Error; reset: () => void }) {
  const { vibe } = usePrefs();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-4xl">The card didn&apos;t load</h1>
      <p role="alert" className="text-sm leading-6 text-white/80">
        We couldn&apos;t reach the reading. Please try again.
      </p>
      <Button onClick={reset}>{buttonLabel(vibe, "tryAgain")}</Button>
    </div>
  );
}
