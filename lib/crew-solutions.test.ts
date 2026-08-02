import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableName } from "drizzle-orm";

const MEMBERS = [
  { crewId: "crew-1", userId: "me" },
  { crewId: "crew-1", userId: "friend" },
];
let subsForProblem: { userId: string; id: string; verdict: string; submittedAt: Date }[] = [];

// `table._.name` (as suggested by some drizzle examples) does not work against
// the installed drizzle-orm version here — a table object's internal name lives
// under a symbol (`Symbol(drizzle:Name)`), not a `_` property. We dispatch on
// the real table identity via drizzle's own `getTableName` helper instead, as
// established in lib/submission-timeline.test.ts. Unlike that sibling case,
// getCrewSolutionsForProblem queries each table (crew_members, submissions)
// exactly once, so table-identity dispatch alone genuinely distinguishes the
// two queries here — no call-count tracking needed.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: object) => ({
        where: vi.fn(async () => (getTableName(table as never) === "crew_members" ? MEMBERS : subsForProblem)),
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
