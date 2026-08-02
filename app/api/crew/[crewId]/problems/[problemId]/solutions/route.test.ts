import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/lib/crew-solutions", () => ({
  getCrewSolutionsForProblem: vi.fn(async (requesterId: string) =>
    requesterId === "stranger" ? null : [{ userId: "u1", status: "not_started" }],
  ),
}));

describe("GET /api/crew/[crewId]/problems/[problemId]/solutions", () => {
  it("returns 403 when the requester isn't a crew member", async () => {
    vi.mocked((await import("@/auth")).auth).mockResolvedValueOnce({ user: { id: "stranger" } } as never);
    const { GET } = await import("@/app/api/crew/[crewId]/problems/[problemId]/solutions/route");
    const req = new Request("http://localhost/api/crew/crew-1/problems/p1/solutions");
    const res = await GET(req as never, { params: { crewId: "crew-1", problemId: "p1" } } as never);
    expect(res.status).toBe(403);
  });

  it("returns rows for a crew member", async () => {
    const { GET } = await import("@/app/api/crew/[crewId]/problems/[problemId]/solutions/route");
    const req = new Request("http://localhost/api/crew/crew-1/problems/p1/solutions");
    const res = await GET(req as never, { params: { crewId: "crew-1", problemId: "p1" } } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
  });
});
