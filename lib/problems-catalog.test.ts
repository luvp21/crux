import { describe, it, expect, vi } from "vitest";

const PROBLEMS = [
  { id: "p1", title: "Two Sum", difficulty: "easy", topicTag: "arrays" },
  { id: "p2", title: "Merge Intervals", difficulty: "medium", topicTag: "intervals" },
  { id: "p3", title: "Word Break", difficulty: "medium", topicTag: "dynamic programming" },
];

const FULL_PROBLEM_ROWS = PROBLEMS.map((p) => ({
  ...p,
  description: "desc",
  examples: [],
  constraints: "",
  starterCode: {},
  testCases: [],
}));

let activeRows: typeof PROBLEMS | typeof FULL_PROBLEM_ROWS = PROBLEMS;
let activeFilter: ((row: (typeof PROBLEMS)[number]) => boolean) | null = null;
let shouldThrow = false;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((condition: unknown) => {
          if (shouldThrow) throw new Error("db down");
          const filtered = activeFilter ? activeRows.filter(activeFilter as never) : activeRows;
          return {
            then: (resolve: (v: unknown) => void) => resolve(filtered),
            limit: vi.fn(async (n: number) => filtered.slice(0, n)),
          };
        }),
      })),
    })),
  },
}));

describe("listProblems", () => {
  it("returns the full catalog when no filters are given", async () => {
    activeRows = PROBLEMS;
    activeFilter = null;
    const { listProblems } = await import("@/lib/problems");
    const result = await listProblems();
    expect(result).toHaveLength(3);
  });

  it("filters by difficulty", async () => {
    activeRows = PROBLEMS;
    activeFilter = (row) => row.difficulty === "medium";
    const { listProblems } = await import("@/lib/problems");
    const result = await listProblems({ difficulty: "medium" });
    expect(result.map((r) => r.id)).toEqual(["p2", "p3"]);
  });

  it("returns [] on a db error instead of throwing", async () => {
    shouldThrow = true;
    const { listProblems } = await import("@/lib/problems");
    const result = await listProblems();
    expect(result).toEqual([]);
    shouldThrow = false;
  });
});

describe("getProblemById", () => {
  it("returns the matching problem, mapped to the Problem shape", async () => {
    activeRows = FULL_PROBLEM_ROWS;
    activeFilter = (row) => row.id === "p2";
    const { getProblemById } = await import("@/lib/problems");
    const result = await getProblemById("p2");
    expect(result?.title).toBe("Merge Intervals");
  });

  it("returns null when no problem matches", async () => {
    activeRows = FULL_PROBLEM_ROWS;
    activeFilter = () => false;
    const { getProblemById } = await import("@/lib/problems");
    const result = await getProblemById("missing");
    expect(result).toBeNull();
  });
});
