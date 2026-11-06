# Melooha Share

Melooha Share is a mobile-first astrology Q&A app. It creates a Vedic astrology chart, streams grounded answers to questions, and lets users share reading cards.

Live app: <https://melooha-share.vercel.app>

Backend API: <https://melooha-api.onrender.com>

## Run locally

The backend and frontend run as separate processes, so use two terminal tabs.

### Backend

1. Create `backend/.env` by copying `backend/.env.example`, then fill in your Neon `DATABASE_URL` and Gemini/Groq API keys.
2. In a terminal, run:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

The API listens on `http://localhost:4000` by default. Create the database tables by running `backend/schema.sql` in the Neon SQL Editor first.

### Frontend

1. Create `frontend/.env.local` with:

   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

2. In another terminal, run:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Open <http://localhost:3000>.

## Environment variables

Backend variables are documented in [`backend/.env.example`](backend/.env.example). Keep real keys in local `.env` files or the hosting providers' environment settings; never commit them.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Backend | Neon Postgres connection string |
| `GEMINI_API_KEY` | Backend | Gemini API credential |
| `GROQ_API_KEY` | Backend | Groq API credential |
| `GEMINI_MODEL` | Backend | Gemini model name (defaults to `gemini-2.0-flash`) |
| `GROQ_MODEL` | Backend | Groq answer model (defaults to `llama-3.3-70b-versatile`) |
| `GROQ_SMALL_MODEL` | Backend | Groq coach model (defaults to `openai/gpt-oss-20b`) |
| `PORT` | Backend | API port (defaults to `4000`) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |

## Tests

Run backend tests from the `backend` directory:

```bash
npm test
```

## Reuse note

Reused patterns from my AutoOps project (Express/Postgres setup). New here: chart engine, grounding validator, coach, share cards, metrics.
