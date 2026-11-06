CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance INT NOT NULL DEFAULT 1 CHECK (balance >= 0),
  referred_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE charts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  place TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  chart_json JSONB NOT NULL
);

CREATE TABLE interpretations (
  id TEXT PRIMARY KEY,
  planet TEXT NOT NULL,
  house INT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  raw_text TEXT NOT NULL,
  final_text TEXT NOT NULL,
  coach_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE answers (
  id SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id),
  text TEXT NOT NULL,
  fact_ids TEXT[] NOT NULL DEFAULT '{}',
  provider TEXT,
  first_token_ms INT,
  total_ms INT,
  validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  delta INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shares (
  public_id TEXT PRIMARY KEY,
  answer_id INT NOT NULL REFERENCES answers(id),
  headline TEXT NOT NULL,
  sign_line TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  user_id UUID,
  share_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
