import { describe, it, expect, vi } from "vitest";
import { getTableName } from "drizzle-orm";

const SUBMISSION = { id: "sub-1", userId: "owner", problemId: "p1", submittedAt: new Date("2026-08-02T10:41:00Z") };
const CHECKPOINTS = [
  { code: "a", createdAt: new Date("2026-08-02T10:20:00Z"), insertedChars: 1, isPasteFlag: false },
];

let ownAttemptRows: unknown[] = [];
// Counts `.limit()` calls against the `submissions` table within a single
// `getSubmissionTimeline` invocation. The gate issues up to two such queries
// in sequence — (1) fetch the submission by id, (2) check the requester's own
// attempt on the same problem — both against the *same* table. Dispatching on
// table identity alone (as the brief's original mock did via `table._.name`)
// can't tell these two calls apart and silently converges both to the same
// rows, which lets the 403 case pass even when it shouldn't. Call order,
// reset per test, is what actually distinguishes them.
let submissionsCallCount = 0;

// `table._.name` (as suggested by some drizzle examples) does not work against
// the installed drizzle-orm version here — a table object's internal name lives
// under a symbol (`Symbol(drizzle:Name)`), not a `_` property. We dispatch on
// the real table identity via drizzle's own `getTableName` helper instead.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: object) => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            if (getTableName(table as never) !== "submissions") return [];
            submissionsCallCount += 1;
            return submissionsCallCount === 1 ? [SUBMISSION] : ownAttemptRows;
          }),
          orderBy: vi.fn(async () => CHECKPOINTS),
        })),
      })),
    })),
  },
}));

describe("getSubmissionTimeline", () => {
  it("returns the timeline for the submission's own author", async () => {
    submissionsCallCount = 0;
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("owner", "sub-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.timeSpentLabel).toBe("21m");
      expect(result.checkpoints).toHaveLength(1);
    }
  });

  it("returns 403 for a crewmate who hasn't submitted their own attempt", async () => {
    submissionsCallCount = 0;
    ownAttemptRows = [];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows a crewmate who has submitted their own attempt", async () => {
    submissionsCallCount = 0;
    ownAttemptRows = [{ id: "sub-2" }];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(true);
  });
});
