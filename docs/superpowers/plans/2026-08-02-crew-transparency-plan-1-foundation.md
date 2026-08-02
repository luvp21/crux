# Crew Practice Transparency — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the schema for the whole Crew Practice Transparency feature, and make problem selection crew-scoped with a leader-set topic/difficulty preference and a global-random fallback, plus real hidden test cases at submit time.

**Architecture:** Additive Drizzle schema changes (one migration), a pure `selectChallengeProblem` function that the daily/weekly crons and any future caller share, and a submit-route change that runs both visible and hidden test cases server-side while only ever returning hidden-case results as a pass/fail count.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM (`neon-serverless`), Postgres (Neon), Vitest (new — this project has no test runner yet).

## Global Constraints

- Every schema change is additive; nothing existing is dropped except the `challenges` unique constraint, which moves from `(type, challengeDate)` to `(crewId, type, challengeDate)` — see spec's Data model section.
- `hiddenTestCases` inputs/expected values must never appear in any client-facing JSON response, in success or error paths (spec: Edge cases).
- Business logic that can be pure (selection, filtering) must be extracted into a plain function and unit-tested — do not bury decision logic inside a route handler where it can only be tested via a live DB.
- This project has no test runner installed. Plan 1's first task sets one up (Vitest); every later task in this plan and the two plans that follow it depends on it.

---

## File Structure

- `vitest.config.ts` (new) — test runner config with `@/*` path alias support.
- `package.json` (modified) — adds `test` script and `vitest`/`vite-tsconfig-paths` devDependencies.
- `db/schema.ts` (modified) — adds `crewChallengePreferences` table, `crewId` on `challenges` (+ new unique constraint), `hiddenTestCases` on `problems`, new `codeCheckpoints` table (used by Plan 2, migrated now to avoid a second migration).
- `lib/challenge-selection.ts` (new) — pure `selectChallengeProblem` function shared by both crons.
- `lib/challenge-selection.test.ts` (new) — unit tests for the above.
- `app/api/cron/daily/route.ts` (modified) — per-crew loop instead of one global pick.
- `app/api/cron/daily/route.test.ts` (new).
- `app/api/cron/weekly/route.ts` (modified) — same per-crew change for weekly.
- `app/api/cron/weekly/route.test.ts` (new).
- `lib/problems.ts` (modified) — `getTodaysProblem`/`getWeeklyProblems` take a required `crewId` param.
- `lib/problems.test.ts` (new) — tests the crew-scoped query shape via a fake db.
- `app/crew/[crewId]/page.tsx` (modified) — pass `params.crewId` into the now-required-arg calls.
- `app/crew/[crewId]/room/page.tsx` (modified) — same.
- `app/api/crew/[crewId]/challenge-preference/route.ts` (new) — owner-only POST to set the standing topic/difficulty preference.
- `app/api/crew/[crewId]/challenge-preference/route.test.ts` (new).
- `app/api/submit/route.ts` (modified) — runs hidden test cases too; response never includes their input/expected text.
- `app/api/submit/route.test.ts` (new).

---

### Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/sanity.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` runs Vitest once (`vitest run`); `@/*` imports resolve inside tests the same way they do in the app.

- [ ] **Step 1: Install Vitest and the tsconfig-paths plugin**

Run: `npm install --save-dev vitest vite-tsconfig-paths`

- [ ] **Step 2: Add the test script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Write the Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Write a sanity test**

```ts
// lib/sanity.test.ts
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs and resolves @/ imports", async () => {
    const { generateInviteCode } = await import("@/lib/invite-code");
    expect(typeof generateInviteCode()).toBe("string");
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passed (the sanity test). If `@/` resolution fails, check `tsconfigPaths()` is in the `plugins` array and `tsconfig.json` still has `"paths": { "@/*": ["./*"] }`.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/sanity.test.ts package.json package-lock.json
git commit -m "test: add Vitest as the project's test runner"
```

---

### Task 2: Migrate the schema

**Files:**
- Modify: `db/schema.ts`

**Interfaces:**
- Produces: `crewChallengePreferences` table (`crewId`, `type`, `topicTag`, `difficulty`, `updatedByUserId`, `updatedAt`), `challenges.crewId` column, `problems.hiddenTestCases` column, `codeCheckpoints` table (`id`, `userId`, `problemId`, `crewId`, `code`, `language`, `insertedChars`, `isPasteFlag`, `submissionId`, `createdAt`) — all consumed by later tasks in this plan and by Plan 2.

- [ ] **Step 1: Add `unique` and `boolean` to the pg-core import**

In `db/schema.ts`, change:

```ts
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  date,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
```

to:

```ts
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  date,
  pgEnum,
  jsonb,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Add `hiddenTestCases` to `problems`**

Immediately after the existing `testCases` field in the `problems` table definition, add:

```ts
  hiddenTestCases: jsonb("hidden_test_cases")
    .$type<{ input: string; expected: string }[]>()
    .default([]),
```

- [ ] **Step 3: Add `crewId` to `challenges` and change its unique constraint**

Replace the existing `challenges` table definition:

```ts
export const challenges = pgTable("challenges", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: challengeTypeEnum("type").notNull(),
  challengeDate: date("challenge_date").notNull(),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
});
```

with:

```ts
export const challenges = pgTable(
  "challenges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    type: challengeTypeEnum("type").notNull(),
    challengeDate: date("challenge_date").notNull(),
    problemId: text("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.crewId, t.type, t.challengeDate)],
);
```

- [ ] **Step 4: Add the `crewChallengePreferences` table**

Add this new table definition after `challenges`:

```ts
export const crewChallengePreferences = pgTable(
  "crew_challenge_preferences",
  {
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    type: challengeTypeEnum("type").notNull(),
    topicTag: text("topic_tag"),
    difficulty: difficultyEnum("difficulty"),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.crewId, t.type] })],
);
```

- [ ] **Step 5: Add the `codeCheckpoints` table**

Add this new table definition after `submissions` (it references `submissions.id`, so it must come after):

```ts
export const codeCheckpoints = pgTable("code_checkpoints", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  language: text("language").notNull(),
  insertedChars: integer("inserted_chars").notNull().default(0),
  isPasteFlag: boolean("is_paste_flag").notNull().default(false),
  submissionId: text("submission_id").references(() => submissions.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Generate the migration**

Run: `npm run db:generate`
Expected: a new SQL file appears under `drizzle/`. Read it and confirm it contains: `CREATE TABLE "crew_challenge_preferences"`, `ALTER TABLE "challenges" ADD COLUMN "crew_id"`, `ALTER TABLE "problems" ADD COLUMN "hidden_test_cases"`, `CREATE TABLE "code_checkpoints"`, and a `UNIQUE` constraint on `challenges` covering `crew_id`, `type`, `challenge_date`.

Note: this migration cannot be applied against existing `challenges` rows without a `crewId` backfill, since the column is `NOT NULL`. Per the spec, there is no production data yet (confirmed in the project's own README), so this is expected — do not write a backfill script for data that doesn't exist. If `npm run db:push` is run against a database that already has `challenges` rows, it will fail on the `NOT NULL` constraint; that is correct behavior, not a bug to fix here.

- [ ] **Step 8: Commit**

```bash
git add db/schema.ts drizzle/
git commit -m "feat: migrate schema for per-crew challenges, hidden test cases, checkpoints"
```

---

### Task 3: Pure challenge-selection function

**Files:**
- Create: `lib/challenge-selection.ts`
- Test: `lib/challenge-selection.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface ChallengeCandidate {
    id: string;
    topicTag: string; // comma-separated, e.g. "trees,recursion"
    difficulty: "easy" | "medium" | "hard";
  }
  interface ChallengePreference {
    topicTag: string | null;
    difficulty: "easy" | "medium" | "hard" | null;
  }
  function selectChallengeProblem(
    allProblems: ChallengeCandidate[],
    preference: ChallengePreference | null,
    excludeProblemId: string | null,
    rng?: () => number, // defaults to Math.random; inject for deterministic tests
  ): ChallengeCandidate | null;
  ```
- Consumed by: Task 4 (daily cron), Task 5 (weekly cron).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/challenge-selection.test.ts
import { describe, it, expect } from "vitest";
import { selectChallengeProblem, type ChallengeCandidate } from "@/lib/challenge-selection";

const PROBLEMS: ChallengeCandidate[] = [
  { id: "p1", topicTag: "arrays", difficulty: "easy" },
  { id: "p2", topicTag: "trees,recursion", difficulty: "medium" },
  { id: "p3", topicTag: "trees", difficulty: "hard" },
  { id: "p4", topicTag: "graphs", difficulty: "hard" },
];

describe("selectChallengeProblem", () => {
  it("picks within the topic+difficulty filter when both match", () => {
    const result = selectChallengeProblem(PROBLEMS, { topicTag: "trees", difficulty: "hard" }, null, () => 0);
    expect(result?.id).toBe("p3");
  });

  it("matches a comma-separated topicTag containing the requested topic", () => {
    const result = selectChallengeProblem(PROBLEMS, { topicTag: "recursion", difficulty: null }, null, () => 0);
    expect(result?.id).toBe("p2");
  });

  it("falls back to unfiltered pick when the filter matches nothing", () => {
    const result = selectChallengeProblem(
      PROBLEMS,
      { topicTag: "dynamic-programming", difficulty: "easy" },
      null,
      () => 0,
    );
    expect(result?.id).toBe("p1"); // unfiltered pool, rng() = 0 picks the first
  });

  it("falls back to unfiltered pick when there is no preference", () => {
    const result = selectChallengeProblem(PROBLEMS, null, null, () => 0);
    expect(result?.id).toBe("p1");
  });

  it("excludes the given problem id from the pool", () => {
    const result = selectChallengeProblem(PROBLEMS, null, "p1", () => 0);
    expect(result?.id).toBe("p2");
  });

  it("returns null when the pool is empty after exclusion", () => {
    const result = selectChallengeProblem([PROBLEMS[0]], null, "p1", () => 0);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/challenge-selection.test.ts`
Expected: FAIL with "Cannot find module '@/lib/challenge-selection'" (or similar — the module doesn't exist yet).

- [ ] **Step 3: Implement**

```ts
// lib/challenge-selection.ts
export interface ChallengeCandidate {
  id: string;
  topicTag: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ChallengePreference {
  topicTag: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
}

export function selectChallengeProblem(
  allProblems: ChallengeCandidate[],
  preference: ChallengePreference | null,
  excludeProblemId: string | null,
  rng: () => number = Math.random,
): ChallengeCandidate | null {
  const pool = allProblems.filter((p) => p.id !== excludeProblemId);
  if (pool.length === 0) return null;

  if (preference && (preference.topicTag || preference.difficulty)) {
    const filtered = pool.filter((p) => {
      const topics = p.topicTag.split(",").map((t) => t.trim());
      const topicMatches = !preference.topicTag || topics.includes(preference.topicTag);
      const difficultyMatches = !preference.difficulty || p.difficulty === preference.difficulty;
      return topicMatches && difficultyMatches;
    });
    if (filtered.length > 0) {
      return filtered[Math.floor(rng() * filtered.length)];
    }
    // filter matched nothing — fall through to the unfiltered pool below
  }

  return pool[Math.floor(rng() * pool.length)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/challenge-selection.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/challenge-selection.ts lib/challenge-selection.test.ts
git commit -m "feat: add pure challenge-selection function with topic/difficulty filtering"
```

---

### Task 4: Per-crew daily cron

**Files:**
- Modify: `app/api/cron/daily/route.ts`
- Test: `app/api/cron/daily/route.test.ts`

**Interfaces:**
- Consumes: `selectChallengeProblem` from Task 3.
- Produces: `GET` handler that, per crew, inserts tomorrow's `challenges` row (scoped by `crewId`) using that crew's `crewChallengePreferences` row if one exists, and resets `crews.currentStreak` to 0 for crews where nobody solved today — same streak behavior as before, now in the same per-crew loop as challenge creation.

- [ ] **Step 1: Write the failing test**

```ts
// app/api/cron/daily/route.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => ({
        returning: vi.fn(async () => [{ id: "new-challenge", ...vals }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  },
}));

describe("GET /api/cron/daily", () => {
  it("is reachable and returns 200 with a per-crew summary", async () => {
    const { GET } = await import("@/app/api/cron/daily/route");
    const req = new Request("http://localhost/api/cron/daily");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("crewsProcessed");
  });
});
```

Note: this test intentionally checks the route is wired and returns the new `crewsProcessed` field rather than
exhaustively mocking every per-crew query branch — Drizzle's fluent builder makes a fully faithful mock
expensive to maintain, and `lib/challenge-selection.ts` (Task 3) already carries the real selection-logic
test coverage. This test's job is to catch wiring breakage (route doesn't compile, handler throws in mock
mode), not to re-verify selection logic.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/api/cron/daily/route.test.ts`
Expected: FAIL — `body.crewsProcessed` is undefined, because the route doesn't return that field yet.

- [ ] **Step 3: Rewrite the route**

```ts
// app/api/cron/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, crews, crewMembers, crewChallengePreferences } from "@/db/schema";
import { selectChallengeProblem } from "@/lib/challenge-selection";

/**
 * GET /api/cron/daily
 * Called daily (via Vercel Cron or manual trigger).
 * Per crew: picks tomorrow's daily problem (respecting the crew's topic/difficulty
 * preference, falling back to unfiltered random), and resets the crew's streak if
 * nobody solved today.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const allProblems = await db
      .select({ id: problems.id, topicTag: problems.topicTag, difficulty: problems.difficulty })
      .from(problems);
    const allCrews = await db.select().from(crews);

    let crewsProcessed = 0;
    let challengesCreated = 0;

    for (const crew of allCrews) {
      crewsProcessed++;

      // ---- Challenge selection ----
      const [existing] = await db
        .select()
        .from(challenges)
        .where(and(eq(challenges.crewId, crew.id), eq(challenges.type, "daily"), eq(challenges.challengeDate, tomorrow)))
        .limit(1);

      if (!existing) {
        const [todayChallenge] = await db
          .select()
          .from(challenges)
          .where(and(eq(challenges.crewId, crew.id), eq(challenges.type, "daily"), eq(challenges.challengeDate, today)))
          .limit(1);

        const [preference] = await db
          .select()
          .from(crewChallengePreferences)
          .where(and(eq(crewChallengePreferences.crewId, crew.id), eq(crewChallengePreferences.type, "daily")))
          .limit(1);

        const picked = selectChallengeProblem(
          allProblems,
          preference ? { topicTag: preference.topicTag, difficulty: preference.difficulty } : null,
          todayChallenge?.problemId ?? null,
        );

        if (picked) {
          await db.insert(challenges).values({
            crewId: crew.id,
            type: "daily",
            challengeDate: tomorrow,
            problemId: picked.id,
          });
          challengesCreated++;
        }
      }

      // ---- Streak reset ----
      const members = await db.select().from(crewMembers).where(eq(crewMembers.crewId, crew.id));
      const anyoneSolvedToday = members.some((m) => m.lastCompleted === today);
      if (!anyoneSolvedToday) {
        await db.update(crews).set({ currentStreak: 0 }).where(eq(crews.id, crew.id));
      }
    }

    return NextResponse.json({
      message: "Daily challenges processed",
      crewsProcessed,
      challengesCreated,
      date: tomorrow,
    });
  } catch (err) {
    console.error("[cron/daily] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/api/cron/daily/route.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/daily/route.ts app/api/cron/daily/route.test.ts
git commit -m "feat: make the daily cron per-crew, respecting leader topic/difficulty preference"
```

---

### Task 5: Per-crew weekly cron

**Files:**
- Modify: `app/api/cron/weekly/route.ts`
- Test: `app/api/cron/weekly/route.test.ts`

**Interfaces:**
- Consumes: `selectChallengeProblem` from Task 3 (same function, called 2-3 times per crew to build the week's set, excluding problems already picked this iteration).
- Produces: `GET` handler returning `{ message, weekDate, crewsProcessed, challengesCreated }`.

- [ ] **Step 1: Write the failing test**

```ts
// app/api/cron/weekly/route.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => ({
        returning: vi.fn(async () => [{ id: "new-weekly-challenge", ...vals }]),
      })),
    })),
  },
}));

describe("GET /api/cron/weekly", () => {
  it("is reachable and returns 200 with a per-crew summary", async () => {
    const { GET } = await import("@/app/api/cron/weekly/route");
    const req = new Request("http://localhost/api/cron/weekly");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("crewsProcessed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/api/cron/weekly/route.test.ts`
Expected: FAIL — `crewsProcessed` undefined.

- [ ] **Step 3: Rewrite the route**

```ts
// app/api/cron/weekly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, crews, crewChallengePreferences } from "@/db/schema";
import { selectChallengeProblem, type ChallengeCandidate } from "@/lib/challenge-selection";

const PROBLEMS_PER_WEEK = 3;

/**
 * GET /api/cron/weekly
 * Called weekly (Sunday midnight UTC via Vercel Cron or manual trigger).
 * Per crew: picks 2–3 problems for the new week, respecting the crew's topic/difficulty
 * preference (falling back to unfiltered random), avoiding duplicates within the set.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now.getTime() + daysUntilMonday * 86400000);
    const weekDate = nextMonday.toISOString().slice(0, 10);

    const allProblems = await db
      .select({ id: problems.id, topicTag: problems.topicTag, difficulty: problems.difficulty })
      .from(problems);
    const allCrews = await db.select().from(crews);

    let crewsProcessed = 0;
    let challengesCreated = 0;

    for (const crew of allCrews) {
      crewsProcessed++;

      const existing = await db
        .select()
        .from(challenges)
        .where(and(eq(challenges.crewId, crew.id), eq(challenges.type, "weekly"), eq(challenges.challengeDate, weekDate)));
      if (existing.length > 0) continue;

      const [preference] = await db
        .select()
        .from(crewChallengePreferences)
        .where(and(eq(crewChallengePreferences.crewId, crew.id), eq(crewChallengePreferences.type, "weekly")))
        .limit(1);
      const prefArg = preference ? { topicTag: preference.topicTag, difficulty: preference.difficulty } : null;

      const picked: ChallengeCandidate[] = [];
      let excludeId: string | null = null;
      for (let i = 0; i < PROBLEMS_PER_WEEK; i++) {
        const remaining = allProblems.filter((p) => !picked.some((pp) => pp.id === p.id));
        const next = selectChallengeProblem(remaining, prefArg, excludeId);
        if (!next) break;
        picked.push(next);
        excludeId = next.id; // only prevents immediate re-pick within the loop's exclusion arg; dedup is via the filter above
      }

      for (const p of picked) {
        await db.insert(challenges).values({
          crewId: crew.id,
          type: "weekly",
          challengeDate: weekDate,
          problemId: p.id,
        });
        challengesCreated++;
      }
    }

    return NextResponse.json({
      message: "Weekly challenges processed",
      weekDate,
      crewsProcessed,
      challengesCreated,
    });
  } catch (err) {
    console.error("[cron/weekly] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/api/cron/weekly/route.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/weekly/route.ts app/api/cron/weekly/route.test.ts
git commit -m "feat: make the weekly cron per-crew, respecting leader topic/difficulty preference"
```

---

### Task 6: Scope `lib/problems.ts` to `crewId`

**Files:**
- Modify: `lib/problems.ts`
- Modify: `app/crew/[crewId]/page.tsx:26-27`
- Modify: `app/crew/[crewId]/room/page.tsx:21`
- Test: `lib/problems.test.ts`

**Interfaces:**
- Produces: `getTodaysProblem(crewId: string): Promise<Problem>`, `getWeeklyProblems(crewId: string): Promise<Problem[]>` — both now require `crewId` as their first argument (previously took none). `getCrewActivity` and `getUserSubmissions` are unchanged.
- Consumed by: `app/crew/[crewId]/page.tsx`, `app/crew/[crewId]/room/page.tsx`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/problems.test.ts
import { describe, it, expect, vi } from "vitest";

const CHALLENGE = { id: "c1", crewId: "crew-1", type: "daily", challengeDate: "2026-08-02", problemId: "p1" };
const PROBLEM = {
  id: "p1",
  title: "Two Sum",
  difficulty: "easy",
  topicTag: "arrays",
  description: "desc",
  examples: [],
  constraints: "",
  starterCode: {},
  testCases: [],
};

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: { _: { name: string } }) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (table._.name === "challenges" ? [CHALLENGE] : [PROBLEM])),
        })),
      })),
    })),
  },
}));

describe("getTodaysProblem", () => {
  it("scopes the challenge lookup to the given crewId and returns the matching problem", async () => {
    const { getTodaysProblem } = await import("@/lib/problems");
    const result = await getTodaysProblem("crew-1");
    expect(result.id).toBe("p1");
    expect(result.title).toBe("Two Sum");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/problems.test.ts`
Expected: FAIL — TypeScript error (or runtime, depending on Vitest's transform) because `getTodaysProblem` doesn't accept an argument yet.

- [ ] **Step 3: Modify `getTodaysProblem` and `getWeeklyProblems`**

In `lib/problems.ts`, change the signature and query of `getTodaysProblem`:

```ts
export async function getTodaysProblem(crewId: string): Promise<Problem> {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.crewId, crewId), eq(challenges.challengeDate, today), eq(challenges.type, "daily")))
      .limit(1);

    // ...rest of the function body is unchanged from here down
```

And `getWeeklyProblems`:

```ts
export async function getWeeklyProblems(crewId: string): Promise<Problem[]> {
  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getTime() + mondayOffset * 86400000);
    const weekDate = monday.toISOString().slice(0, 10);

    const weeklyChallenges = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.crewId, crewId), eq(challenges.challengeDate, weekDate), eq(challenges.type, "weekly")));

    // ...rest of the function body is unchanged from here down
```

The fallback logic below each query (seed-data fallback when the DB has no matching challenge) is untouched — it doesn't depend on `crewId`.

- [ ] **Step 4: Update the two callers**

In `app/crew/[crewId]/page.tsx`, change:

```ts
  const todaysProblem = await getTodaysProblem();
  const weeklyProblems = await getWeeklyProblems();
```

to:

```ts
  const todaysProblem = await getTodaysProblem(params.crewId);
  const weeklyProblems = await getWeeklyProblems(params.crewId);
```

In `app/crew/[crewId]/room/page.tsx`, change:

```ts
  const problem = await getTodaysProblem();
```

to:

```ts
  const problem = await getTodaysProblem(params.crewId);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/problems.test.ts`
Expected: 1 passed.

- [ ] **Step 6: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors (this catches any other caller of these two functions that Step 4 missed).

- [ ] **Step 7: Commit**

```bash
git add lib/problems.ts lib/problems.test.ts "app/crew/[crewId]/page.tsx" "app/crew/[crewId]/room/page.tsx"
git commit -m "feat: scope getTodaysProblem/getWeeklyProblems to a crewId"
```

---

### Task 7: Leader challenge-preference API

**Files:**
- Create: `app/api/crew/[crewId]/challenge-preference/route.ts`
- Test: `app/api/crew/[crewId]/challenge-preference/route.test.ts`

**Interfaces:**
- Produces: `POST /api/crew/[crewId]/challenge-preference` — body `{ type: "daily" | "weekly", topicTag: string | null, difficulty: "easy" | "medium" | "hard" | null }`. 403 if the caller isn't the crew's `owner`. Upserts the `crewChallengePreferences` row (composite PK `crewId, type`).

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/crew/[crewId]/challenge-preference/route.test.ts
import { describe, it, expect, vi } from "vitest";

let membershipRole: string | null = "owner";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (membershipRole ? [{ role: membershipRole }] : [])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(async () => []),
      })),
    })),
  },
}));

describe("POST /api/crew/[crewId]/challenge-preference", () => {
  it("rejects a non-owner with 403", async () => {
    membershipRole = "member";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("accepts an owner's preference and returns 200", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);
  });

  it("rejects an invalid type with 400", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "monthly", topicTag: null, difficulty: null }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- "app/api/crew/[crewId]/challenge-preference/route.test.ts"`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement the route**

```ts
// app/api/crew/[crewId]/challenge-preference/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { crewMembers, crewChallengePreferences } from "@/db/schema";

interface PreferenceRequest {
  type: "daily" | "weekly";
  topicTag: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
}

/**
 * POST /api/crew/[crewId]/challenge-preference
 * Owner-only. Sets the crew's standing topic/difficulty preference for the
 * daily or weekly challenge cron to read on its next run.
 */
export async function POST(req: NextRequest, { params }: { params: { crewId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [membership] = await db
      .select()
      .from(crewMembers)
      .where(and(eq(crewMembers.userId, session.user.id), eq(crewMembers.crewId, params.crewId)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this crew" }, { status: 403 });
    }
    if (membership.role !== "owner") {
      return NextResponse.json({ error: "Only the crew owner can set the challenge preference" }, { status: 403 });
    }

    const body = (await req.json()) as PreferenceRequest;
    if (body.type !== "daily" && body.type !== "weekly") {
      return NextResponse.json({ error: "type must be 'daily' or 'weekly'" }, { status: 400 });
    }

    await db
      .insert(crewChallengePreferences)
      .values({
        crewId: params.crewId,
        type: body.type,
        topicTag: body.topicTag,
        difficulty: body.difficulty,
        updatedByUserId: session.user.id,
      })
      .onConflictDoUpdate({
        target: [crewChallengePreferences.crewId, crewChallengePreferences.type],
        set: {
          topicTag: body.topicTag,
          difficulty: body.difficulty,
          updatedByUserId: session.user.id,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Preference saved" });
  } catch (err) {
    console.error("[challenge-preference] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- "app/api/crew/[crewId]/challenge-preference/route.test.ts"`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add "app/api/crew/[crewId]/challenge-preference/route.ts" "app/api/crew/[crewId]/challenge-preference/route.test.ts"
git commit -m "feat: add owner-only endpoint to set a crew's challenge topic/difficulty preference"
```

---

### Task 8: Hidden test cases in the submit route

**Files:**
- Modify: `app/api/submit/route.ts`
- Test: `app/api/submit/route.test.ts`

**Interfaces:**
- Produces: submit response gains `hiddenResults: { total: number; passed: number }` alongside the existing `results` array (which continues to cover only visible test cases). `hiddenResults` never includes `input`/`expected`/`got` text. Verdict aggregation now considers hidden-case failures too (first-failure-wins across visible-then-hidden, matching the existing per-case verdict logic).

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/submit/route.test.ts
import { describe, it, expect, vi } from "vitest";

const PROBLEM = {
  id: "p1",
  testCases: [{ input: "1", expected: "2" }],
  hiddenTestCases: [{ input: "999", expected: "SECRET_VALUE_998" }],
  runnerMeta: null,
};

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/lib/streak", () => ({
  updateStreaksAfterSolve: vi.fn(async () => {}),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [PROBLEM]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "sub-1" }]),
      })),
    })),
  },
}));

describe("POST /api/submit (mock mode, no JUDGE0_URL)", () => {
  it("includes a hiddenResults summary without leaking hidden input/expected text", async () => {
    const { POST } = await import("@/app/api/submit/route");
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "print(2)", language: "python" }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(body.hiddenResults).toHaveProperty("total", 1);
    expect(body.hiddenResults).not.toHaveProperty("input");
    expect(body.hiddenResults).not.toHaveProperty("expected");
    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("SECRET_VALUE_998");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/api/submit/route.test.ts`
Expected: FAIL — `body.hiddenResults` is undefined.

- [ ] **Step 3: Modify the mock-mode branch**

In `app/api/submit/route.ts`, inside the `if (!JUDGE0_URL)` mock-mode block, after computing `testCases` and before the `db.insert(submissions)` call, add hidden-case handling and include it in the response:

```ts
    const testCases = (problem.testCases as { input: string; expected: string }[]) ?? [];
    const hiddenTestCases = (problem.hiddenTestCases as { input: string; expected: string }[]) ?? [];

    // ---- Mock mode ----
    if (!JUDGE0_URL) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

      const mockVerdict: Verdict = Math.random() > 0.3 ? "accepted" : "wrong_answer";
      const results = testCases.map((tc, i) => ({
        case: i + 1,
        input: tc.input,
        expected: tc.expected,
        got: mockVerdict === "accepted" ? tc.expected : "mock_output",
        passed: mockVerdict === "accepted",
      }));
      const hiddenPassedCount = mockVerdict === "accepted" ? hiddenTestCases.length : 0;

      const [sub] = await db
        .insert(submissions)
        .values({
          userId: session.user.id,
          problemId,
          crewId,
          code,
          language,
          verdict: mockVerdict,
          runtime: Math.floor(30 + Math.random() * 70),
          context: "daily",
        })
        .returning({ id: submissions.id });

      if (mockVerdict === "accepted") {
        await updateStreaksAfterSolve(session.user.id, crewId);
      }

      return NextResponse.json({
        verdict: mockVerdict,
        runtime: 41,
        results,
        hiddenResults: { total: hiddenTestCases.length, passed: hiddenPassedCount },
        submissionId: sub.id,
        mock: true,
      });
    }
```

- [ ] **Step 4: Modify the real-Judge0 branch**

Replace the test-case loop and its surrounding response so hidden cases run after visible ones, contribute to `overallVerdict` under the same first-failure-wins rule, but only their pass/fail count is ever returned:

```ts
    const results: { case: number; input: string; expected: string; got: string; passed: boolean }[] = [];
    let overallVerdict: Verdict = "accepted";
    let totalTime = 0;
    let hiddenPassed = 0;

    async function runCase(tc: { input: string; expected: string }) {
      const res = await fetch(
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,status,time,memory,compile_output`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            source_code: Buffer.from(driverCode).toString("base64"),
            language_id: langId,
            stdin: Buffer.from(tc.input).toString("base64"),
          }),
        },
      );

      if (!res.ok) {
        return { verdict: "runtime_error" as Verdict, stdout: "Judge0 error", time: 0 };
      }

      const result = await res.json();
      const stdout = result.stdout ? Buffer.from(result.stdout, "base64").toString().trim() : "";
      const statusId = result.status?.id ?? 0;
      const passed = stdout === tc.expected.trim();

      let caseVerdict: Verdict = "accepted";
      if (statusId === 5) caseVerdict = "time_limit_exceeded";
      else if (statusId >= 6 && statusId <= 12) caseVerdict = "runtime_error";
      else if (!passed) caseVerdict = "wrong_answer";

      return { verdict: caseVerdict, stdout, time: parseFloat(result.time ?? "0") * 1000, passed };
    }

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const { verdict: caseVerdict, stdout, time } = await runCase(tc);
      totalTime += time;
      if (caseVerdict !== "accepted" && overallVerdict === "accepted") overallVerdict = caseVerdict;
      results.push({ case: i + 1, input: tc.input, expected: tc.expected, got: stdout, passed: stdout === tc.expected.trim() });
    }

    for (const tc of hiddenTestCases) {
      const { verdict: caseVerdict, time, passed } = await runCase(tc);
      totalTime += time;
      if (caseVerdict !== "accepted" && overallVerdict === "accepted") overallVerdict = caseVerdict;
      if (passed) hiddenPassed++;
    }

    const runtime = Math.round(totalTime);

    const [sub] = await db
      .insert(submissions)
      .values({
        userId: session.user.id,
        problemId,
        crewId,
        code,
        language,
        verdict: overallVerdict,
        runtime,
        context: "daily",
      })
      .returning({ id: submissions.id });

    if (overallVerdict === "accepted") {
      await updateStreaksAfterSolve(session.user.id, crewId);
    }

    return NextResponse.json({
      verdict: overallVerdict as string,
      runtime,
      results,
      hiddenResults: { total: hiddenTestCases.length, passed: hiddenPassed },
      submissionId: sub.id,
    });
```

This replaces the entire block from `const results: ... = [];` down to the final `return NextResponse.json({...})` in the real-Judge0 branch. The `for (let i = 0; i < testCases.length; i++)` loop body is now the smaller `runCase`-based version shown above — remove the old inline `fetch` loop entirely so there is only one code path (`runCase`) doing the Judge0 call.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- app/api/submit/route.test.ts`
Expected: 1 passed.

- [ ] **Step 6: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/submit/route.ts app/api/submit/route.test.ts
git commit -m "feat: run hidden test cases at submit time without exposing their content"
```

---

## Plan Self-Review

- **Spec coverage:** "Crew-directed problem selection" → Tasks 3, 4, 5, 7. "Hidden test cases" → Task 8. Schema for all four spec sub-features → Task 2 (checkpoints table migrated here so Plan 2 doesn't need its own migration). Solution/time transparency and the Pulse Strip are explicitly out of scope for this plan — they're Plan 2.
- **Placeholder scan:** no TBD/TODO; every step has real code.
- **Type consistency:** `ChallengeCandidate`/`ChallengePreference` (Task 3) are used with matching field names in Tasks 4, 5, and 7 (`topicTag`, `difficulty`); `hiddenResults: { total, passed }` (Task 8) is the shape later plans' UI code will need to match when it's wired into the room client in Plan 2/3.
