import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/lib/submission-timeline", () => ({
  getSubmissionTimeline: vi.fn(async (_requesterId: string, submissionId: string) =>
    submissionId === "locked-sub" ? { ok: false, status: 403 } : { ok: true, timeSpentLabel: "21m", checkpoints: [] },
  ),
}));

describe("GET /api/submissions/[id]/timeline", () => {
  it("returns 403 when the gate denies access", async () => {
    const { GET } = await import("@/app/api/submissions/[id]/timeline/route");
    const req = new Request("http://localhost/api/submissions/locked-sub/timeline");
    const res = await GET(req as never, { params: { id: "locked-sub" } } as never);
    expect(res.status).toBe(403);
  });

  it("returns the timeline when the gate allows access", async () => {
    const { GET } = await import("@/app/api/submissions/[id]/timeline/route");
    const req = new Request("http://localhost/api/submissions/sub-1/timeline");
    const res = await GET(req as never, { params: { id: "sub-1" } } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeSpentLabel).toBe("21m");
  });
});
