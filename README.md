# Crux

Room-based DSA practice for persistent friend groups. See the product
brief for full context — this README covers running what's built so far.

## What's implemented

Build-order step 1 (repo scaffold, Neon + Drizzle schema, Auth.js, deploy
skeleton) plus a full, pixel-matched implementation of the 5 screens from
the `Batchmates.dc.html` design: landing, sign-in, crew setup, crew home,
live room.

- Landing (`/`), sign-in (`/signin`) — Google/GitHub OAuth only, per the
  brief's MVP scope. The design's email field is presentational only.
- Crew setup (`/crew/new`) — real create/join against Postgres via Drizzle.
- Crew home (`/crew/[crewId]`) — real crew name, invite code, member
  count, streak. Today's/this week's challenge cards and the activity feed
  are static placeholder content until the daily/weekly cron (build-order
  steps 4–5) exists.
- Live room (`/crew/[crewId]/room`) — full UI with local React state
  (matches the design's own state shape: doc tab, editor tab, test case,
  language, code buffer). The editor is a styled `<textarea>` standing in
  for Monaco; Run/Submit, crew presence, and chat are static — see the
  `TODO(step 2/3)` comments in `room-client.tsx` for where PartyKit and
  Judge0 wire in.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run db:push              # push the Drizzle schema to your Neon DB
npm run dev
```

### Environment variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon](https://neon.tech) project → Connection Details. Use the pooled/serverless connection string. |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_URL` | `http://localhost:3000` locally; your deployed URL in production |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth client (type "Web application"). Authorized redirect URI: `<AUTH_URL>/api/auth/callback/google` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Authorization callback URL: `<AUTH_URL>/api/auth/callback/github` |

Nothing above has been filled in or run against a live database in this
pass — `npm run build` was used to verify the app compiles without needing
real credentials.

## Deploying to Vercel

Standard Next.js App Router deploy, no custom `vercel.json` needed:

1. Push this repo to GitHub and import it in Vercel.
2. Add the env vars above in the Vercel project settings (use your
   production `AUTH_URL` and matching OAuth redirect URIs).
3. Run `npm run db:push` once (locally, against the production
   `DATABASE_URL`) to create the schema on Neon before first deploy.

## Stack

Next.js 14 (App Router, TS) · Neon Postgres + Drizzle ORM · Auth.js v5
(Google/GitHub OAuth, Drizzle adapter) · PartyKit, Judge0, Upstash Redis,
Claude API, Monaco — planned for build-order steps 2–6, not yet wired.

## Project layout

```
app/                 routes — landing, signin, crew/new, crew/[crewId], crew/[crewId]/room
auth.ts              NextAuth v5 config
middleware.ts         protects /crew/**
db/schema.ts          Drizzle schema (Auth.js tables + crews/problems/challenges/submissions/live_sessions)
db/index.ts            Drizzle client (neon-serverless — see comment on why not neon-http)
components/            shared UI (theme toggle, decorative corner marks)
lib/                    auth-helpers, invite-code generator
```
