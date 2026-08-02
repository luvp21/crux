import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession, requireCrewMember } from "@/lib/auth-helpers";
import { db } from "@/db";
import { crews, crewMembers } from "@/db/schema";
import { getTodaysProblem, getUserSubmissions } from "@/lib/problems";
import { RoomClient } from "./room-client";

export default async function RoomPage({ params }: { params: { crewId: string } }) {
  const session = await requireSession();
  await requireCrewMember(session.user.id, params.crewId);

  const [crew] = await db.select().from(crews).where(eq(crews.id, params.crewId)).limit(1);
  if (!crew) notFound();

  const members = await db
    .select()
    .from(crewMembers)
    .where(eq(crewMembers.crewId, params.crewId));

  const problem = await getTodaysProblem();
  const userSubs = await getUserSubmissions(session.user.id, problem.id);

  return (
    <RoomClient
      crewId={crew.id}
      crewName={crew.name}
      streak={crew.currentStreak}
      problem={problem}
      memberCount={members.length}
      userId={session.user.id}
      userName={session.user.name ?? session.user.email ?? "anon"}
      previousSubmissions={userSubs.map((s) => ({
        id: s.id,
        verdict: s.verdict,
        runtime: s.runtime,
        submittedAt: s.submittedAt.toISOString(),
      }))}
    />
  );
}
