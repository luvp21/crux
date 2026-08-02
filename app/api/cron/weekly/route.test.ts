import { describe, it, expect, vi, beforeEach } from "vitest";
import { crews, problems } from "@/db/schema";

// Drizzle's `.from()` and `.where()` are each independently awaitable (they resolve
// to rows directly) while also being chainable to `.where()`/`.limit()`. Model that by
// returning an empty array with the next chain method attached, so `await db.select().from(x)`
// resolves to `[]` and `db.select().from(x).where(y)` still supports `.limit()`.
function arrayWithChain(rows: unknown[] = [], chain: Record<string, unknown> = {}) {
  return Object.assign([...rows], chain);
}

// Default `.from()` behavior: any table resolves to an empty array, whether awaited
// directly or chained through `.where().limit()`.
function defaultFrom() {
  return arrayWithChain([], {
    where: vi.fn(() =>
      arrayWithChain([], {
        limit: vi.fn(async () => []),
      }),
    ),
  });
}

const mocks = vi.hoisted(() => ({
  selectImpl: vi.fn(),
  insertValues: vi.fn((vals: Record<string, unknown>) => ({
    returning: vi.fn(async () => [{ id: "new-weekly-challenge", ...vals }]),
  })),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.selectImpl,
    insert: vi.fn(() => ({
      values: mocks.insertValues,
    })),
  },
}));

describe("GET /api/cron/weekly", () => {
  beforeEach(() => {
    mocks.selectImpl.mockReset();
    mocks.selectImpl.mockImplementation(() => ({ from: vi.fn(defaultFrom) }));
    mocks.insertValues.mockClear();
  });

  it("is reachable and returns 200 with a per-crew summary", async () => {
    const { GET } = await import("@/app/api/cron/weekly/route");
    const req = new Request("http://localhost/api/cron/weekly");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("crewsProcessed");
  });

  it("processes a crew and inserts 3 weekly challenges scoped to that crew", async () => {
    // Non-empty crews/problems fixtures so the per-crew loop body actually runs:
    // no existing weekly challenge for the target week, no preference set, three
    // distinct problems available (enough to fill PROBLEMS_PER_WEEK without running
    // out of pool).
    mocks.selectImpl.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table === crews) {
          return arrayWithChain([{ id: "crew-1", currentStreak: 3 }]);
        }
        if (table === problems) {
          return arrayWithChain([
            { id: "p1", topicTag: "arrays", difficulty: "easy" },
            { id: "p2", topicTag: "graphs", difficulty: "medium" },
            { id: "p3", topicTag: "dp", difficulty: "hard" },
          ]);
        }
        // challenges (existing-weekly-set lookup) and crewChallengePreferences:
        // nothing exists yet, so the handler proceeds to pick problems and insert.
        return defaultFrom();
      }),
    }));

    const { GET } = await import("@/app/api/cron/weekly/route");
    const req = new Request("http://localhost/api/cron/weekly");
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crewsProcessed).toBe(1);
    expect(body.challengesCreated).toBe(3);

    expect(mocks.insertValues).toHaveBeenCalledTimes(3);
    for (const call of mocks.insertValues.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({ crewId: "crew-1", type: "weekly" }),
      );
    }

    // The three inserted problemIds should be distinct (no duplicate picks within
    // the same crew's weekly set).
    const insertedProblemIds = mocks.insertValues.mock.calls.map((call) => call[0].problemId);
    expect(new Set(insertedProblemIds).size).toBe(3);
  });
});
