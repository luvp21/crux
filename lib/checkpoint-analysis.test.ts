import { describe, it, expect } from "vitest";
import { computeTimeSpentLabel, hasPasteFlag, type Checkpoint } from "@/lib/checkpoint-analysis";

describe("computeTimeSpentLabel", () => {
  it("returns '< 25s' when there are no checkpoints", () => {
    expect(computeTimeSpentLabel([], new Date())).toBe("< 25s");
  });

  it("computes minutes from the earliest checkpoint to submittedAt", () => {
    const submittedAt = new Date("2026-08-02T10:41:00Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:20:00Z"), isPasteFlag: false, insertedChars: 10 },
      { createdAt: new Date("2026-08-02T10:35:00Z"), isPasteFlag: false, insertedChars: 20 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("21m");
  });

  it("formats over an hour as '<h>h <m>m'", () => {
    const submittedAt = new Date("2026-08-02T12:05:00Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:00:00Z"), isPasteFlag: false, insertedChars: 5 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("2h 5m");
  });

  it("returns '< 1m' for a sub-minute gap", () => {
    const submittedAt = new Date("2026-08-02T10:00:30Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:00:00Z"), isPasteFlag: false, insertedChars: 5 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("< 1m");
  });

  it("formats a multi-day gap as '<d>d <h>h'", () => {
    // A defensive tier in case a stale checkpoint slips past crew-scoped
    // tagging at submit time (app/api/submit/route.ts) and ends up attached
    // to a submission days later.
    const submittedAt = new Date("2026-08-05T13:00:00Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:00:00Z"), isPasteFlag: false, insertedChars: 5 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("3d 3h");
  });

  it("formats an exact multiple of 24h with 0h remainder", () => {
    const submittedAt = new Date("2026-08-04T10:00:00Z");
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date("2026-08-02T10:00:00Z"), isPasteFlag: false, insertedChars: 5 },
    ];
    expect(computeTimeSpentLabel(checkpoints, submittedAt)).toBe("2d 0h");
  });
});

describe("hasPasteFlag", () => {
  it("is false for an empty array", () => {
    expect(hasPasteFlag([])).toBe(false);
  });

  it("is true when any checkpoint is flagged", () => {
    const checkpoints: Checkpoint[] = [
      { createdAt: new Date(), isPasteFlag: false, insertedChars: 5 },
      { createdAt: new Date(), isPasteFlag: true, insertedChars: 300 },
    ];
    expect(hasPasteFlag(checkpoints)).toBe(true);
  });
});
