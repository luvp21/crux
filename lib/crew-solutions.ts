import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { crewMembers, submissions } from "@/db/schema";

export type SolutionRow =
  | { userId: string; status: "not_started" }
  | { userId: string; status: "locked" }
  | { userId: string; status: "visible"; submissionId: string; verdict: string; submittedAt: string };

/**
 * Per-member solution status for one problem within one crew, gated: a
 * member's real verdict/time is only visible to a requester who has
 * submitted their own attempt on the same problem. Returns null if the
 * requester isn't a member of the crew.
 */
export async function getCrewSolutionsForProblem(
  requesterId: string,
  crewId: string,
  problemId: string,
): Promise<SolutionRow[] | null> {
  const members = await db.select().from(crewMembers).where(eq(crewMembers.crewId, crewId));
  const isMember = members.some((m) => m.userId === requesterId);
  if (!isMember) return null;

  const subs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.crewId, crewId), eq(submissions.problemId, problemId)));

  const latestByUser = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const existing = latestByUser.get(s.userId);
    if (!existing || s.submittedAt > existing.submittedAt) latestByUser.set(s.userId, s);
  }

  const unlocked = latestByUser.has(requesterId);

  return members.map((member): SolutionRow => {
    const latest = latestByUser.get(member.userId);
    if (!latest) return { userId: member.userId, status: "not_started" };
    if (member.userId === requesterId || unlocked) {
      return {
        userId: member.userId,
        status: "visible",
        submissionId: latest.id,
        verdict: latest.verdict,
        submittedAt: latest.submittedAt.toISOString(),
      };
    }
    return { userId: member.userId, status: "locked" };
  });
}
