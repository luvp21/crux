import { describe, it, expect } from "vitest";
import { computeWaveformPoints } from "@/lib/pulse-strip-math";

describe("computeWaveformPoints", () => {
  it("returns a flat two-point baseline for no checkpoints", () => {
    const points = computeWaveformPoints([]);
    expect(points).toHaveLength(2);
    expect(points[0].x).toBe(0);
    expect(points[1].x).toBe(130);
    expect(points[0].y).toBe(points[1].y);
  });

  it("returns one point per checkpoint when there's more than one", () => {
    const points = computeWaveformPoints([
      { insertedChars: 5, isPasteFlag: false },
      { insertedChars: 10, isPasteFlag: false },
      { insertedChars: 3, isPasteFlag: false },
    ]);
    expect(points).toHaveLength(3);
  });

  it("pushes a paste-flagged checkpoint to the top of the strip", () => {
    const points = computeWaveformPoints([
      { insertedChars: 5, isPasteFlag: false },
      { insertedChars: 500, isPasteFlag: true },
    ]);
    expect(points[1].y).toBeLessThan(points[0].y); // smaller y = higher on an SVG
    expect(points[1].isPasteFlag).toBe(true);
  });

  it("spans the full 0-130 width across all points", () => {
    const points = computeWaveformPoints([
      { insertedChars: 1, isPasteFlag: false },
      { insertedChars: 1, isPasteFlag: false },
      { insertedChars: 1, isPasteFlag: false },
    ]);
    expect(points[0].x).toBe(0);
    expect(points[points.length - 1].x).toBe(130);
  });
});
