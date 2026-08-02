import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { submissions, codeCheckpoints } from "@/db/schema";
import { computeTimeSpentLabel } from "@/lib/checkpoint-analysis";

export type TimelineResult =
  | {
      ok: true;
      timeSpentLabel: string;
      checkpoints: { code: string; createdAt: string; insertedChars: number; isPasteFlag: boolean }[];
    }
  | { ok: false; status: 403 | 404 };

/**
 * Fetches a submission's checkpoint timeline, gated: the requester must be
 * the submission's own author, or must have submitted their own attempt on
 * the same problem.
 */
export async function getSubmissionTimeline(requesterId: string, submissionId: string): Promise<TimelineResult> {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission) {
    return { ok: false, status: 404 };
  }

  if (submission.userId !== requesterId) {
    const [ownAttempt] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.userId, requesterId), eq(submissions.problemId, submission.problemId)))
      .limit(1);
    if (!ownAttempt) {
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
    timeSpentLabel: computeTimeSpentLabel(checkpoints, submission.submittedAt),
    checkpoints: checkpoints.map((c) => ({
      code: c.code,
      createdAt: c.createdAt.toISOString(),
      insertedChars: c.insertedChars,
      isPasteFlag: c.isPasteFlag,
    })),
  };
}
