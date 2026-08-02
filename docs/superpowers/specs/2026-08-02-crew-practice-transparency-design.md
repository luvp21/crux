# Crew Practice Transparency — Design

Status: approved (pending final spec review)
Date: 2026-08-02

## Problem

Crux currently has crews, a global daily/weekly challenge, live rooms, Judge0 execution, and streaks —
but no reason for members to trust each other beyond good faith, and no way for a crew to direct its own
practice. The obvious next move for a "practice with friends" app is a leaderboard, but the person who
proposed this feature explicitly rejected that: a rating or solve-count leaderboard in a small, closed
group creates a direct incentive to cheat (paste a solution, inflate a rank) with no counterbalancing
cost. The alternative bet this design makes: **make how someone practiced visible to their crew instead
of ranking them**. Visibility is the accountability mechanism, not a score.

## Goals

- Let a crew's leader steer practice toward a topic/difficulty instead of a system-wide random pick.
- Let crew members see each other's solved code and time spent — but only after they've made their own
  attempt, so the feature can't become "copy your crewmate's visible answer."
- Show *how* a solution was written (typed incrementally vs. pasted in one shot) without full keystroke
  replay, which is disproportionate engineering for a solo-built app.
- Reach real LeetCode parity on the judging surface: hidden test cases that aren't shown to the solver,
  checked only at submit time.

## Non-goals

- No rating, score, or leaderboard of any kind, crew-internal or global.
- No full keystroke-level replay (considered and explicitly passed over — see Alternatives).
- No cross-crew visibility or discovery. Crews stay closed, invite-code-only groups, unchanged from today.

## Data model changes

All changes are additive (new tables/columns); nothing existing is removed except as noted.

### `crewChallengePreferences` (new table)

```
crewId        text, FK -> crews.id, part of composite PK
type          challenge_type enum ("daily" | "weekly"), part of composite PK
topicTag      text, nullable          -- e.g. "trees", null = any topic
difficulty    difficulty enum, nullable -- null = any difficulty
updatedByUserId  text, FK -> users.id
updatedAt     timestamp
```

Composite PK `(crewId, type)`. The crew owner sets this as a standing preference ("we're doing hard DP
this week"), not a one-shot pick — it persists until changed. Absence of a row, or fields left null, means
"no constraint, pick anything," which is exactly today's global-random behavior scoped to one crew.

### `challenges` (existing table, modified)

Add `crewId` (text, FK -> crews.id, **not null**). The unique constraint moves from
`(type, challengeDate)` to `(crewId, type, challengeDate)` — every crew gets its own row per day/week
instead of one shared global row. This is the one breaking schema change; existing rows would need a
migration to either backfill a `crewId` per historical row or be dropped, since there's no production data
yet (per the README, nothing has been run against a live database).

### `problems` (existing table, modified)

Add `hiddenTestCases` (jsonb, same shape as the existing `testCases`: `{ input, expected }[]`, default
`[]`). `testCases` keeps its current meaning (used by Run, shown in the UI) and is renamed in intent only
— visible cases. `hiddenTestCases` is never sent to the client; only used server-side in the submit route.

### `codeCheckpoints` (new table)

```
id           text, PK
userId       text, FK -> users.id
problemId    text, FK -> problems.id
crewId       text, FK -> crews.id
code         text
language     text
insertedChars integer   -- len(code) - len(previous checkpoint's code) for this (user, problem), clamped to 0 minimum
isPasteFlag  boolean    -- insertedChars > 80 (default threshold; tunable, not hardcoded in the query)
submissionId text, FK -> submissions.id, nullable  -- set retroactively when the next submit happens
createdAt    timestamp
```

Client posts a checkpoint on a debounced interval (~25s of active typing — no typing, no checkpoint) and
once immediately on Run/Submit. No new capture mechanism for the paste flag: it's a threshold check on the
diff between consecutive checkpoints already being stored, so raising or lowering the granularity later
doesn't require new infrastructure.

### `submissions` (existing table, unchanged)

Time spent is computed at read time as `submittedAt - MIN(codeCheckpoints.createdAt) WHERE
codeCheckpoints.submissionId = this submission's id`. Checkpoints are tagged with the submission's id
synchronously as part of the submit request (see Flow 3), so by the time anything reads a submission, its
checkpoints are already attached — no separate "open session" lookup is needed. If no checkpoints exist for
a submission (e.g., solved faster than one checkpoint interval), time spent shows as "< 25s" rather than a
hard number — see Edge cases.

## Feature flows

### 1. Crew-directed problem of the day/week

- Crew owner opens a settings panel (new, owner-role-gated) and sets topic/difficulty for daily and/or
  weekly, independently. Leaving a field blank means "no constraint."
- The daily/weekly cron (`app/api/cron/daily/route.ts`, `weekly/route.ts`) changes from a single global
  pick to a **per-crew loop**: for each crew, read its `crewChallengePreferences` row (if any), filter the
  problem seed bank by topic/difficulty, and pick randomly within that filtered set (avoiding repeats the
  same way the current logic does). If the filter matches zero problems, or no preference row exists, fall
  back to the existing unfiltered random pick — this is the "global fallback" behavior.
- Streak-reset logic in the cron loop is unchanged; it already iterates per crew.

### 2. Solution + time transparency (submit-gated)

- A new endpoint (`GET /api/crew/[crewId]/problems/[problemId]/solutions`) returns crew members'
  submissions for a problem **only if the requesting user has at least one submission of their own** for
  that problem (any verdict, not just accepted — decided explicitly to keep the bar low: attempting counts,
  lurking doesn't).
- The crew home activity feed and the room's crew panel both call this gated endpoint. Before the caller
  has submitted, the row shows status only ("attempting," "not started") with no code/time, matching the
  "locked" treatment from the approved mockups.

### 3. Code checkpoint timeline (Pulse Strip)

- Client-side in the room, a debounced timer posts a checkpoint to `POST /api/checkpoints` after ~25s of
  active typing since the last checkpoint (skipped entirely if the user hasn't typed — no checkpoint spam
  from idle tabs). One extra checkpoint is posted immediately on Run and on Submit regardless of the timer.
- On submit, the submit route tags all of that (user, problem)'s checkpoints with `submissionId IS NULL`
  as belonging to the new submission.
- `GET /api/submissions/[id]/timeline` returns the tagged checkpoints (code + timestamp + insertedChars +
  isPasteFlag) for rendering the Pulse Strip — the small waveform on crew log rows, and a larger version in
  the solution detail view showing exactly which checkpoint(s) were flagged.

### 4. Hidden test cases

- The room's test-case UI splits into visible cases (from `testCases`, user can pick/run any of them,
  exactly as today) and a "+N hidden" indicator with no detail.
- Run (`/api/judge0`) only ever executes visible cases.
- Submit (`/api/submit`) executes visible **and** hidden cases server-side; the aggregated verdict follows
  the existing first-failure-wins rule. The response to the client includes per-case pass/fail for visible
  cases (as today) but only a pass/fail count for hidden cases — never their input/expected text.

## Visual/UX direction

Approved after several rounds (see prior conversation) — final direction adapts a user-supplied reference
(`design.md`, sampled from Agenta.ai) rather than the earlier from-scratch explorations:

- **Two dark palettes, no light mode.** Marketing/landing pages use a warm near-black
  (`--bg-base: #0E0D0B`) with a single acid-yellow accent (`#EAE23C`, Crux's own hex, not copied from the
  reference). The app surfaces (crew home, room) use a cooler near-black (`--app-bg: #0C0C0E`). The
  existing light/dark `ThemeToggle` component and `html[data-theme="light"]` CSS overrides are removed —
  this is a deliberate scope decision, not an oversight.
- **Type:** Instrument Serif for display headlines only (landing page moments), Inter for all UI text,
  JetBrains Mono for anything technical (problem names, timestamps, durations, code) — mono is never
  decorative.
- **Layout:** framed container pattern on the landing page (full-bleed outer canvas, ~74%-wide centered
  content column with its own lighter surface tone, no vertical inset). App surfaces use a simpler
  sidebar + main-canvas layout.
- **Signature pattern — the crew log row:** borrowed near-directly from the reference's "tool-call activity
  log" idiom (checkmark/status glyph + monospace name + right-aligned duration/result), applied to "who
  solved what, how long it took." The submit-gate gets the same visual language: a `locked` label in place
  of the result until the viewer has submitted their own attempt.
- **Pulse Strip:** a small inline SVG waveform per crew-log row and per solution detail, in the accent
  color; a paste-flagged checkpoint renders as a red spike on the strip with an inline label.
- Components generally: borderless-shadow cards (1px subtle border + fill contrast instead of drop
  shadows), pill buttons, rounded-full badges, section-eyebrow pills used sparingly.

## Error handling & edge cases

- **No checkpoints for a submission** (fast solve, or checkpoint POST failed): time spent shows
  "< 25s" instead of a computed duration; the Pulse Strip shows a flat/empty state rather than erroring.
- **Crew challenge preference matches zero problems:** cron falls back to the existing unfiltered random
  pick and logs which crews fell back, so it's visible in cron output if a topic filter is too narrow.
- **Leader changes preference mid-cycle:** the change applies to the *next* cron run, not retroactively —
  today's/this week's already-assigned challenge doesn't change under the crew.
- **Viewing a locked solution via direct API call** (bypassing the UI): the gated endpoint enforces the
  submission check server-side, not just in the UI, so this isn't a client-trust issue.
- **Checkpoint flood / abuse:** the debounce is client-side, but the endpoint should also rate-limit by
  (userId, problemId) server-side (e.g., reject checkpoints closer than ~10s apart) so a modified client
  can't spam the table.
- **Hidden test cases leaking via error messages:** runtime errors from hidden cases must not echo raw
  stdin/expected values back to the client in error responses — only pass/fail + generic error class
  (matches the existing runtime_error/TLE handling already in the submit route).

## Testing strategy

- **Unit:** checkpoint diff/paste-flag threshold logic; per-crew challenge-filter-with-fallback selection
  logic; time-spent computation from checkpoints (including the zero-checkpoint fallback).
- **Integration:** submit-gated solutions endpoint (asserting a non-submitter gets locked/status-only data,
  a submitter gets full data); submit route's hidden-test-case execution (asserting hidden inputs never
  appear in the client-facing response); per-crew cron run against multiple crews with different/no
  preferences.
- **E2E (Playwright, per this project's testing convention):** leader sets a topic preference → next
  cron-generated challenge matches it; a member submits → crew log unlocks their row for other members;
  a large paste during solving → Pulse Strip shows the flag.

## Alternatives considered

- **Full keystroke replay** for the timeline — rejected as disproportionate engineering (needs an
  operational-transform log, replay engine, much larger storage) for a solo-built app; periodic checkpoints
  plus diff-based paste flagging gets the same signal ("did they write this or paste it") far more cheaply.
- **Leader picks the exact problem**, not just topic/difficulty — rejected in favor of the lighter
  "topic + difficulty, system auto-picks" model, keeping the leader's job to a quick standing preference
  rather than a daily chore.
- **Always-visible solutions, no gate** — rejected because it opens a copy-paste cheating vector in the
  opposite direction (copying a crewmate's visible answer instead of solving it yourself), which defeats
  the point of the feature.
