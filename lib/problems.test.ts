import { describe, it, expect, vi } from "vitest";
import { Column, getTableName } from "drizzle-orm";
import { Param } from "drizzle-orm/sql";

// Two crews, each with their own daily challenge pointing at a different
// problem. If `getTodaysProblem` ever stopped filtering by crewId, both
// crews would resolve to the same (first-matching) challenge/problem —
// which is exactly what this test is designed to catch.
const TODAY = new Date().toISOString().slice(0, 10);

// Rows use the camelCase shape drizzle returns to application code (this is
// what `lib/problems.ts` reads via `challenge.problemId`, `problem.title`, etc).
const CHALLENGES = [
  { id: "ch-1", crewId: "crew-1", type: "daily", challengeDate: TODAY, problemId: "p1" },
  { id: "ch-2", crewId: "crew-2", type: "daily", challengeDate: TODAY, problemId: "p2" },
];

const PROBLEMS = [
  {
    id: "p1",
    title: "Two Sum",
    difficulty: "easy",
    topicTag: "arrays",
    description: "desc",
    examples: [],
    constraints: "",
    starterCode: {},
    testCases: [],
  },
  {
    id: "p2",
    title: "Merge Intervals",
    difficulty: "medium",
    topicTag: "intervals",
    description: "desc",
    examples: [],
    constraints: "",
    starterCode: {},
    testCases: [],
  },
];

/** Convert a db column name (snake_case) to the camelCase key drizzle exposes on rows. */
function toCamelCase(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Walk a drizzle `and(eq(...), eq(...), ...)` (or bare `eq(...)`) condition
 * tree and pull out the {column, value} equality pairs it's built from.
 * This lets the fake `.where()` below apply the *real* filter the
 * production code constructed, instead of a canned stand-in — so dropping
 * the crewId condition from the query actually breaks the test.
 */
function extractEqFilters(node: unknown, acc: { column: string; value: unknown }[] = []) {
  if (!node || typeof node !== "object") return acc;
  const chunks = (node as { queryChunks?: unknown[] }).queryChunks;
  if (!chunks) return acc;

  let pendingColumn: string | null = null;
  for (const chunk of chunks) {
    if (chunk instanceof Column) {
      pendingColumn = chunk.name;
    } else if (chunk instanceof Param) {
      if (pendingColumn) {
        acc.push({ column: pendingColumn, value: chunk.value });
        pendingColumn = null;
      }
    } else if (chunk && typeof chunk === "object" && "queryChunks" in chunk) {
      extractEqFilters(chunk, acc);
    }
  }
  return acc;
}

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: Parameters<typeof getTableName>[0]) => {
        const rows = getTableName(table) === "challenges" ? CHALLENGES : PROBLEMS;
        return {
          where: vi.fn((condition: unknown) => {
            const filters = extractEqFilters(condition);
            const matched = rows.filter((row) =>
              filters.every((f) => (row as Record<string, unknown>)[toCamelCase(f.column)] === f.value),
            );
            return {
              limit: vi.fn(async (n: number) => matched.slice(0, n)),
            };
          }),
        };
      }),
    })),
  },
}));

describe("getTodaysProblem", () => {
  it("scopes crew-1's lookup to crew-1's challenge and problem", async () => {
    const { getTodaysProblem } = await import("@/lib/problems");
    const result = await getTodaysProblem("crew-1");
    expect(result.id).toBe("p1");
    expect(result.title).toBe("Two Sum");
  });

  it("scopes crew-2's lookup to crew-2's challenge and problem", async () => {
    const { getTodaysProblem } = await import("@/lib/problems");
    const result = await getTodaysProblem("crew-2");
    expect(result.id).toBe("p2");
    expect(result.title).toBe("Merge Intervals");
  });
});
