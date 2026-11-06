import type { Vibe } from "@/lib/types";

/**
 * Chill phrasing is only for buttons, toasts, and empty states.
 * Readings, errors, refusals, and the public share call to action stay classic.
 */
export function uiCopy(vibe: Vibe, classic: string, chill: string) {
  return vibe === "chill" ? chill : classic;
}

export const buttons = {
  sharpen: { classic: "Sharpen my question", chill: "make this sharper" },
  ask: { classic: "Ask", chill: "ask the chart" },
  share: { classic: "Share", chill: "send this" },
  addQuestions: { classic: "Add questions", chill: "add more questions" },
  seeChart: { classic: "See my chart", chill: "show my chart" },
  askQuestion: { classic: "Ask a question", chill: "ask something" },
  copyLink: { classic: "Copy link", chill: "copy the link" },
  tryAgain: { classic: "Try again", chill: "try again" },
  close: { classic: "Close", chill: "got it" },
  notNow: { classic: "Not now", chill: "maybe later" },
  preparing: { classic: "Preparing your card", chill: "making your card" },
  drawing: { classic: "Drawing your chart", chill: "drawing your chart" },
  sharpening: { classic: "Sharpening", chill: "sharpening" },
  asking: { classic: "Asking", chill: "asking" },
  adding: { classic: "Adding questions", chill: "adding questions" },
} as const;

export type ButtonKey = keyof typeof buttons;

export function buttonLabel(vibe: Vibe, key: ButtonKey) {
  return buttons[key][vibe];
}

export const toasts = {
  copied: { classic: "Link copied.", chill: "link copied. send it whenever." },
  toppedUp: { classic: "Five questions added.", chill: "five more questions, you are set." },
} as const;

export const empty = {
  ask: {
    classic: "Nothing here yet. Ask about a choice, a season, or someone on your mind.",
    chill: "nothing here yet. drop a real situation and we will read it.",
  },
  coach: {
    classic: "No sharper versions. This question is already specific.",
    chill: "nothing to sharpen. this question is already specific.",
  },
  planets: {
    classic: "This chart came back without planets.",
    chill: "the chart came back empty.",
  },
} as const;

export const NO_DATA = "no data yet";

export const SHARE_CTA = "Get your own free reading";
