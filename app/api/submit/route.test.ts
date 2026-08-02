import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MOCK_MODE_PROBLEM = {
  id: "p1",
  testCases: [{ input: "1", expected: "2" }],
  hiddenTestCases: [{ input: "999", expected: "SECRET_VALUE_998" }],
  runnerMeta: null,
};

const REAL_JUDGE0_PROBLEM = {
  id: "p1",
  testCases: [{ input: "1", expected: "2" }],
  hiddenTestCases: [{ input: "999", expected: "SECRET_VALUE_998" }],
  runnerMeta: { method: "solve", params: ["int"], returns: "int" },
};

// Mutable so each test can swap in the fixture it needs; the `@/db` mock
// factory below reads through this reference.
let currentProblem: typeof MOCK_MODE_PROBLEM | typeof REAL_JUDGE0_PROBLEM = MOCK_MODE_PROBLEM;

// Set by the mocked db.update(...).set(...).where(...) chain so tests can
// assert which submission id the tagging call was invoked with.
let taggedWith: string | null = null;

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
          limit: vi.fn(async () => [currentProblem]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "sub-1" }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((vals: { submissionId: string }) => ({
        where: vi.fn(async () => {
          taggedWith = vals.submissionId;
          return [];
        }),
      })),
    })),
  },
}));

describe("POST /api/submit (mock mode, no JUDGE0_URL)", () => {
  it("includes a hiddenResults summary without leaking hidden input/expected text", async () => {
    currentProblem = MOCK_MODE_PROBLEM;
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

  it("tags open checkpoints with the new submission id", async () => {
    taggedWith = null;
    const { POST } = await import("@/app/api/submit/route");
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({ problemId: "p1", crewId: "crew-1", code: "print(2)", language: "python" }),
    });
    await POST(req as never);
    expect(taggedWith).toBe("sub-1");
  });
});

describe("POST /api/submit (real Judge0 branch, JUDGE0_URL set)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // route.ts reads `process.env.JUDGE0_URL` into a module-level const at
    // import time, so the env var must be set *before* the module is
    // (re-)imported. vi.resetModules() in each test forces a fresh
    // evaluation of route.ts against the current env.
    vi.stubEnv("JUDGE0_URL", "http://fake-judge0.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
    vi.resetModules();
  });

  /** Judge0 shape: stdout is base64-encoded; status.id 3 = Accepted. */
  function judge0Response(stdout: string, statusId = 3) {
    return {
      ok: true,
      json: async () => ({
        stdout: Buffer.from(stdout).toString("base64"),
        status: { id: statusId },
        time: "0.01",
      }),
    } as Response;
  }

  it("only returns the visible case in results, hiddenResults is total/passed only, and hidden content never leaks", async () => {
    currentProblem = REAL_JUDGE0_PROBLEM;

    // Call order in route.ts: visible test cases first, then hidden ones.
    // Visible case expects "2"; hidden case expects "SECRET_VALUE_998" and
    // the mocked Judge0 response reports it passing too.
    const fetchMock = vi.fn(async () => judge0Response("2"));
    fetchMock
      .mockResolvedValueOnce(judge0Response("2"))
      .mockResolvedValueOnce(judge0Response("SECRET_VALUE_998"));
    global.fetch = fetchMock as unknown as typeof fetch;

    vi.resetModules();
    const { POST } = await import("@/app/api/submit/route");
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({
        problemId: "p1",
        crewId: "crew-1",
        code: "class Solution:\n    def solve(self, x):\n        return x",
        language: "python",
      }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({ case: 1, passed: true });

    expect(body.hiddenResults).toEqual({ total: 1, passed: 1 });
    expect(body.hiddenResults).not.toHaveProperty("input");
    expect(body.hiddenResults).not.toHaveProperty("expected");
    expect(body.hiddenResults).not.toHaveProperty("got");
    expect(body.hiddenResults).not.toHaveProperty("stdout");

    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("SECRET_VALUE_998");

    expect(body.verdict).toBe("accepted");
  });

  it("fails the submission when the hidden case fails, even though the visible case passed (first-failure-wins)", async () => {
    currentProblem = REAL_JUDGE0_PROBLEM;

    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(judge0Response("2")) // visible case passes
      .mockResolvedValueOnce(judge0Response("wrong_output")); // hidden case fails
    global.fetch = fetchMock as unknown as typeof fetch;

    vi.resetModules();
    const { POST } = await import("@/app/api/submit/route");
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({
        problemId: "p1",
        crewId: "crew-1",
        code: "class Solution:\n    def solve(self, x):\n        return x",
        language: "python",
      }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(body.results[0]).toMatchObject({ passed: true });
    expect(body.hiddenResults).toEqual({ total: 1, passed: 0 });
    expect(body.verdict).toBe("wrong_answer");

    const bodyText = JSON.stringify(body);
    expect(bodyText).not.toContain("wrong_output");
  });

  it("marks a visible case as not passed when it times out, even if its stdout happens to match the expected output", async () => {
    currentProblem = REAL_JUDGE0_PROBLEM;

    // statusId 5 = Time Limit Exceeded. stdout coincidentally equals the expected
    // value, which previously made the visible-case loop's own recomputed
    // `passed: stdout === tc.expected.trim()` report `true` despite the TLE.
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(judge0Response("2", 5)) // visible case: TLE, stdout coincidentally matches
      .mockResolvedValueOnce(judge0Response("SECRET_VALUE_998")); // hidden case: passes normally
    global.fetch = fetchMock as unknown as typeof fetch;

    vi.resetModules();
    const { POST } = await import("@/app/api/submit/route");
    const req = new Request("http://localhost/api/submit", {
      method: "POST",
      body: JSON.stringify({
        problemId: "p1",
        crewId: "crew-1",
        code: "class Solution:\n    def solve(self, x):\n        return x",
        language: "python",
      }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(body.results[0]).toMatchObject({ passed: false });
    expect(body.verdict).toBe("time_limit_exceeded");
  });
});
