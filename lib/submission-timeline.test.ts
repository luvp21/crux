import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

// We dispatch by decoding the real SQL predicate passed to `where()` (via
// drizzle's PgDialect) rather than by table identity or call order alone.
// `getSubmissionTimeline` now delegates the crewmate-access check to
// `canViewSolution` (lib/solution-gate.ts), which issues its own
// `crew_members` and `submissions` queries with different predicate shapes
// than the initial "fetch submission by id" query — predicate-based dispatch
// is what actually distinguishes them, and what would catch a regression
// that drops the crewId condition (finding #6).
const dialect = new PgDialect();

const SUBMISSION = {
  id: "sub-1",
  userId: "owner",
  problemId: "p1",
  crewId: "crew-1",
  code: "print('hello')",
  submittedAt: new Date("2026-08-02T10:41:00Z"),
};
const CHECKPOINTS = [
  { code: "a", createdAt: new Date("2026-08-02T10:20:00Z"), insertedChars: 1, isPasteFlag: false },
];

let membership: { userId: string; crewId: string }[] = [];
let ownSubmissions: { userId: string; crewId: string; problemId: string }[] = [];

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: object) => {
        const tableName = getTableName(table as never);
        return {
          where: vi.fn((cond: unknown) => {
            const { params } = dialect.sqlToQuery(cond as never);
            return {
              limit: vi.fn(async () => {
                if (tableName === "crew_members") {
                  const [userId, crewId] = params as string[];
                  return membership.filter((m) => m.userId === userId && m.crewId === crewId);
                }
                // submissions table: either "fetch by id" (1 param) or
                // canViewSolution's own-attempt check (3 params).
                if (params.length === 1) {
                  const [id] = params as string[];
                  return id === SUBMISSION.id ? [SUBMISSION] : [];
                }
                const [userId, crewId, problemId] = params as string[];
                return ownSubmissions.filter(
                  (s) => s.userId === userId && s.crewId === crewId && s.problemId === problemId,
                );
              }),
              orderBy: vi.fn(async () => CHECKPOINTS),
            };
          }),
        };
      }),
    })),
  },
}));

describe("getSubmissionTimeline", () => {
  beforeEach(() => {
    membership = [];
    ownSubmissions = [];
  });

  it("returns the timeline (including the submitted code) for the submission's own author", async () => {
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("owner", "sub-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toBe(SUBMISSION.code);
      expect(result.timeSpentLabel).toBe("21m");
      expect(result.checkpoints).toHaveLength(1);
    }
  });

  it("returns 403 for a crewmate who hasn't submitted their own attempt", async () => {
    membership = [{ userId: "other-user", crewId: "crew-1" }];
    ownSubmissions = [];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows a crewmate who has submitted their own attempt in the submission's crew", async () => {
    membership = [{ userId: "other-user", crewId: "crew-1" }];
    ownSubmissions = [{ userId: "other-user", crewId: "crew-1", problemId: "p1" }];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(true);
  });

  it("denies a requester whose only submission for this problem is in a DIFFERENT crew than the submission (cross-crew denial)", async () => {
    membership = [{ userId: "other-user", crewId: "crew-1" }];
    // Submitted the same problem, but in crew-2 — not the submission's own crew-1.
    ownSubmissions = [{ userId: "other-user", crewId: "crew-2", problemId: "p1" }];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("denies a requester who has a matching submission but has since left the submission's crew", async () => {
    membership = []; // no longer a member anywhere
    ownSubmissions = [{ userId: "other-user", crewId: "crew-1", problemId: "p1" }];
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("other-user", "sub-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("returns 404 for a nonexistent submission", async () => {
    const { getSubmissionTimeline } = await import("@/lib/submission-timeline");
    const result = await getSubmissionTimeline("owner", "does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });
});
