import { describe, it, expect, vi, beforeEach } from "vitest";

let membershipRole: string | null = "owner";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

const mocks = vi.hoisted(() => ({
  insertValues: vi.fn((_vals: Record<string, unknown>) => ({
    onConflictDoUpdate: mocks.onConflictDoUpdate,
  })),
  onConflictDoUpdate: vi.fn(async (_args: Record<string, unknown>) => []),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (membershipRole ? [{ role: membershipRole }] : [])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: mocks.insertValues,
    })),
  },
}));

function makeRequest(body: string) {
  return new Request("http://localhost/api/crew/crew-1/challenge-preference", {
    method: "POST",
    body,
  });
}

describe("POST /api/crew/[crewId]/challenge-preference", () => {
  beforeEach(() => {
    mocks.insertValues.mockClear();
    mocks.onConflictDoUpdate.mockClear();
  });

  it("rejects a non-member with 403", async () => {
    membershipRole = null;
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = makeRequest(JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("rejects a non-owner with 403", async () => {
    membershipRole = "member";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = makeRequest(JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("accepts an owner's preference and returns 200", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = makeRequest(JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);
  });

  it("rejects an invalid type with 400", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = makeRequest(JSON.stringify({ type: "monthly", topicTag: null, difficulty: null }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid difficulty with 400 instead of hitting the DB enum constraint", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = makeRequest(JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "impossible" }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects a malformed JSON body with 400, not a generic 500", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = makeRequest("{not valid json");
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });

  it("normalizes an omitted topicTag/difficulty to null (not undefined) in both the insert values and the update set", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    // topicTag/difficulty entirely absent from the body, so they'd be `undefined` if not normalized.
    const req = makeRequest(JSON.stringify({ type: "daily" }));
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ topicTag: null, difficulty: null }),
    );
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ topicTag: null, difficulty: null }),
      }),
    );
  });
});
