import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

// We dispatch mock responses by decoding the real SQL predicate passed to
// `where()` (via drizzle's own PgDialect), not just by table identity —
// `getCrewSolutionsForProblem` now also calls `canViewSolution`
// (lib/solution-gate.ts) internally, which issues its own `crew_members` and
// `submissions` queries with different predicate shapes than this module's
// own bulk queries. Predicate-based dispatch is what would actually catch a
// regression that drops the crewId condition (finding #6).
const dialect = new PgDialect();

const MEMBERS = [
  { crewId: "crew-1", userId: "me" },
  { crewId: "crew-1", userId: "friend" },
];
let subsForProblem: {
  userId: string;
  id: string;
  verdict: string;
  submittedAt: Date;
  crewId: string;
  problemId: string;
}[] = [];

/** Makes a value both directly awaitable and `.limit()`-chainable, since
 * this module's own queries `await ...where(cond)` directly while
 * `canViewSolution`'s queries chain `.limit(1)` off the same call shape. */
function thenableWithLimit<T>(rows: T[]) {
  const p = Promise.resolve(rows) as Promise<T[]> & { limit: (n: number) => Promise<T[]> };
  p.limit = (n: number) => Promise.resolve(rows.slice(0, n));
  return p;
}

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: object) => ({
        where: vi.fn((cond: unknown) => {
          const tableName = getTableName(table as never);
          const { params } = dialect.sqlToQuery(cond as never);

          if (tableName === "crew_members") {
            if (params.length === 1) {
              // Bulk roster query: where(eq(crewMembers.crewId, crewId))
              const [crewId] = params as string[];
              return thenableWithLimit(MEMBERS.filter((m) => m.crewId === crewId));
            }
            // canViewSolution membership check: where(and(eq(userId), eq(crewId)))
            const [userId, crewId] = params as string[];
            return thenableWithLimit(MEMBERS.filter((m) => m.userId === userId && m.crewId === crewId));
          }

          // submissions table
          if (params.length === 2) {
            // Bulk subs-for-problem query: where(and(eq(crewId), eq(problemId)))
            const [crewId, problemId] = params as string[];
            return thenableWithLimit(
              subsForProblem.filter((s) => s.crewId === crewId && s.problemId === problemId),
            );
          }
          // canViewSolution own-submission check: where(and(eq(userId), eq(crewId), eq(problemId)))
          const [userId, crewId, problemId] = params as string[];
          return thenableWithLimit(
            subsForProblem.filter(
              (s) => s.userId === userId && s.crewId === crewId && s.problemId === problemId,
            ),
          );
        }),
      })),
    })),
  },
}));

describe("getCrewSolutionsForProblem", () => {
  beforeEach(() => {
    subsForProblem = [];
  });

  it("returns null when the requester isn't a crew member", async () => {
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("stranger", "crew-1", "p1");
    expect(result).toBeNull();
  });

  it("shows the requester's own row and locks others when the requester hasn't submitted", async () => {
    subsForProblem = [
      { userId: "friend", id: "sub-2", verdict: "accepted", submittedAt: new Date(), crewId: "crew-1", problemId: "p1" },
    ];
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("me", "crew-1", "p1");
    const me = result?.find((r) => r.userId === "me");
    const friend = result?.find((r) => r.userId === "friend");
    expect(me?.status).toBe("not_started");
    expect(friend?.status).toBe("locked");
  });

  it("unlocks everyone's real verdict once the requester has submitted", async () => {
    subsForProblem = [
      { userId: "me", id: "sub-1", verdict: "wrong_answer", submittedAt: new Date(), crewId: "crew-1", problemId: "p1" },
      { userId: "friend", id: "sub-2", verdict: "accepted", submittedAt: new Date(), crewId: "crew-1", problemId: "p1" },
    ];
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("me", "crew-1", "p1");
    const friend = result?.find((r) => r.userId === "friend");
    expect(friend?.status).toBe("visible");
    if (friend?.status === "visible") expect(friend.verdict).toBe("accepted");
  });

  it("keeps everyone locked when the requester's only submission for this problem is in a DIFFERENT crew (cross-crew denial)", async () => {
    subsForProblem = [
      // "me" submitted this problem, but tagged to crew-2, not the crew-1 being viewed.
      { userId: "me", id: "sub-x", verdict: "accepted", submittedAt: new Date(), crewId: "crew-2", problemId: "p1" },
      { userId: "friend", id: "sub-2", verdict: "accepted", submittedAt: new Date(), crewId: "crew-1", problemId: "p1" },
    ];
    const { getCrewSolutionsForProblem } = await import("@/lib/crew-solutions");
    const result = await getCrewSolutionsForProblem("me", "crew-1", "p1");
    const me = result?.find((r) => r.userId === "me");
    const friend = result?.find((r) => r.userId === "friend");
    expect(me?.status).toBe("not_started");
    expect(friend?.status).toBe("locked");
  });
});
