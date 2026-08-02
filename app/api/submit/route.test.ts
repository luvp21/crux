import { describe, it, expect, vi } from "vitest";

const PROBLEM = {
  id: "p1",
  testCases: [{ input: "1", expected: "2" }],
  hiddenTestCases: [{ input: "999", expected: "SECRET_VALUE_998" }],
  runnerMeta: null,
};

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "u1" } })),
}));

vi.mock("@/lib/streak", () => ({
  updateStreaksAfterSolve: vi.fn(async () => {}),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [PROBLEM]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "sub-1" }]),
      })),
    })),
  },
}));

describe("POST /api/submit (mock mode, no JUDGE0_URL)", () => {
  it("includes a hiddenResults summary without leaking hidden input/expected text", async () => {
    const { POST } = await import("@/app/api/submit/route");
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "print(2)", language: "python" }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(body.hiddenResults).toHaveProperty("total", 1);
    expect(body.hiddenResults).not.toHaveProperty("input");
    expect(body.hiddenResults).not.toHaveProperty("expected");
    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("SECRET_VALUE_998");
  });
});
