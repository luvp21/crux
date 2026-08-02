# Crew Practice Transparency — Plan 2: Checkpoint Timeline & Solution Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a crew see how a member solved a problem — full code, time spent, and a checkpoint timeline with paste flags — but only once the viewer has submitted their own attempt on that problem.

**Architecture:** Two small `lib/` modules own the gate logic (`lib/crew-solutions.ts`, `lib/submission-timeline.ts`) so both API routes and server-rendered pages call the same code instead of a page fetching its own API route. Checkpoints are posted client-side on a debounce and tagged to a submission server-side at submit time (both already schema-migrated in Plan 1).

**Tech Stack:** Next.js 14 App Router, Drizzle ORM, Vitest (set up in Plan 1).

## Global Constraints

- **Prerequisite: Plan 1 must be merged first.** This plan imports `codeCheckpoints` and the `hiddenResults`-returning `app/api/submit/route.ts` from Plan 1; none of that exists without it.
- The submit-gate ("view a crewmate's solution only after submitting your own attempt") is enforced server-side in `lib/`, never only in the UI — a locked row must be locked even via direct API call (spec: Edge cases).
- No score, rank, or aggregate count of solves is ever computed or returned by any endpoint in this plan — per-problem status only (spec: Non-goals).
- Checkpoint posting is best-effort from the client (a network failure posting a checkpoint must never block Run/Submit) and rate-limited server-side at 10s minimum between checkpoints for the same (user, problem) (spec: Edge cases).
- This plan does not restyle any UI to the approved dark-only design system — that's Plan 3. New UI in this plan reuses the existing `var(--accent)` / `var(--line)` CSS custom properties already used throughout the codebase, so nothing here gets thrown away, only reskinned, in Plan 3.

---

## File Structure

- `app/api/checkpoints/route.ts` (new) — `POST`, accepts a code snapshot, computes the diff/paste-flag, rate-limits.
- `app/api/checkpoints/route.test.ts` (new).
- `app/api/submit/route.ts` (modified, on top of Plan 1) — tags open checkpoints with the new submission's id.
- `app/api/submit/route.test.ts` (modified — extends Plan 1's test).
- `lib/checkpoint-analysis.ts` (new) — pure `computeTimeSpentLabel`, `hasPasteFlag`.
- `lib/checkpoint-analysis.test.ts` (new).
- `lib/submission-timeline.ts` (new) — gate + fetch for one submission's checkpoints.
- `lib/submission-timeline.test.ts` (new).
- `app/api/submissions/[id]/timeline/route.ts` (new) — thin wrapper around the above.
- `app/api/submissions/[id]/timeline/route.test.ts` (new).
- `lib/crew-solutions.ts` (new) — gate + per-member row list for one problem.
- `lib/crew-solutions.test.ts` (new).
- `app/api/crew/[crewId]/problems/[problemId]/solutions/route.ts` (new) — thin wrapper around the above.
- `app/api/crew/[crewId]/problems/[problemId]/solutions/route.test.ts` (new).
- `app/crew/[crewId]/room/room-client.tsx` (modified) — debounced checkpoint posting on type, plus immediate posts on Run/Submit.
- `lib/pulse-strip-math.ts` (new) — pure checkpoint-array-to-SVG-points function.
- `lib/pulse-strip-math.test.ts` (new).
- `components/pulse-strip.tsx` (new) — renders the waveform using the above.
- `app/crew/[crewId]/page.tsx` (modified) — activity section calls `lib/crew-solutions.ts` for today's problem instead of the generic `getCrewActivity` feed.
- `app/crew/[crewId]/problems/[problemId]/solutions/[userId]/page.tsx` (new) — solution detail view: code + time spent + Pulse Strip.

---

### Task 1: Checkpoint posting endpoint

**Files:**
- Create: `app/api/checkpoints/route.ts`
- Test: `app/api/checkpoints/route.test.ts`

**Interfaces:**
- Produces: `POST /api/checkpoints` — body `{ problemId, crewId, code, language }`. Returns `{ checkpointId, isPasteFlag }` on success (200), `429` if called again within 10s for the same (user, problem).

- [ ] **Step 1: Write the failing tests**

```ts
// app/api/checkpoints/route.test.ts
import { describe, it, expect, vi } from "vitest";

let previousCheckpoint: { code: string; createdAt: Date } | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => (previousCheckpoint ? [previousCheckpoint] : [])),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "chk-1" }]),
      })),
    })),
  },
}));

describe("POST /api/checkpoints", () => {
  it("rejects a checkpoint posted within 10s of the previous one", async () => {
    previousCheckpoint = { code: "abc", createdAt: new Date() };
    const { POST } = await import("@/app/api/checkpoints/route");
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "abcdef", language: "python" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(429);
  });

  it("accepts a checkpoint and flags a large insertion as a paste", async () => {
    previousCheckpoint = { code: "a", createdAt: new Date(Date.now() - 20_000) };
    const { POST } = await import("@/app/api/checkpoints/route");
    const bigPaste = "a".repeat(200);
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: bigPaste, language: "python" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPasteFlag).toBe(true);
  });

  it("does not flag a small, incremental change", async () => {
    previousCheckpoint = { code: "a".repeat(50), createdAt: new Date(Date.now() - 20_000) };
    const { POST } = await import("@/app/api/checkpoints/route");
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "a".repeat(55), language: "python" }),
    });
    const res = await POST(req as never);
    const body = await res.json();
    expect(body.isPasteFlag).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- app/api/checkpoints/route.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// app/api/checkpoints/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { codeCheckpoints } from "@/db/schema";

const MIN_INTERVAL_MS = 10_000;
const PASTE_THRESHOLD_CHARS = 80;

interface CheckpointRequest {
  problemId: string;
  crewId: string;
  code: string;
  language: string;
}

/**
 * POST /api/checkpoints
 * Client posts a code snapshot on a debounce (~25s of active typing) and
 * once on Run/Submit. Rate-limited to one per 10s per (user, problem) so a
 * modified client can't flood the table.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CheckpointRequest;
    const { problemId, crewId, code, language } = body;
    if (!problemId || !crewId || typeof code !== "string" || !language) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [previous] = await db
      .select()
      .from(codeCheckpoints)
      .where(and(eq(codeCheckpoints.userId, session.user.id), eq(codeCheckpoints.problemId, problemId)))
      .orderBy(desc(codeCheckpoints.createdAt))
      .limit(1);

    if (previous && Date.now() - previous.createdAt.getTime() < MIN_INTERVAL_MS) {
      return NextResponse.json({ error: "Too many checkpoints" }, { status: 429 });
    }

    const insertedChars = Math.max(0, code.length - (previous?.code.length ?? 0));
    const isPasteFlag = insertedChars > PASTE_THRESHOLD_CHARS;

    const [checkpoint] = await db
      .insert(codeCheckpoints)
      .values({ userId: session.user.id, problemId, crewId, code, language, insertedChars, isPasteFlag })
      .returning({ id: codeCheckpoints.id });

    return NextResponse.json({ checkpointId: checkpoint.id, isPasteFlag });
  } catch (err) {
    console.error("[checkpoints] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/api/checkpoints/route.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add app/api/checkpoints/route.ts app/api/checkpoints/route.test.ts
git commit -m "feat: add checkpoint posting endpoint with rate limit and paste-flag detection"
```

---

### Task 2: Tag checkpoints to their submission

**Files:**
- Modify: `app/api/submit/route.ts` (the Plan-1 version)
- Modify: `app/api/submit/route.test.ts`

**Interfaces:**
- Produces: after a submission is created (both mock and real-Judge0 branches), every `codeCheckpoints` row for that (user, problem) with `submissionId IS NULL` gets `submissionId` set to the new submission's id.

- [ ] **Step 1: Extend the test**

Add this test to the existing `app/api/submit/route.test.ts` (alongside the Plan-1 `hiddenResults` test), updating the `@/db` mock to also cover `update`:

```ts
// add to the existing vi.mock("@/db", ...) factory's returned object:
    update: vi.fn(() => ({
      set: vi.fn((vals: { submissionId: string }) => ({
        where: vi.fn(async () => {
          taggedWith = vals.submissionId;
          return [];
        }),
      })),
    })),
```

```ts
// add alongside the existing top-level test vars:
let taggedWith: string | null = null;

// add a new test in the existing describe block:
it("tags open checkpoints with the new submission id", async () => {
  taggedWith = null;
  const { POST } = await import("@/app/api/submit/route");
  const req = new Request("http://localhost/api/submit", {
    method: "POST",
    body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "print(2)", language: "python" }),
  });
  await POST(req as never);
  expect(taggedWith).toBe("sub-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/api/submit/route.test.ts`
Expected: FAIL — `taggedWith` stays `null` because nothing calls `db.update` yet.

- [ ] **Step 3: Add the tagging call**

In `app/api/submit/route.ts`, import `codeCheckpoints` and `isNull`:

```ts
import { eq, and, isNull } from "drizzle-orm";
import { submissions, problems, codeCheckpoints } from "@/db/schema";
```

Then, in **both** the mock-mode branch and the real-Judge0 branch, immediately after the `db.insert(submissions)...returning(...)` call that produces `sub`, add:

```ts
    await db
      .update(codeCheckpoints)
      .set({ submissionId: sub.id })
      .where(
        and(
          eq(codeCheckpoints.userId, session.user.id),
          eq(codeCheckpoints.problemId, problemId),
          isNull(codeCheckpoints.submissionId),
        ),
      );
```

This runs before the `updateStreaksAfterSolve` call in each branch (order doesn't matter between the two, but keep the tagging call directly after the insert so the two related statements read together).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- app/api/submit/route.test.ts`
Expected: all tests pass, including the new tagging test and the Plan-1 `hiddenResults` test.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/submit/route.ts app/api/submit/route.test.ts
git commit -m "feat: tag open code checkpoints with their submission id at submit time"
```

---

### Task 3: Pure checkpoint-analysis functions

**Files:**
- Create: `lib/checkpoint-analysis.ts`
- Test: `lib/checkpoint-analysis.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Checkpoint {
    createdAt: Date;
    isPasteFlag: boolean;
    insertedChars: number;
  }
  function computeTimeSpentLabel(checkpoints: Checkpoint[], submittedAt: Date): string;
  function hasPasteFlag(checkpoints: Checkpoint[]): boolean;
  ```
- Consumed by: Task 4 (`lib/submission-timeline.ts`), and by Plan 3's UI work for the crew log row label.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/checkpoint-analysis.test.ts
import { describe, it, expect } from "vitest";
import { computeTimeSpentLabel, hasPasteFlag, type Checkpoint } from "@/lib/checkpoint-analysis";

describe("computeTimeSpentLabel", () => {
  it("returns '< 25s' when there are no checkpoints", () => {
    expect(computeTimeSpentLabel([], new Date())).toBe("< 25s");
  });

  it("computes minutes from the earliest checkpoint to submittedAt", () => {
    const submittedAt = new Date("2026-08-02T10:41:00Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:20:00Z"), isPasteFlag: false, insertedChars: 10 },
      { createdAt: new Date("2026-08-02T10:35:00Z"), isPasteFlag: false, insertedChars: 20 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("21m");
  });

  it("formats over an hour as '<h>h <m>m'", () => {
    const submittedAt = new Date("2026-08-02T12:05:00Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:00:00Z"), isPasteFlag: false, insertedChars: 5 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("2h 5m");
  });

  it("returns '< 1m' for a sub-minute gap", () => {
    const submittedAt = new Date("2026-08-02T10:00:30Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:00:00Z"), isPasteFlag: false, insertedChars: 5 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("< 1m");
  });
});

describe("hasPasteFlag", () => {
  it("is false for an empty array", () => {
    expect(hasPasteFlag([])).toBe(false);
  });

  it("is true when any checkpoint is flagged", () => {
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date(), isPasteFlag: false, insertedChars: 5 },
      { createdAt: new Date(), isPasteFlag: true, insertedChars: 300 },
    ];
    expect(hasPasteFlag(checkpoints)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/checkpoint-analysis.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// lib/checkpoint-analysis.ts
export interface Checkpoint {
  createdAt: Date;
  isPasteFlag: boolean;
  insertedChars: number;
}

export function computeTimeSpentLabel(checkpoints: Checkpoint[], submittedAt: Date): string {
  if (checkpoints.length === 0) return "< 25s";

  const earliest = checkpoints.reduce(
    (min, c) => (c.createdAt < min ? c.createdAt : min),
    checkpoints[0].createdAt,
  );
  const ms = submittedAt.getTime() - earliest.getTime();
  if (ms < 0) return "< 25s";

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function hasPasteFlag(checkpoints: Checkpoint[]): boolean {
  return checkpoints.some((c) => c.isPasteFlag);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/checkpoint-analysis.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/checkpoint-analysis.ts lib/checkpoint-analysis.test.ts
git commit -m "feat: add pure time-spent and paste-flag summary functions"
```

---

### Task 4: Submission timeline (gate + fetch)

**Files:**
- Create: `lib/submission-timeline.ts`
- Test: `lib/submission-timeline.test.ts`
- Create: `app/api/submissions/[id]/timeline/route.ts`
- Test: `app/api/submissions/[id]/timeline/route.test.ts`

**Interfaces:**
- Consumes: `computeTimeSpentLabel` from Task 3.
- Produces:
  ```ts
  type TimelineResult =
    | { ok: true; timeSpentLabel: string; checkpoints: { code: string; createdAt: string; insertedChars: number; isPasteFlag: boolean }[] }
    | { ok: false; status: 403 | 404 };
  function getSubmissionTimeline(requesterId: string, submissionId: string): Promise<TimelineResult>;
  ```
- Consumed by: `app/api/submissions/[id]/timeline/route.ts` (Task 4) and the solution detail page (Task 9).

- [ ] **Step 1: Write the failing test for `lib/submission-timeline.ts`**

```ts
// lib/submission-timeline.test.ts
import { describe, it, expect, vi } from "vitest";

const SUBMISSION = { id: "sub-1", userId: "owner", problemId: "p1", submittedAt: new Date("2026-08-02T10:41:00Z") };
const CHECKPOINTS = [
  { code: "a", createdAt: new Date("2026-08-02T10:20:00Z"), insertedChars: 1, isPasteFlag: false },
];

let ownAttemptRows: unknown[] = [];

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: { _: { name: string } }) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (table._.name === "submissions" ? [SUBMISSION] : ownAttemptRows)),
          orderBy: vi.fn(async () => CHECKPOINTS),
        })),
      })),
    })),
  },
}));

describe("getSubmissionTimeline", () => {
  it("returns the timeline for the submission's own author", async () => {
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("owner", "sub-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.timeSpentLabel).toBe("21m");
      expect(result.checkpoints).toHaveLength(1);
    }
  });

  it("returns 403 for a crewmate who hasn't submitted their own attempt", async () => {
    ownAttemptRows = [];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows a crewmate who has submitted their own attempt", async () => {
    ownAttemptRows = [{ id: "sub-2" }];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/submission-timeline.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement `lib/submission-timeline.ts`**

```ts
// lib/submission-timeline.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions, codeCheckpoints } from "@/db/schema";
import { computeTimeSpentLabel } from "@/lib/checkpoint-analysis";

export type TimelineResult =
  | {
      ok: true;
      timeSpentLabel: string;
      checkpoints: { code: string; createdAt: string; insertedChars: number; isPasteFlag: boolean }[];
    }
  | { ok: false; status: 403 | 404 };

/**
 * Fetches a submission's checkpoint timeline, gated: the requester must be
 * the submission's own author, or must have submitted their own attempt on
 * the same problem.
 */
export async function getSubmissionTimeline(requesterId: string, submissionId: string): Promise<TimelineResult> {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission) {
    return { ok: false, status: 404 };
  }

  if (submission.userId !== requesterId) {
    const [ownAttempt] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.userId, requesterId), eq(submissions.problemId, submission.problemId)))
      .limit(1);
    if (!ownAttempt) {
      return { ok: false, status: 403 };
    }
  }

  const checkpoints = await db
    .select()
    .from(codeCheckpoints)
    .where(eq(codeCheckpoints.submissionId, submissionId))
    .orderBy(codeCheckpoints.createdAt);

  return {
    ok: true,
    timeSpentLabel: computeTimeSpentLabel(checkpoints, submission.submittedAt),
    checkpoints: checkpoints.map((c) => ({
      code: c.code,
      createdAt: c.createdAt.toISOString(),
      insertedChars: c.insertedChars,
      isPasteFlag: c.isPasteFlag,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/submission-timeline.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write the failing test for the route wrapper**

```ts
// app/api/submissions/[id]/timeline/route.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/lib/submission-timeline", () => ({
  getSubmissionTimeline: vi.fn(async (_requesterId: string, submissionId: string) =>
    submissionId === "locked-sub" ? { ok: false, status: 403 } : { ok: true, timeSpentLabel: "21m", checkpoints: [] },
  ),
}));

describe("GET /api/submissions/[id]/timeline", () => {
  it("returns 403 when the gate denies access", async () => {
    const { GET } = await import("@/app/api/submissions/[id]/timeline/route");
    const req = new Request("http://localhost/api/submissions/locked-sub/timeline");
    const res = await GET(req as never, { params: { id: "locked-sub" } } as never);
    expect(res.status).toBe(403);
  });

  it("returns the timeline when the gate allows access", async () => {
    const { GET } = await import("@/app/api/submissions/[id]/timeline/route");
    const req = new Request("http://localhost/api/submissions/sub-1/timeline");
    const res = await GET(req as never, { params: { id: "sub-1" } } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeSpentLabel).toBe("21m");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- "app/api/submissions/[id]/timeline/route.test.ts"`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 7: Implement the route wrapper**

```ts
// app/api/submissions/[id]/timeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubmissionTimeline } from "@/lib/submission-timeline";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSubmissionTimeline(session.user.id, params.id);
  if (!result.ok) {
    const message = result.status === 404 ? "Not found" : "Submit your own attempt to view this timeline";
    return NextResponse.json({ error: message }, { status: result.status });
  }

  return NextResponse.json({ timeSpentLabel: result.timeSpentLabel, checkpoints: result.checkpoints });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- "app/api/submissions/[id]/timeline/route.test.ts"`
Expected: 2 passed.

- [ ] **Step 9: Commit**

```bash
git add lib/submission-timeline.ts lib/submission-timeline.test.ts \
  "app/api/submissions/[id]/timeline/route.ts" "app/api/submissions/[id]/timeline/route.test.ts"
git commit -m "feat: add gated submission timeline lookup and API route"
```

---

### Task 5: Crew solutions for a problem (gate + fetch)

**Files:**
- Create: `lib/crew-solutions.ts`
- Test: `lib/crew-solutions.test.ts`
- Create: `app/api/crew/[crewId]/problems/[problemId]/solutions/route.ts`
- Test: `app/api/crew/[crewId]/problems/[problemId]/solutions/route.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type SolutionRow =
    | { userId: string; status: "not_started" }
    | { userId: string; status: "locked" }
    | { userId: string; status: "visible"; submissionId: string; verdict: string; submittedAt: string };
  function getCrewSolutionsForProblem(requesterId: string, crewId: string, problemId: string): Promise<SolutionRow[] | null>;
  // returns null if requesterId is not a member of crewId
  ```
  Note: rows can only ever report "solved / attempted, verdict hidden" (`locked`) vs the real verdict (`visible`) vs no submission at all (`not_started`) — there's no persisted "currently attempting" state in this data; that's the existing PartyKit presence layer (`usePartyRoom`), out of scope here.
- Consumed by: the API route in this task, and the crew home page (Task 8).

- [ ] **Step 1: Write the failing test for `lib/crew-solutions.ts`**

```ts
// lib/crew-solutions.test.ts
import { describe, it, expect, vi } from "vitest";

const MEMBERS = [
  { crewId: "crew-1", userId: "me" },
  { crewId: "crew-1", userId: "friend" },
];
let subsForProblem: { userId: string; id: string; verdict: string; submittedAt: Date }[] = [];

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: { _: { name: string } }) => ({
        where: vi.fn(async () => (table._.name === "crew_members" ? MEMBERS : subsForProblem)),
      })),
    })),
  },
}));

describe("getCrewSolutionsForProblem", () => {
  it("returns null when the requester isn't a crew member", async () => {
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("stranger", "crew-1", "p1");
    expect(result).toBeNull();
  });

  it("shows the requester's own row and locks others when the requester hasn't submitted", async () => {
    subsForProblem = [{ userId: "friend", id: "sub-2", verdict: "accepted", submittedAt: new Date() }];
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("me", "crew-1", "p1");
    const me = result?.find((r) => r.userId === "me");
    const friend = result?.find((r) => r.userId === "friend");
    expect(me?.status).toBe("not_started");
    expect(friend?.status).toBe("locked");
  });

  it("unlocks everyone's real verdict once the requester has submitted", async () => {
    subsForProblem = [
      { userId: "me", id: "sub-1", verdict: "wrong_answer", submittedAt: new Date() },
      { userId: "friend", id: "sub-2", verdict: "accepted", submittedAt: new Date() },
    ];
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("me", "crew-1", "p1");
    const friend = result?.find((r) => r.userId === "friend");
    expect(friend?.status).toBe("visible");
    if (friend?.status === "visible") expect(friend.verdict).toBe("accepted");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/crew-solutions.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement `lib/crew-solutions.ts`**

```ts
// lib/crew-solutions.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { crewMembers, submissions } from "@/db/schema";

export type SolutionRow =
  | { userId: string; status: "not_started" }
  | { userId: string; status: "locked" }
  | { userId: string; status: "visible"; submissionId: string; verdict: string; submittedAt: string };

/**
 * Per-member solution status for one problem within one crew, gated: a
 * member's real verdict/time is only visible to a requester who has
 * submitted their own attempt on the same problem. Returns null if the
 * requester isn't a member of the crew.
 */
export async function getCrewSolutionsForProblem(
  requesterId: string,
  crewId: string,
  problemId: string,
): Promise<SolutionRow[] | null> {
  const members = await db.select().from(crewMembers).where(eq(crewMembers.crewId, crewId));
  const isMember = members.some((m) => m.userId === requesterId);
  if (!isMember) return null;

  const subs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.crewId, crewId), eq(submissions.problemId, problemId)));

  const latestByUser = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const existing = latestByUser.get(s.userId);
    if (!existing || s.submittedAt > existing.submittedAt) latestByUser.set(s.userId, s);
  }

  const unlocked = latestByUser.has(requesterId);

  return members.map((member): SolutionRow => {
    const latest = latestByUser.get(member.userId);
    if (!latest) return { userId: member.userId, status: "not_started" };
    if (member.userId === requesterId || unlocked) {
      return {
        userId: member.userId,
        status: "visible",
        submissionId: latest.id,
        verdict: latest.verdict,
        submittedAt: latest.submittedAt.toISOString(),
      };
    }
    return { userId: member.userId, status: "locked" };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/crew-solutions.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Write the failing test for the route wrapper**

```ts
// app/api/crew/[crewId]/problems/[problemId]/solutions/route.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/lib/crew-solutions", () => ({
  getCrewSolutionsForProblem: vi.fn(async (requesterId: string) =>
    requesterId === "stranger" ? null : [{ userId: "u1", status: "not_started" }],
  ),
}));

describe("GET /api/crew/[crewId]/problems/[problemId]/solutions", () => {
  it("returns 403 when the requester isn't a crew member", async () => {
    vi.mocked((await import("@/auth")).auth).mockResolvedValueOnce({ user: { id: "stranger" } } as never);
    const { GET } = await import("@/app/api/crew/[crewId]/problems/[problemId]/solutions/route");
    const req = new Request("http://localhost/api/crew/crew-1/problems/p1/solutions");
    const res = await GET(req as never, { params: { crewId: "crew-1", problemId: "p1" } } as never);
    expect(res.status).toBe(403);
  });

  it("returns rows for a crew member", async () => {
    const { GET } = await import("@/app/api/crew/[crewId]/problems/[problemId]/solutions/route");
    const req = new Request("http://localhost/api/crew/crew-1/problems/p1/solutions");
    const res = await GET(req as never, { params: { crewId: "crew-1", problemId: "p1" } } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- "app/api/crew/[crewId]/problems/[problemId]/solutions/route.test.ts"`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 7: Implement the route wrapper**

```ts
// app/api/crew/[crewId]/problems/[problemId]/solutions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";

export async function GET(
  req: NextRequest,
  { params }: { params: { crewId: string; problemId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getCrewSolutionsForProblem(session.user.id, params.crewId, params.problemId);
  if (rows === null) {
    return NextResponse.json({ error: "Not a member of this crew" }, { status: 403 });
  }

  return NextResponse.json({ rows });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- "app/api/crew/[crewId]/problems/[problemId]/solutions/route.test.ts"`
Expected: 2 passed.

- [ ] **Step 9: Commit**

```bash
git add lib/crew-solutions.ts lib/crew-solutions.test.ts \
  "app/api/crew/[crewId]/problems/[problemId]/solutions/route.ts" \
  "app/api/crew/[crewId]/problems/[problemId]/solutions/route.test.ts"
git commit -m "feat: add gated per-crew solution status for a problem"
```

---

### Task 6: Client-side checkpoint posting

**Files:**
- Modify: `app/crew/[crewId]/room/room-client.tsx:102-227`

**Interfaces:**
- Consumes: `POST /api/checkpoints` (Task 1).
- No new exports — this wires an existing component to the new endpoint. Not unit-tested: this project has no React component test setup (no `@testing-library/react`/jsdom), and adding one is out of scope for this plan. Verify manually per the step below.

- [ ] **Step 1: Add a checkpoint-post helper and a second debounce timer**

In `room-client.tsx`, right after the existing `const codeChangeTimeout = useRef<ReturnType<typeof setTimeout>>();` (line 102), add:

```ts
  const checkpointTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastCheckpointCodeRef = useRef(code);

  const postCheckpoint = useCallback(
    async (snapshotCode: string) => {
      if (snapshotCode === lastCheckpointCodeRef.current) return;
      lastCheckpointCodeRef.current = snapshotCode;
      try {
        await fetch("/api/checkpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: problem.id,
            crewId,
            code: snapshotCode,
            language: LANG_KEY[language] ?? "python",
          }),
        });
      } catch {
        // Best-effort: a missed checkpoint is a gap in the timeline, not a broken submit flow.
      }
    },
    [problem.id, crewId, language],
  );
```

- [ ] **Step 2: Debounce a checkpoint post from `handleCodeChange`**

Change the existing `handleCodeChange` (lines 118-128) from:

```ts
  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      updateStatus("coding");
      clearTimeout(codeChangeTimeout.current);
      codeChangeTimeout.current = setTimeout(() => {
        updateStatus("idle");
      }, 30000); // go idle after 30s of no changes
    },
    [updateStatus],
  );
```

to:

```ts
  const handleCodeChange = useCallback(
    (val: string) => {
      setCode(val);
      updateStatus("coding");
      clearTimeout(codeChangeTimeout.current);
      codeChangeTimeout.current = setTimeout(() => {
        updateStatus("idle");
      }, 30000); // go idle after 30s of no changes

      clearTimeout(checkpointTimeout.current);
      checkpointTimeout.current = setTimeout(() => {
        postCheckpoint(val);
      }, 25000); // one checkpoint per ~25s of active typing
    },
    [updateStatus, postCheckpoint],
  );
```

- [ ] **Step 3: Post a checkpoint immediately on Run**

In `handleRun` (starts at line 145), as the first line inside the `try` block, add a fire-and-forget call:

```ts
  const handleRun = useCallback(async () => {
    setRunStatus("running");
    setRunOutput(null);
    try {
      postCheckpoint(code);
      const res = await fetch("/api/judge0", {
```

(Only the added `postCheckpoint(code);` line and its position relative to the existing `try {` — the rest of `handleRun` is unchanged.) Add `postCheckpoint` to `handleRun`'s dependency array: `}, [code, language, activeCase, postCheckpoint]);`.

- [ ] **Step 4: Post a checkpoint immediately on Submit**

In `handleSubmit` (starts at line 182), as the first line inside the `try` block:

```ts
  const handleSubmit = useCallback(async () => {
    setRunStatus("submitting");
    setSubmitResults(null);
    setVerdict(null);
    setRuntime(null);
    try {
      postCheckpoint(code);
      const res = await fetch("/api/submit", {
```

Add `postCheckpoint` to `handleSubmit`'s dependency array: `}, [code, language, problem.id, crewId, postCheckpoint]);`.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open a crew room, type in the editor, and watch the Network tab: a `POST /api/checkpoints` should fire ~25s after you stop typing (or immediately on Run/Submit), and rapid edits within 10s of each other should not produce more than one request per 10s window. This step has no automated test — record in the commit message that it was manually verified, per this project's lack of a component-testing setup.

- [ ] **Step 7: Commit**

```bash
git add app/crew/\[crewId\]/room/room-client.tsx
git commit -m "feat: post code checkpoints on a debounce and on Run/Submit (manually verified in dev)"
```

---

### Task 7: Pulse Strip

**Files:**
- Create: `lib/pulse-strip-math.ts`
- Test: `lib/pulse-strip-math.test.ts`
- Create: `components/pulse-strip.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface WaveformCheckpoint { insertedChars: number; isPasteFlag: boolean; }
  interface WaveformPoint { x: number; y: number; isPasteFlag: boolean; }
  function computeWaveformPoints(checkpoints: WaveformCheckpoint[]): WaveformPoint[];
  ```
  and a component `<PulseStrip checkpoints={WaveformCheckpoint[]} />` rendering a 130×24 SVG polyline, colored `var(--accent)` normally and `#ff5d6c` if any checkpoint is flagged.
- Consumed by: Task 8 (crew log rows) and Task 9 (solution detail page).

- [ ] **Step 1: Write the failing tests for the pure function**

```ts
// lib/pulse-strip-math.test.ts
import { describe, it, expect } from "vitest";
import { computeWaveformPoints } from "@/lib/pulse-strip-math";

describe("computeWaveformPoints", () => {
  it("returns a flat two-point baseline for no checkpoints", () => {
    const points = computeWaveformPoints([]);
    expect(points).toHaveLength(2);
    expect(points[0].x).toBe(0);
    expect(points[1].x).toBe(130);
    expect(points[0].y).toBe(points[1].y);
  });

  it("returns one point per checkpoint when there's more than one", () => {
    const points = computeWaveformPoints([
      { insertedChars: 5, isPasteFlag: false },
      { insertedChars: 10, isPasteFlag: false },
      { insertedChars: 3, isPasteFlag: false },
    ]);
    expect(points).toHaveLength(3);
  });

  it("pushes a paste-flagged checkpoint to the top of the strip", () => {
    const points = computeWaveformPoints([
      { insertedChars: 5, isPasteFlag: false },
      { insertedChars: 500, isPasteFlag: true },
    ]);
    expect(points[1].y).toBeLessThan(points[0].y); // smaller y = higher on an SVG
    expect(points[1].isPasteFlag).toBe(true);
  });

  it("spans the full 0-130 width across all points", () => {
    const points = computeWaveformPoints([
      { insertedChars: 1, isPasteFlag: false },
      { insertedChars: 1, isPasteFlag: false },
      { insertedChars: 1, isPasteFlag: false },
    ]);
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(130);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/pulse-strip-math.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement the pure function**

```ts
// lib/pulse-strip-math.ts
export interface WaveformCheckpoint {
  insertedChars: number;
  isPasteFlag: boolean;
}

export interface WaveformPoint {
  x: number;
  y: number;
  isPasteFlag: boolean;
}

const WIDTH = 130;
const HEIGHT = 24;
const BASELINE = HEIGHT / 2;
const MAX_AMPLITUDE = HEIGHT / 2 - 2;

export function computeWaveformPoints(checkpoints: WaveformCheckpoint[]): WaveformPoint[] {
  if (checkpoints.length === 0) {
    return [
      { x: 0, y: BASELINE, isPasteFlag: false },
      { x: WIDTH, y: BASELINE, isPasteFlag: false },
    ];
  }

  const maxChars = Math.max(1, ...checkpoints.map((c) => c.insertedChars));
  const step = checkpoints.length === 1 ? 0 : WIDTH / (checkpoints.length - 1);

  return checkpoints.map((c, i) => {
    const amplitude = Math.min(1, c.insertedChars / maxChars) * MAX_AMPLITUDE;
    const direction = c.isPasteFlag ? 1 : i % 2 === 0 ? 0.6 : -0.6;
    const y = BASELINE - amplitude * direction;
    return {
      x: checkpoints.length === 1 ? WIDTH / 2 : i * step,
      y,
      isPasteFlag: c.isPasteFlag,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/pulse-strip-math.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Implement the component**

```tsx
// components/pulse-strip.tsx
"use client";

import { computeWaveformPoints, type WaveformCheckpoint } from "@/lib/pulse-strip-math";

export function PulseStrip({ checkpoints }: { checkpoints: WaveformCheckpoint[] }) {
  const points = computeWaveformPoints(checkpoints);
  const flagged = checkpoints.some((c) => c.isPasteFlag);
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width="130" height="24" viewBox="0 0 130 24" role="img" aria-label={flagged ? "Paste detected during solving" : "Typing timeline"}>
      <polyline points={pointsAttr} fill="none" stroke={flagged ? "#ff5d6c" : "var(--accent)"} strokeWidth="1.5" />
    </svg>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/pulse-strip-math.ts lib/pulse-strip-math.test.ts components/pulse-strip.tsx
git commit -m "feat: add Pulse Strip checkpoint waveform component"
```

---

### Task 8: Wire the crew home activity section to the gate

**Files:**
- Modify: `app/crew/[crewId]/page.tsx:9,28,37-46`

**Interfaces:**
- Consumes: `getCrewSolutionsForProblem` (Task 5), `PulseStrip` (Task 7) — checkpoints aren't fetched per-row here (that would be N+1 timeline lookups); this section shows status + verdict only, matching the approved mockups' crew-log row. Full checkpoints/Pulse Strip appear on the per-solution detail page (Task 9), linked from each unlocked row.

- [ ] **Step 1: Replace the activity data source**

In `app/crew/[crewId]/page.tsx`, change the import line:

```ts
import { getTodaysProblem, getWeeklyProblems, getCrewActivity } from "@/lib/problems";
```

to:

```ts
import { getTodaysProblem, getWeeklyProblems } from "@/lib/problems";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";
```

Replace this line:

```ts
  const recentActivity = await getCrewActivity(params.crewId);
```

with:

```ts
  const crewSolutions = (await getCrewSolutionsForProblem(session.user.id, params.crewId, todaysProblem.id)) ?? [];
```

(`todaysProblem` must be defined above this line — it already is, from the existing `const todaysProblem = await getTodaysProblem(params.crewId);` a few lines up.)

- [ ] **Step 2: Replace the activity-feed rendering**

Replace this block:

```ts
  // Build activity feed from real data (fallback to static if none)
  const activity = recentActivity.length > 0
    ? recentActivity.slice(0, 8).map((sub) => ({
        who: "member",
        what: `${sub.verdict === "accepted" ? "solved" : "attempted"} a problem`,
        when: getTimeAgo(sub.submittedAt),
      }))
    : [
        { who: "crew", what: "waiting for first submission", when: "today" },
      ];
```

with:

```ts
  const activity = crewSolutions.map((row) => {
    if (row.status === "not_started") {
      return { userId: row.userId, label: "not started", link: null };
    }
    if (row.status === "locked") {
      return { userId: row.userId, label: "locked — submit today's problem to see this", link: null };
    }
    const verb = row.verdict === "accepted" ? "solved" : "attempted";
    return {
      userId: row.userId,
      label: `${verb} · ${getTimeAgo(new Date(row.submittedAt))}`,
      link: `/crew/${params.crewId}/problems/${todaysProblem.id}/solutions/${row.userId}`,
    };
  });
```

Then update the JSX further down that maps over `activity` — change:

```tsx
          {activity.map((a, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "13px 0", borderTop: "1px solid var(--line)" }}
            >
              <span style={{ fontSize: "10.5px", color: "var(--accent)", width: 74, flex: "none", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {a.who}
              </span>
              <span style={{ fontSize: "12.5px", lineHeight: 1.5, flex: 1, color: "var(--fg)" }}>{a.what}</span>
              <span style={{ fontSize: "10.5px", color: "var(--muted)", whiteSpace: "nowrap", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {a.when}
              </span>
            </div>
          ))}
```

to:

```tsx
          {activity.map((a) => (
            <div
              key={a.userId}
              style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "13px 0", borderTop: "1px solid var(--line)" }}
            >
              <span style={{ fontSize: "12.5px", lineHeight: 1.5, flex: 1, color: "var(--fg)" }}>{a.label}</span>
              {a.link && (
                <Link
                  href={a.link}
                  style={{ fontSize: "10.5px", color: "var(--accent)", whiteSpace: "nowrap", letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  view →
                </Link>
              )}
            </div>
          ))}
```

`Link` is already imported at the top of this file (`import Link from "next/link";`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open a crew home page. Before submitting today's problem yourself, other members' rows should read "locked — submit today's problem to see this" with no link. After submitting (in mock mode, no `JUDGE0_URL` needed), your own row updates and others' rows should unlock with a "view →" link.

- [ ] **Step 4: Commit**

```bash
git add "app/crew/[crewId]/page.tsx"
git commit -m "feat: wire crew home activity feed to the gated per-problem solution status"
```

---

### Task 9: Solution detail page

**Files:**
- Create: `app/crew/[crewId]/problems/[problemId]/solutions/[userId]/page.tsx`

**Interfaces:**
- Consumes: `getSubmissionTimeline` (Task 4) — but that function takes a `submissionId`, not a `userId`, so this page first needs the target user's latest submission id for the problem. Reuses `getCrewSolutionsForProblem` (Task 5) for that, which already carries the gate.

- [ ] **Step 1: Implement the page**

```tsx
// app/crew/[crewId]/problems/[problemId]/solutions/[userId]/page.tsx
import { notFound } from "next/navigation";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";
import { getSubmissionTimeline } from "@/lib/submission-timeline";
import { PulseStrip } from "@/components/pulse-strip";

export default async function SolutionDetailPage({
  params,
}: {
  params: { crewId: string; problemId: string; userId: string };
}) {
  const session = await requireSession();
  await requireCrewMember(session.user.id, params.crewId);

  const rows = await getCrewSolutionsForProblem(session.user.id, params.crewId, params.problemId);
  const row = rows?.find((r) => r.userId === params.userId);

  if (!row || row.status !== "visible") {
    // Covers: not a crew member (rows is null — requireCrewMember above already
    // redirects that case), no submission yet, or still locked for this viewer.
    notFound();
  }

  const timeline = await getSubmissionTimeline(session.user.id, row.submissionId);
  if (!timeline.ok) {
    notFound();
  }

  const latestCode = timeline.checkpoints.at(-1)?.code ?? "";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 28px" }}>
      <div style={{ fontSize: "10.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
        {row.verdict} · {timeline.timeSpentLabel}
      </div>
      <div style={{ marginBottom: 24 }}>
        <PulseStrip checkpoints={timeline.checkpoints} />
      </div>
      <pre
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          padding: 20,
          fontSize: 12.5,
          lineHeight: 1.6,
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {latestCode}
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. From the crew home page, after unlocking (submit today's problem yourself), click a "view →" link on an unlocked row. Confirm the page shows the verdict, time-spent label, Pulse Strip, and code. Directly visiting the same URL for a still-locked row (before submitting) should 404, not show data.

- [ ] **Step 4: Commit**

```bash
git add "app/crew/[crewId]/problems/[problemId]/solutions/[userId]/page.tsx"
git commit -m "feat: add gated solution detail page with code, time spent, and Pulse Strip"
```

---

## Plan Self-Review

- **Spec coverage:** "Solution + time transparency (submit-gated)" → Tasks 5, 8, 9. "Code checkpoint timeline (Pulse Strip)" → Tasks 1, 2, 3, 4, 6, 7. Every task traces to spec Flow 2 or Flow 3.
- **Placeholder scan:** no TBD/TODO; every step has real code. Task 6's "no automated test" is explicit and justified (no component-testing setup exists), not a silently skipped requirement.
- **Type consistency:** `SolutionRow`'s three-variant shape (Task 5) is consumed identically in Task 8 (`row.status === "visible"`/`"locked"`/`"not_started"`) and Task 9 (`row.status !== "visible"` guard before using `row.submissionId`, which only exists on the `"visible"` variant — TypeScript enforces this via the discriminated union). `WaveformCheckpoint` (Task 7) matches the `{ insertedChars, isPasteFlag }` shape already present on `TimelineResult.checkpoints` (Task 4), so `<PulseStrip checkpoints={timeline.checkpoints} />` in Task 9 type-checks without adapting the data.
