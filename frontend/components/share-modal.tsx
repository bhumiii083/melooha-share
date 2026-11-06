"use client";

import { latestSparkle, Sparkles } from "@/components/share-fx";
import { usePrefs } from "@/components/providers";
import { buttonLabel, toasts, uiCopy } from "@/lib/copy";
import { cardPngUrl } from "@/lib/api";
import { Button, useDialog } from "@/components/ui";
import { useEffect, useRef, useState } from "react";

export function ShareModal({
  shareId,
  onClose,
}: {
  shareId: string | null;
  onClose: () => void;
}) {
  const { vibe, toast } = usePrefs();
  const open = Boolean(shareId);
  const ref = useDialog(open);
  const handed = useRef<string | null>(null);
  const token = latestSparkle();
  const [burst, setBurst] = useState(0);
  if (open && token > 0 && burst !== token) setBurst(token);
  const [image, setImage] = useState({ shareId, ready: false, failed: false });
  if (image.shareId !== shareId) setImage({ shareId, ready: false, failed: false });
  const imageReady = image.shareId === shareId && image.ready;
  const imageFailed = image.shareId === shareId && image.failed;
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const url = shareId && typeof window !== "undefined"
    ? `${publicOrigin || window.location.origin}/s/${encodeURIComponent(shareId)}`
    : "";

  useEffect(() => {
    if (!open) handed.current = null;
  }, [open]);

  useEffect(() => {
    if (!open || !shareId || !url) return;
    if (handed.current === shareId) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      handed.current = shareId;
      void handoff(url, vibe, toast);
    }, reduce ? 0 : 1200);
    return () => window.clearTimeout(timer);
  }, [open, shareId, url, vibe, toast]);

  return (
    <dialog
      ref={ref}
      className="card-modal"
      aria-label="Share card"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative rounded-[1.75rem] bg-[#3d0a2c] p-4 shadow-2xl ring-1 ring-gold/40">
        {open && burst > 0 ? <Sparkles key={burst} /> : null}
        <div className="flip-stage">
          <div
            key={shareId ?? "card"}
            className="flip-card relative overflow-hidden rounded-[2rem] bg-[#4a0b34] ring-1 ring-gold/50"
          >
            {!imageReady && !imageFailed ? <div className="absolute inset-0 animate-pulse bg-white/10" /> : null}
            {shareId ? (
              // The card is a generated PNG from the API.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cardPngUrl(shareId, "card")}
                alt="Your reading card"
                width={700}
                height={980}
                className="h-full w-full object-contain"
                onLoad={() => setImage((current) => ({ ...current, ready: true }))}
                onError={() => setImage((current) => ({ ...current, failed: true }))}
              />
            ) : null}
          </div>
        </div>
        {imageFailed ? (
          <p role="alert" className="mt-3 text-sm text-white">
            We couldn&apos;t load the card image. The link below still works.
          </p>
        ) : null}
        <p className="mt-4 break-all text-center text-xs text-white/70">{url}</p>
        <div className="mt-4 grid gap-2">
          <Button onClick={() => void shareNow(url)}>{buttonLabel(vibe, "share")}</Button>
          <Button variant="ghost" onClick={() => void copyLink(url, vibe, toast)}>
            {buttonLabel(vibe, "copyLink")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {buttonLabel(vibe, "close")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

async function handoff(url: string, vibe: Parameters<typeof uiCopy>[0], toast: (text: string) => void) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Melooha", text: "A reading from Melooha", url });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
    return;
  }
  await copyLink(url, vibe, toast);
}

async function shareNow(url: string) {
  if (typeof navigator.share !== "function") return;
  try {
    await navigator.share({ title: "Melooha", text: "A reading from Melooha", url });
  } catch {
    /* dismissed or unavailable */
  }
}

async function copyLink(url: string, vibe: Parameters<typeof uiCopy>[0], toast: (text: string) => void) {
  try {
    await navigator.clipboard.writeText(url);
    toast(uiCopy(vibe, toasts.copied.classic, toasts.copied.chill));
  } catch {
    toast("Copy the link from the card.");
  }
}
