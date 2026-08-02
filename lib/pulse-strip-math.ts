export interface WaveformCheckpoint {
  insertedChars: number;
  isPasteFlag: boolean;
}

export interface WaveformPoint {
  x: number;
  y: number;
  isPasteFlag: boolean;
}

const WIDTH = 130;
const HEIGHT = 24;
const BASELINE = HEIGHT / 2;
const MAX_AMPLITUDE = HEIGHT / 2 - 2;

export function computeWaveformPoints(checkpoints: WaveformCheckpoint[]): WaveformPoint[] {
  if (checkpoints.length === 0) {
    return [
      { x: 0, y: BASELINE, isPasteFlag: false },
      { x: WIDTH, y: BASELINE, isPasteFlag: false },
    ];
  }

  const maxChars = Math.max(1, ...checkpoints.map((c) => c.insertedChars));
  const step = checkpoints.length === 1 ? 0 : WIDTH / (checkpoints.length - 1);

  return checkpoints.map((c, i) => {
    const amplitude = Math.min(1, c.insertedChars / maxChars) * MAX_AMPLITUDE;
    const direction = c.isPasteFlag ? 1 : i % 2 === 0 ? 0.6 : -0.6;
    const y = BASELINE - amplitude * direction;
    return {
      x: checkpoints.length === 1 ? WIDTH / 2 : i * step,
      y,
      isPasteFlag: c.isPasteFlag,
    };
  });
}
