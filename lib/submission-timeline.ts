import { eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions, codeCheckpoints } from "@/db/schema";
import { computeTimeSpentLabel } from "@/lib/checkpoint-analysis";
import { canViewSolution } from "@/lib/solution-gate";

export type TimelineResult =
  | {
      ok: true;
      code: string;
      timeSpentLabel: string;
      checkpoints: { code: string; createdAt: string; insertedChars: number; isPasteFlag: boolean }[];
    }
  | { ok: false; status: 403 | 404 };

/**
 * Fetches a submission's checkpoint timeline, gated: the requester must be
 * the submission's own author, or pass `canViewSolution` for the
 * submission's own `crewId` — i.e. currently a member of that crew AND
 * has their own submission for that exact (crewId, problemId) pair. Using
 * the submission's own crewId (not any crewId supplied by the caller) is
 * what prevents a submission id that was ever visible in one crew context
 * from staying visible forever via a different crew or after leaving.
 */
export async function getSubmissionTimeline(requesterId: string, submissionId: string): Promise<TimelineResult> {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission) {
    return { ok: false, status: 404 };
  }

  if (submission.userId !== requesterId) {
    const canView = await canViewSolution(requesterId, submission.crewId, submission.problemId);
    if (!canView) {
      return { ok: false, status: 403 };
    }
  }

  const checkpoints = await db
    .select()
    .from(codeCheckpoints)
    .where(eq(codeCheckpoints.submissionId, submissionId))
    .orderBy(codeCheckpoints.createdAt);

  return {
    ok: true,
    code: submission.code,
    timeSpentLabel: computeTimeSpentLabel(checkpoints, submission.submittedAt),
    checkpoints: checkpoints.map((c) => ({
      code: c.code,
      createdAt: c.createdAt.toISOString(),
      insertedChars: c.insertedChars,
      isPasteFlag: c.isPasteFlag,
    })),
  };
}
