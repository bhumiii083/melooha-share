export type Vibe = "classic" | "chill";

export type Planet = {
  name: string;
  sign: string;
  house: number;
};

export type Chart = {
  ascendant: string;
  planets: Planet[];
};

export type Fact = {
  id: string;
  text: string;
  planet?: string;
};

export type LookingAt = {
  house: number;
  planets: string[];
};

export type CoachResult = {
  verdict: "ok" | "refuse";
  message?: string;
  category?: string;
  rewrites: string[];
  lookingAt: LookingAt[];
};

export type Metrics = {
  shares: number;
  opens: number;
  activated: number;
  coach_shown: number;
  coach_accepted: number;
  answers: number;
  grounded: number;
  avg_first_word_ms: number;
  share_to_activation_pct: number | null;
  coach_acceptance_pct: number | null;
  grounded_pct: number | null;
  updated_at: string;
};

export type ShareRecord = {
  public_id: string;
  headline: string;
  sign_line: string;
};
