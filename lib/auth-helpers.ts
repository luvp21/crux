import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { crewMembers } from "@/db/schema";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session as typeof session & { user: { id: string } };
}

/** A user can only belong to one crew at a time — see crew setup screen copy. */
export async function getUserCrewId(userId: string) {
  const [membership] = await db
    .select({ crewId: crewMembers.crewId })
    .from(crewMembers)
    .where(eq(crewMembers.userId, userId))
    .limit(1);
  return membership?.crewId ?? null;
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
