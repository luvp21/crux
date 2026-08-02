import { describe, it, expect, vi } from "vitest";

let membershipRole: string | null = "owner";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
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
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(async () => []),
      })),
    })),
  },
}));

describe("POST /api/crew/[crewId]/challenge-preference", () => {
  it("rejects a non-member with 403", async () => {
    membershipRole = null;
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("rejects a non-owner with 403", async () => {
    membershipRole = "member";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(403);
  });

  it("accepts an owner's preference and returns 200", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "daily", topicTag: "trees", difficulty: "hard" }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(200);
  });

  it("rejects an invalid type with 400", async () => {
    membershipRole = "owner";
    const { POST } = await import("@/app/api/crew/[crewId]/challenge-preference/route");
    const req = new Request("http://localhost/api/crew/crew-1/challenge-preference", {
      method: "POST",
      body: JSON.stringify({ type: "monthly", topicTag: null, difficulty: null }),
    });
    const res = await POST(req as never, { params: { crewId: "crew-1" } } as never);
    expect(res.status).toBe(400);
  });
});
