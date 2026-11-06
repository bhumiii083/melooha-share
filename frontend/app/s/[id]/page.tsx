import { ShareOpened } from "@/components/share-opened";
import { buttonClass } from "@/lib/classes";
import { cardPngUrl } from "@/lib/api";
import { SHARE_CTA } from "@/lib/copy";
import type { ShareRecord } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

async function fetchShare(id: string): Promise<ShareRecord | null> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) throw new Error("missing api");
  const res = await fetch(`${base}/api/share/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("share unavailable");
  return (await res.json()) as ShareRecord;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const image = cardPngUrl(id, "og");
  let title = "A Melooha reading";
  let description = SHARE_CTA;
  try {
    const share = await fetchShare(id);
    if (share?.headline) title = share.headline;
    if (share?.sign_line) description = share.sign_line;
  } catch {
    /* keep the fallback title; the card URL can still be the preview */
  }
  return {
    title: { absolute: `${title} · Melooha` },
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
  };
}

async function Connection() {
  await connection();
  return null;
}

function DynamicMarker() {
  return (
    <Suspense fallback={null}>
      <Connection />
    </Suspense>
  );
}

function ShareSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <span className="sr-only">Loading the card</span>
      <div className="mx-auto aspect-[5/7] w-full max-w-sm animate-pulse rounded-3xl bg-white/10" />
      <div className="h-8 w-3/4 animate-pulse rounded-2xl bg-white/10" />
      <div className="h-11 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

async function ShareBody({ params }: Props) {
  const { id } = await params;
  const share = await fetchShare(id);
  if (!share) notFound();
  return (
    <article className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-[1.6rem] bg-black/20 p-2 ring-1 ring-gold/50">
        {/* Generated share card from the API. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardPngUrl(id, "card")}
          alt=""
          width={700}
          height={980}
          className="mx-auto h-auto w-full max-w-sm rounded-2xl"
        />
      </div>
      <h1 className="font-serif text-3xl leading-tight">{share.headline}</h1>
      {share.sign_line ? <p className="text-gold">{share.sign_line}</p> : null}
      <Link href={`/?ref=${encodeURIComponent(id)}`} className={buttonClass()}>
        {SHARE_CTA}
      </Link>
      <ShareOpened id={id} />
    </article>
  );
}

export default function Page({ params }: Props) {
  return (
    <>
      <Suspense fallback={<ShareSkeleton />}>
        <ShareBody params={params} />
      </Suspense>
      <DynamicMarker />
    </>
  );
}
