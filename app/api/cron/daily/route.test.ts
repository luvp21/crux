import { describe, it, expect, vi } from "vitest";

// Drizzle's `.from()` and `.where()` are each independently awaitable (they resolve
// to rows directly) while also being chainable to `.where()`/`.limit()`. Model that by
// returning an empty array with the next chain method attached, so `await db.select().from(x)`
// resolves to `[]` and `db.select().from(x).where(y)` still supports `.limit()`.
function arrayWithChain(chain: Record<string, unknown>) {
  return Object.assign([] as unknown[], chain);
}

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() =>
        arrayWithChain({
          where: vi.fn(() =>
            arrayWithChain({
              limit: vi.fn(async () => []),
            }),
          ),
        }),
      ),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => ({
        returning: vi.fn(async () => [{ id: "new-challenge", ...vals }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  },
}));

describe("GET /api/cron/daily", () => {
  it("is reachable and returns 200 with a per-crew summary", async () => {
    const { GET } = await import("@/app/api/cron/daily/route");
    const req = new Request("http://localhost/api/cron/daily");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("crewsProcessed");
  });
});
