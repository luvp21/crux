import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { crewMembers, crews } from "@/db/schema";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session as typeof session & { user: { id: string } };
}

export interface CrewMembershipSummary {
  crewId: string;
  crewName: string;
  role: "owner" | "member";
  crewStreak: number;
  inviteCode: string;
  joinedAt: Date;
}

/** Every crew a user belongs to, oldest membership first. A user can belong
 * to any number of crews at once. */
export async function getUserCrews(userId: string): Promise<CrewMembershipSummary[]> {
  const rows = await db
    .select({
      crewId: crews.id,
      crewName: crews.name,
      role: crewMembers.role,
      crewStreak: crews.currentStreak,
      inviteCode: crews.inviteCode,
      joinedAt: crewMembers.joinedAt,
    })
    .from(crewMembers)
    .innerJoin(crews, eq(crewMembers.crewId, crews.id))
    .where(eq(crewMembers.userId, userId))
    .orderBy(crewMembers.joinedAt);
  return rows;
}

export async function requireCrewMember(userId: string, crewId: string) {
  const [membership] = await db
    .select()
    .from(crewMembers)
    .where(and(eq(crewMembers.userId, userId), eq(crewMembers.crewId, crewId)))
    .limit(1);
  if (!membership) redirect("/crew/new");
  return membership;
}
