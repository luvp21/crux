import { describe, it, expect, vi, beforeEach } from "vitest";
import { crews, problems, crewMembers } from "@/db/schema";

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
    returning: vi.fn(async () => [{ id: "new-challenge", ...vals }]),
  })),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.selectImpl,
    insert: vi.fn(() => ({
      values: mocks.insertValues,
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  },
}));

describe("GET /api/cron/daily", () => {
  beforeEach(() => {
    mocks.selectImpl.mockReset();
    mocks.selectImpl.mockImplementation(() => ({ from: vi.fn(defaultFrom) }));
    mocks.insertValues.mockClear();
  });

  it("is reachable and returns 200 with a per-crew summary", async () => {
    const { GET } = await import("@/app/api/cron/daily/route");
    const req = new Request("http://localhost/api/cron/daily");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("crewsProcessed");
  });

  it("processes a crew with a matching problem and inserts a challenge scoped to that crew", async () => {
    // Non-empty crews/problems fixtures so the per-crew loop body actually runs:
    // no existing challenge for tomorrow, no preference set, one problem available.
    mocks.selectImpl.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table === crews) {
          return arrayWithChain([{ id: "crew-1", currentStreak: 3 }]);
        }
        if (table === problems) {
          return arrayWithChain([{ id: "p1", topicTag: "arrays", difficulty: "easy" }]);
        }
        if (table === crewMembers) {
          return arrayWithChain([], { where: vi.fn(async () => []) });
        }
        // challenges (tomorrow/today lookups) and crewChallengePreferences: nothing
        // exists yet, so the handler proceeds to pick a problem and insert.
        return defaultFrom();
      }),
    }));

    const { GET } = await import("@/app/api/cron/daily/route");
    const req = new Request("http://localhost/api/cron/daily");
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crewsProcessed).toBe(1);
    expect(body.challengesCreated).toBe(1);

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ crewId: "crew-1", problemId: "p1", type: "daily" }),
    );
  });
});
