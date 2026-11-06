"use client";

import { usePrefs } from "@/components/providers";
import { chime, sparkle } from "@/components/share-fx";
import { ShareModal } from "@/components/share-modal";
import { ask as readAnswer } from "@/lib/ask";
import { calmError, coach, createShare, isFact, me, topup, track } from "@/lib/api";
import { buttonLabel, empty, toasts, uiCopy } from "@/lib/copy";
import { lookingLine } from "@/lib/format";
import type { Fact, LookingAt } from "@/lib/types";
import { Block, Button, fieldClass, Sheet } from "@/components/ui";
import { useRef, useState, type ReactNode } from "react";

export function AskPanel({
  userId,
  balance,
  setBalance,
  onMissingChart,
}: {
  userId: string;
  balance: number | null;
  setBalance: (balance: number) => void;
  onMissingChart: () => void;
}) {
  const { vibe, online, toast } = usePrefs();
  const [question, setQuestion] = useState("");
  const [rewrites, setRewrites] = useState<string[]>([]);
  const [lookingAt, setLookingAt] = useState<LookingAt[]>([]);
  const [coachState, setCoachState] = useState<"idle" | "loading" | "ready" | "refuse">("idle");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [answerId, setAnswerId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [factId, setFactId] = useState<string | null>(null);
  const [noBalance, setNoBalance] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topping, setTopping] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const accepted = useRef<string | null>(null);
  const sentChips = useRef(new Set<string>());

  const houses = lookingLine(lookingAt);
  const fact = facts.find((item) => item.id === factId);

  async function sharpen() {
    const text = question.trim();
    if (!text) {
      setCoachError("Type a question first");
      return;
    }
    if (!online) return;
    setCoachState("loading");
    setCoachError(null);
    setRefusal(null);
    setRewrites([]);
    sentChips.current = new Set();
    try {
      const result = await coach(userId, text);
      const nextRewrites = Array.isArray(result.rewrites) ? result.rewrites.filter((item) => typeof item === "string") : [];
      const nextLooking = Array.isArray(result.lookingAt) ? result.lookingAt : [];
      setLookingAt(nextLooking);
      if (result.verdict === "refuse") {
        setCoachState("refuse");
        setRefusal(result.message || "We can't look at that question.");
        setRewrites([]);
        return;
      }
      setCoachState("ready");
      setRewrites(nextRewrites);
    } catch (error) {
      setCoachState("idle");
      setCoachError(calmError(error, "We couldn't sharpen that question. Please try again."));
    }
  }

  function acceptChip(text: string) {
    setQuestion(text);
    accepted.current = text;
    if (sentChips.current.has(text)) return;
    sentChips.current.add(text);
    void track("coach_accepted", userId);
  }

  async function ask() {
    const text = question.trim();
    if (!text || streaming) return;
    if (!online) return;
    if (balance === 0) {
      setNoBalance(true);
      return;
    }
    setStreaming(true);
    setStreamError(null);
    setShareError(null);
    setAnswer("");
    setFacts([]);
    setAnswerId(null);
    try {
      await readAnswer(
        { userId, question: text, coachUsed: accepted.current === text },
        {
          token: (chunk) => setAnswer((prev) => prev + chunk),
          reset: () => setAnswer(""),
          final: (data) => {
            setAnswer(String(data.text ?? ""));
            const id = Number(data.answerId);
            setAnswerId(Number.isFinite(id) ? id : null);
            setFacts(Array.isArray(data.facts) ? data.facts.filter(isFact) : []);
            if (typeof data.balance === "number") setBalance(data.balance);
          },
          error: (data) => {
            if (data.code === "no_balance") {
              setNoBalance(true);
              return;
            }
            const message = data.message || "The reading stopped.";
            if (/birth details/i.test(message)) {
              onMissingChart();
              return;
            }
            setStreamError(message);
            if (typeof data.balance === "number") setBalance(data.balance);
          },
        },
      );
    } catch {
      setStreamError("The connection dropped before the reading finished.");
    } finally {
      setStreaming(false);
      try {
        const profile = await me(userId);
        setBalance(profile.balance);
      } catch {
        /* keep the last known balance */
      }
    }
  }

  async function addQuestions() {
    if (!online) return;
    setTopping(true);
    setTopupError(null);
    try {
      const result = await topup(userId);
      setBalance(result.balance);
      setNoBalance(false);
      toast(uiCopy(vibe, toasts.toppedUp.classic, toasts.toppedUp.chill));
    } catch (error) {
      setTopupError(calmError(error, "We couldn't add questions. Please try again."));
    } finally {
      setTopping(false);
    }
  }

  function onShare() {
    if (!answerId || !online || sharing) return;
    sparkle();
    chime();
    void share();
  }

  async function share() {
    if (!answerId || !online) return;
    setSharing(true);
    setShareError(null);
    try {
      const result = await createShare(userId, answerId);
      setShareId(result.shareId);
    } catch (error) {
      setShareError(calmError(error, "We couldn't make a share card. Please try again."));
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="ask-heading">
      <h1 id="ask-heading" className="font-serif text-4xl">
        Ask Melooha
      </h1>
      <label className="block text-sm text-white/80">
        Your question
        <textarea
          className={`${fieldClass} mt-1 min-h-32 py-3`}
          maxLength={300}
          value={question}
          placeholder="Ask about timing, a choice, or a pattern"
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      <p className="text-right text-xs text-white/50">{question.trim().length}/300</p>
      <Button onClick={() => void sharpen()} disabled={!online || coachState === "loading" || streaming}>
        {coachState === "loading" ? buttonLabel(vibe, "sharpening") : buttonLabel(vibe, "sharpen")}
      </Button>
      {coachState === "loading" ? (
        <div className="grid gap-2" aria-hidden>
          <Block className="h-9" />
          <Block className="h-9" />
        </div>
      ) : null}
      {coachError ? (
        <p role="alert" className="text-sm">
          {coachError}
        </p>
      ) : null}
      {coachState === "refuse" && refusal ? (
        <div role="status" className="rounded-3xl border border-gold/30 bg-black/20 p-4">
          <h2 className="font-serif text-xl">A different question will serve you better</h2>
          <p className="mt-2 text-sm leading-6 text-white/90">{refusal}</p>
        </div>
      ) : null}
      {coachState === "ready" && rewrites.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Sharper questions">
          {rewrites.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => acceptChip(text)}
              className="rounded-full border border-gold/40 bg-gold/10 px-3 py-2 text-left text-sm text-gold"
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
      {coachState === "ready" && rewrites.length === 0 ? (
        <p className="text-sm text-white/75">{uiCopy(vibe, empty.coach.classic, empty.coach.chill)}</p>
      ) : null}
      <p className="text-sm text-gold">
        Melooha will look at: {houses ?? "—"}
        {coachState === "loading" ? <span className="sr-only"> Loading</span> : null}
      </p>
      <div className="flex items-center justify-between gap-3">
        <BalancePill balance={balance} />
        <div className="w-36">
          <Button onClick={() => void ask()} disabled={!online || streaming || !question.trim()}>
            {streaming ? buttonLabel(vibe, "asking") : buttonLabel(vibe, "ask")}
          </Button>
        </div>
      </div>
      {streamError ? (
        <p role="alert" className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-sm leading-6">
          {streamError}
        </p>
      ) : null}
      {streaming && !answer ? (
        <div className="grid gap-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">The reading is arriving</span>
          <Block className="h-4" />
          <Block className="h-4 w-11/12" />
          <Block className="h-4 w-8/12" />
        </div>
      ) : null}
      {answer ? (
        <div aria-live="polite" className="rounded-3xl border border-white/15 bg-black/20 p-4">
          <AnswerBody text={answer} onFact={setFactId} />
          {streaming ? <span className="mt-2 inline-block h-4 w-2 bg-gold/80 align-middle" aria-hidden /> : null}
        </div>
      ) : null}
      {!answer && !streaming && !streamError ? (
        <p className="text-sm leading-6 text-white/70">{uiCopy(vibe, empty.ask.classic, empty.ask.chill)}</p>
      ) : null}
      {answerId && !streaming ? (
        <Button onClick={onShare} disabled={!online || sharing}>
          {sharing ? buttonLabel(vibe, "preparing") : buttonLabel(vibe, "share")}
        </Button>
      ) : null}
      {shareError ? (
        <p role="alert" className="text-sm">
          {shareError}
        </p>
      ) : null}
      <Sheet open={Boolean(factId)} title={factId ?? "Note"} onClose={() => setFactId(null)}>
        <p className="text-sm leading-6 text-white/90">
          {fact?.text || "This note is not in the finished reading."}
        </p>
        <div className="mt-4">
          <Button variant="ghost" onClick={() => setFactId(null)}>
            {buttonLabel(vibe, "close")}
          </Button>
        </div>
      </Sheet>
      <Sheet open={noBalance} title="You are out of questions" onClose={() => setNoBalance(false)}>
        <p className="text-sm leading-6 text-white/85">
          A reading uses one question. Add more whenever you want to continue.
        </p>
        {topupError ? (
          <p role="alert" className="mt-3 text-sm">
            {topupError}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2">
          <Button onClick={() => void addQuestions()} disabled={!online || topping}>
            {topping ? buttonLabel(vibe, "adding") : buttonLabel(vibe, "addQuestions")}
          </Button>
          <Button variant="ghost" onClick={() => setNoBalance(false)}>
            {buttonLabel(vibe, "notNow")}
          </Button>
        </div>
      </Sheet>
      <ShareModal shareId={shareId} onClose={() => setShareId(null)} />
    </section>
  );
}

function BalancePill({ balance }: { balance: number | null }) {
  if (balance === null) return <span className="h-8 w-28 rounded-full bg-white/10" aria-hidden />;
  const label = balance === 1 ? "1 question" : `${balance} questions`;
  return (
    <span className="inline-flex min-h-8 items-center rounded-full border border-gold/40 bg-black/20 px-3 text-xs font-semibold text-gold">
      {label}
    </span>
  );
}

function AnswerBody({ text, onFact }: { text: string; onFact: (id: string) => void }) {
  const nodes: ReactNode[] = [];
  const pattern = /\[(F\d+)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const id = match[1];
    nodes.push(
      <button
        key={`${id}-${key++}`}
        type="button"
        onClick={() => onFact(id)}
        className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded-full bg-gold/20 px-2 py-0.5 align-baseline text-[11px] font-semibold tracking-wide text-gold"
      >
        {id}
      </button>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">{nodes}</p>;
}
