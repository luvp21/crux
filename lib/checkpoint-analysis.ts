export interface Checkpoint {
  createdAt: Date;
  isPasteFlag: boolean;
  insertedChars: number;
}

export function computeTimeSpentLabel(checkpoints: Checkpoint[], submittedAt: Date): string {
  if (checkpoints.length === 0) return "< 25s";

  const earliest = checkpoints.reduce(
    (min, c) => (c.createdAt < min ? c.createdAt : min),
    checkpoints[0].createdAt,
  );
  const ms = submittedAt.getTime() - earliest.getTime();
  if (ms < 0) return "< 25s";

  if (ms < 60000) return "< 1m";

  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function hasPasteFlag(checkpoints: Checkpoint[]): boolean {
  return checkpoints.some((c) => c.isPasteFlag);
}
