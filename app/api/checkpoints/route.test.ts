import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTableName } from "drizzle-orm";

let previousCheckpoint: { code: string; createdAt: Date } | null = null;
let isMember = true;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: object) => {
        if (getTableName(table as never) === "crew_members") {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => (isMember ? [{ userId: "u1", crewId: "crew-1" }] : [])),
            })),
          };
        }
        return {
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => (previousCheckpoint ? [previousCheckpoint] : [])),
            })),
          })),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "chk-1" }]),
      })),
    })),
  },
}));

describe("POST /api/checkpoints", () => {
  beforeEach(() => {
    isMember = true;
    previousCheckpoint = null;
  });

  it("returns 403 when the requester isn't a member of the crew", async () => {
    isMember = false;
    const { POST } = await import("@/app/api/checkpoints/route");
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "print(1)", language: "python" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

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

  it("never flags the very first checkpoint for a (user, problem) as a paste, regardless of its length", async () => {
    previousCheckpoint = null;
    // Larger than PASTE_THRESHOLD_CHARS on its own, like a starter-code template.
    const starterLikeCode = "def solve(nums):\n    # TODO: implement\n    pass\n".repeat(3);
    expect(starterLikeCode.length).toBeGreaterThan(80);
    const { POST } = await import("@/app/api/checkpoints/route");
    const req = new Request("http://localhost/api/checkpoints", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: starterLikeCode, language: "python" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPasteFlag).toBe(false);
  });
});
