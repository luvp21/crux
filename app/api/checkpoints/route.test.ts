import { describe, it, expect, vi } from "vitest";

let previousCheckpoint: { code: string; createdAt: Date } | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => (previousCheckpoint ? [previousCheckpoint] : [])),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "chk-1" }]),
      })),
    })),
  },
}));

describe("POST /api/checkpoints", () => {
  it("rejects a checkpoint posted within 10s of the previous one", async () => {
    previousCheckpoint = { code: "abc", createdAt: new Date() };
    const { POST } = await import("@/app/api/checkpoints/route");
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "abcdef", language: "python" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(429);
  });

  it("accepts a checkpoint and flags a large insertion as a paste", async () => {
    previousCheckpoint = { code: "a", createdAt: new Date(Date.now() - 20_000) };
    const { POST } = await import("@/app/api/checkpoints/route");
    const bigPaste = "a".repeat(200);
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: bigPaste, language: "python" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPasteFlag).toBe(true);
  });

  it("does not flag a small, incremental change", async () => {
    previousCheckpoint = { code: "a".repeat(50), createdAt: new Date(Date.now() - 20_000) };
    const { POST } = await import("@/app/api/checkpoints/route");
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "a".repeat(55), language: "python" }),
    });
    const res = await POST(req as never);
    const body = await res.json();
    expect(body.isPasteFlag).toBe(false);
  });
});
