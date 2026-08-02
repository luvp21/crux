import { describe, it, expect, vi, beforeEach } from "vitest";
import { crews, problems, crewMembers, challenges } from "@/db/schema";

// Drizzle's `.from()` and `.where()` are each independently awaitable (they resolve
// to rows directly) while also being chainable to `.where()`/`.limit()`. Model that by
// returning an empty array with the next chain method attached, so `await db.select().from(x)`
// resolves to `[]` and `db.select().from(x).where(y)` still supports `.limit()`.
function arrayWithChain(rows: unknown[] = [], chain: Record<string, unknown> = {}) {
  return Object.assign([...rows], chain);
}

// route.ts calls `db.select().from(challenges).where(and(eq(challenges.crewId, crew.id), ...))`
// twice per crew (the tomorrow-existing check and the today-challenge lookup) to decide whether
// to create a challenge. To make a test that can actually fail if `eq(challenges.crewId, crew.id)`
// is dropped from either predicate, the mock needs to inspect *which crew* is being queried rather
// than just returning a fixed array regardless of arguments. Real drizzle `eq`/`and` build an
// opaque SQL AST that's impractical to walk here, so `drizzle-orm`'s `eq`/`and` are replaced with
// plain, inspectable marker objects — only for this test file — and the fixture below filters by
// whichever columns actually appear in the predicate, the same way a real `WHERE` clause would (a
// dropped column means the condition on it silently stops filtering, which is exactly the
// regression this guards against). Ported from app/api/cron/weekly/route.test.ts.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ __eq: true, column, value }),
    and: (...conditions: unknown[]) => ({ __and: true, conditions }),
  } as unknown as typeof import("drizzle-orm");
});

interface MockEqCondition {
  column: unknown;
  value: unknown;
}

function isEqMarker(condition: unknown): condition is { __eq: true; column: unknown; value: unknown } {
  return typeof condition === "object" && condition !== null && (condition as { __eq?: unknown }).__eq === true;
}

function isAndMarker(condition: unknown): condition is { __and: true; conditions: unknown[] } {
  return typeof condition === "object" && condition !== null && (condition as { __and?: unknown }).__and === true;
}

// Flattens a mocked `and(eq(...), eq(...))` predicate into its individual `eq` conditions.
function extractEqConditions(predicate: unknown): MockEqCondition[] {
  if (isEqMarker(predicate)) return [{ column: predicate.column, value: predicate.value }];
  if (isAndMarker(predicate)) return predicate.conditions.flatMap(extractEqConditions);
  return [];
}

// Mirrors real `WHERE` semantics against an in-memory fixture: a row matches only if it agrees
// with every *tracked* column that actually appears in the predicate. Columns absent from
// `columnFieldMap` are untracked by the fixture and don't filter (permissive), but columns
// present in the map that are missing from the predicate simply impose no constraint — which is
// the point: if `eq(challenges.crewId, crew.id)` is dropped from route.ts, the `crewId` column
// never enters the predicate, so this stops discriminating between crews and rows leak across
// crew boundaries, same as a real un-scoped SQL query would.
function rowMatchesConditions(
  row: Record<string, unknown>,
  conditions: MockEqCondition[],
  columnFieldMap: Map<unknown, string>,
): boolean {
  return conditions.every(({ column, value }) => {
    const field = columnFieldMap.get(column);
    if (!field) return true;
    return row[field] === value;
  });
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
    expect(body).toHaveProperty("crewsFailed");
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
    expect(body.crewsFailed).toBe(0);

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ crewId: "crew-1", problemId: "p1", type: "daily" }),
    );
  });

  it("skips a crew that already has tomorrow's challenge and only creates one for the crew that doesn't (crewId-scoped)", async () => {
    // Crew A already has an existing daily-challenge row (standing in for "tomorrow's" row —
    // see rowMatchesConditions/extractEqConditions above for why the fixture only needs to carry
    // crewId/type, not the exact challengeDate route.ts computes internally). Crew B has none.
    const existingChallenges = [{ crewId: "crew-a", type: "daily" }];
    const challengesColumnFieldMap = new Map<unknown, string>([
      [challenges.crewId, "crewId"],
      [challenges.type, "type"],
    ]);

    mocks.selectImpl.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table === crews) {
          return arrayWithChain([
            { id: "crew-a", currentStreak: 1 },
            { id: "crew-b", currentStreak: 2 },
          ]);
        }
        if (table === problems) {
          return arrayWithChain([{ id: "p1", topicTag: "arrays", difficulty: "easy" }]);
        }
        if (table === crewMembers) {
          return arrayWithChain([], { where: vi.fn(async () => []) });
        }
        if (table === challenges) {
          return arrayWithChain([], {
            where: vi.fn((predicate: unknown) => {
              const conditions = extractEqConditions(predicate);
              const matches = existingChallenges.filter((row) =>
                rowMatchesConditions(row, conditions, challengesColumnFieldMap),
              );
              return arrayWithChain(matches, {
                limit: vi.fn(async () => matches.slice(0, 1)),
              });
            }),
          });
        }
        // crewChallengePreferences: nothing set for either crew.
        return defaultFrom();
      }),
    }));

    const { GET } = await import("@/app/api/cron/daily/route");
    const req = new Request("http://localhost/api/cron/daily");
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crewsProcessed).toBe(2);
    // Only crew B (no existing challenge) should get a new challenge; crew A is skipped.
    expect(body.challengesCreated).toBe(1);
    expect(body.crewsFailed).toBe(0);

    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ crewId: "crew-b", type: "daily" }),
    );
  });

  it("isolates a per-crew failure: one crew erroring doesn't stop the rest from being processed", async () => {
    mocks.selectImpl.mockImplementation(() => ({
      from: vi.fn((table: unknown) => {
        if (table === crews) {
          return arrayWithChain([{ id: "crew-fail" }, { id: "crew-ok" }]);
        }
        if (table === problems) {
          return arrayWithChain([{ id: "p1", topicTag: "arrays", difficulty: "easy" }]);
        }
        if (table === crewMembers) {
          return arrayWithChain([], {
            where: vi.fn(async (predicate: unknown) => {
              const conditions = extractEqConditions(predicate);
              const crewIdCondition = conditions.find((c) => c.value === "crew-fail");
              if (crewIdCondition) throw new Error("simulated per-crew DB failure");
              return [];
            }),
          });
        }
        return defaultFrom();
      }),
    }));

    const { GET } = await import("@/app/api/cron/daily/route");
    const req = new Request("http://localhost/api/cron/daily");
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crewsFailed).toBe(1);
    expect(body.crewsProcessed).toBe(1);

    // crew-ok's challenge still gets created despite crew-fail's error.
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ crewId: "crew-ok", type: "daily" }),
    );
  });
});
