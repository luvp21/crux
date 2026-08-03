import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { crewMembers, submissions } from "@/db/schema";

/**
 * The single gate for "may `requesterId` view a solution submitted within
 * `crewId` for `problemId`?" — both `lib/crew-solutions.ts` and
 * `lib/submission-timeline.ts` call this instead of independently
 * reimplementing "has the requester submitted," which is how those two
 * modules previously drifted out of sync (the timeline gate had no
 * crew-membership check and matched on problemId alone, across any crew).
 *
 * Requires BOTH:
 *  - the requester is currently a member of `crewId` (so leaving a crew, or
 *    viewing via a crew you were never in, revokes access even if you once
 *    had a qualifying submission), and
 *  - the requester has their own submission for that exact (crewId,
 *    problemId) pair (not just `problemId` in some other crew).
 */
export async function canViewSolution(
  requesterId: string,
  crewId: string,
  problemId: string,
): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(crewMembers)
    .where(and(eq(crewMembers.userId, requesterId), eq(crewMembers.crewId, crewId)))
    .limit(1);
  if (!membership) return false;

  const [ownSubmission] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, requesterId),
        eq(submissions.crewId, crewId),
        eq(submissions.problemId, problemId),
      ),
    )
    .limit(1);

  return !!ownSubmission;
}
