"use client";

import { computeWaveformPoints, type WaveformCheckpoint } from "@/lib/pulse-strip-math";

export function PulseStrip({ checkpoints }: { checkpoints: WaveformCheckpoint[] }) {
  const points = computeWaveformPoints(checkpoints);
  const flagged = checkpoints.some((c) => c.isPasteFlag);
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width="130" height="24" viewBox="0 0 130 24" role="img" aria-label={flagged ? "Paste detected during solving" : "Typing timeline"}>
      <polyline points={pointsAttr} fill="none" stroke={flagged ? "#ff5d6c" : "var(--accent)"} strokeWidth="1.5" />
    </svg>
  );
}
