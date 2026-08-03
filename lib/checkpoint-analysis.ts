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

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) return `${totalHours}h ${minutes}m`;

  // Defensive: crew-scoping at submit time (app/api/submit/route.ts) should
  // prevent a stale/orphaned checkpoint from ever being tagged to a much
  // later submission, but a multi-day gap is formatted sanely if one slips
  // through rather than rendering as an absurd "168h 0m".
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
}

export function hasPasteFlag(checkpoints: Checkpoint[]): boolean {
  return checkpoints.some((c) => c.isPasteFlag);
}
