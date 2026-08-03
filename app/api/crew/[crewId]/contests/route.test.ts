import { describe, it, expect, vi, beforeEach } from "vitest";
import { Param } from "drizzle-orm/sql";

let membershipRole: string | null = "owner";
let activeContest: unknown = null;
let dbKnownProblemIds = new Set(["p1", "p2", "p3"]);

const ALL_PROBLEMS = [
  { id: "p1", topicTag: "arrays", difficulty: "easy" },
  { id: "p2", topicTag: "trees", difficulty: "medium" },
  { id: "p3", topicTag: "graphs", difficulty: "hard" },
];

/** Pulls the literal values out of a drizzle `inArray(col, [...])` condition
 * so the mock can answer "which of these ids does the db know about?"
 * instead of ignoring the query and returning a fixed list. `inArray`'s
 * per-value `Param`s sit inside a nested array chunk, not at the top level
 * of `queryChunks`, so this recurses one level into array chunks too. */
function extractInArrayValues(condition: unknown): unknown[] {
  const chunks = (condition as { queryChunks?: unknown[] })?.queryChunks;
  if (!chunks) return [];
  const values: unknown[] = [];
  for (const chunk of chunks) {
    if (chunk instanceof Param) values.push(chunk.value);
    else if (Array.isArray(chunk)) {
      for (const nested of chunk) {
        if (nested instanceof Param) values.push(nested.value);
      }
    }
  }
  return values;
}

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

const mocks = vi.hoisted(() => ({
  createContest: vi.fn(async (_args: Record<string, unknown>) => "new-contest-id"),
}));

vi.mock("@/lib/contests", () => ({
  getActiveContest: vi.fn(async () => activeContest),
  createContest: mocks.createContest,
}));

vi.mock("@/db", () => ({
  db: {
    // db.select() with no args = the crewMembers membership check.
    // db.select({...}) with column args = a problems query (existence
    // check via .where(), or the full-catalog fetch awaited directly).
    select: vi.fn((cols?: Record<string, unknown>) => ({
      from: vi.fn(() => {
        if (cols === undefined) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => (membershipRole ? [{ role: membershipRole }] : [])),
            })),
          };
        }
        return {
          where: vi.fn(async (condition: unknown) => {
            const requestedIds = extractInArrayValues(condition) as string[];
            return requestedIds.filter((id) => dbKnownProblemIds.has(id)).map((id) => ({ id }));
          }),
          then: (resolve: (v: unknown) => void) => resolve(ALL_PROBLEMS),
        };
      }),
    })),
  },
}));

function makeRequest(body: string) {
  return new Request("http://localhost/api/crew/crew-1/contests", { method: "POST", body });
}

describe("POST /api/crew/[crewId]/contests", () => {
  beforeEach(() => {
    membershipRole = "owner";
    activeContest = null;
    dbKnownProblemIds = new Set(["p1", "p2", "p3"]);
    mocks.createContest.mockClear();
  });

  it("rejects a non-member with 403", async () => {
    membershipRole = null;
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1"], durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("rejects a non-owner with 403", async () => {
    membershipRole = "member";
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1"], durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("rejects starting a contest when one is already active", async () => {
    activeContest = { id: "existing" };
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1"], durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(409);
  });

  it("rejects an invalid mode with 400", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "chaos", durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("rejects an out-of-range durationMinutes with 400", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1"], durationMinutes: 0 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("manual mode: rejects an empty problemIds list with 400", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: [], durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("manual mode: rejects a problemId that doesn't exist with 400", async () => {
    dbKnownProblemIds = new Set(["p1"]); // "p2" won't be found
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1", "p2"], durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
    expect(mocks.createContest).not.toHaveBeenCalled();
  });

  it("manual mode: creates the contest and returns 200 with a contestId", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1", "p2"], durationMinutes: 45, name: "Sprint" }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.contestId).toBe("new-contest-id");
    expect(mocks.createContest).toHaveBeenCalledWith(
      expect.objectContaining({ problemIds: ["p1", "p2"], durationMinutes: 45, name: "Sprint" }),
    );
  });

  it("auto mode: rejects an out-of-range count with 400", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "auto", count: 0, durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("auto mode: rejects an invalid difficulty with 400", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(
      JSON.stringify({ mode: "auto", count: 2, difficulty: "impossible", durationMinutes: 30 }),
    );
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("auto mode: picks problems and creates the contest", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "auto", count: 2, durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);
    expect(mocks.createContest).toHaveBeenCalledTimes(1);
    const call = mocks.createContest.mock.calls[0][0] as { problemIds: string[] };
    expect(call.problemIds).toHaveLength(2);
  });

  it("defaults the name when omitted", async () => {
    const { POST } = await import("@/app/api/crew/[crewId]/contests/route");
    const req = makeRequest(JSON.stringify({ mode: "manual", problemIds: ["p1"], durationMinutes: 30 }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);
    const call = mocks.createContest.mock.calls[0][0] as { name: string };
    expect(call.name.length).toBeGreaterThan(0);
  });
});
