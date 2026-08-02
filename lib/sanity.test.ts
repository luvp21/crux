import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs and resolves @/ imports", async () => {
    const { generateInviteCode } = await import("@/lib/invite-code");
    expect(typeof generateInviteCode()).toBe("string");
  });
});
