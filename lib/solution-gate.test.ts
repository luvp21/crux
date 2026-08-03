import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

// We dispatch mock responses by actually decoding the SQL predicate passed to
// `where()` (via drizzle's own PgDialect), not just by table identity or call
// order. That way a regression that drops the crewId condition (or swaps
// argument order) fails these tests instead of silently passing against
// canned data — see finding #6 in the final-review fix wave.
const dialect = new PgDialect();

let membership: { userId: string; crewId: string }[] = [];
let ownSubmissions: { userId: string; crewId: string; problemId: string }[] = [];

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: object) => ({
        where: vi.fn((cond: unknown) => ({
          limit: vi.fn(async () => {
            const { params } = dialect.sqlToQuery(cond as never);
            if (getTableName(table as never) === "crew_members") {
              const [userId, crewId] = params as string[];
              return membership.filter((m) => m.userId === userId && m.crewId === crewId);
            }
            const [userId, crewId, problemId] = params as string[];
            return ownSubmissions.filter(
              (s) => s.userId === userId && s.crewId === crewId && s.problemId === problemId,
            );
          }),
        })),
      })),
    })),
  },
}));

describe("canViewSolution", () => {
  beforeEach(() => {
    membership = [];
    ownSubmissions = [];
  });

  it("denies a requester who isn't a member of the crew at all", async () => {
    const { canViewSolution } = await import("@/lib/solution-gate");
    expect(await canViewSolution("stranger", "crew-1", "p1")).toBe(false);
  });

  it("denies a crew member who has never submitted the problem", async () => {
    membership = [{ userId: "me", crewId: "crew-1" }];
    const { canViewSolution } = await import("@/lib/solution-gate");
    expect(await canViewSolution("me", "crew-1", "p1")).toBe(false);
  });

  it("denies a member whose only submission for this problem is in a DIFFERENT crew (cross-crew denial)", async () => {
    membership = [
      { userId: "me", crewId: "crew-1" },
      { userId: "me", crewId: "crew-2" },
    ];
    ownSubmissions = [{ userId: "me", crewId: "crew-2", problemId: "p1" }];
    const { canViewSolution } = await import("@/lib/solution-gate");
    expect(await canViewSolution("me", "crew-1", "p1")).toBe(false);
  });

  it("allows a member with a matching submission in the requested crew", async () => {
    membership = [{ userId: "me", crewId: "crew-2" }];
    ownSubmissions = [{ userId: "me", crewId: "crew-2", problemId: "p1" }];
    const { canViewSolution } = await import("@/lib/solution-gate");
    expect(await canViewSolution("me", "crew-2", "p1")).toBe(true);
  });

  it("denies a former member who has a matching submission but is no longer in the crew", async () => {
    membership = []; // left the crew
    ownSubmissions = [{ userId: "me", crewId: "crew-1", problemId: "p1" }];
    const { canViewSolution } = await import("@/lib/solution-gate");
    expect(await canViewSolution("me", "crew-1", "p1")).toBe(false);
  });
});
