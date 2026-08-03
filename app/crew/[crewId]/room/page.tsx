import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession, requireCrewMember, getUserCrews } from "@/lib/auth-helpers";
import { db } from "@/db";
import { crews, crewMembers } from "@/db/schema";
import { getTodaysProblem, getProblemById, getUserSubmissions } from "@/lib/problems";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";
import { getActiveContest } from "@/lib/contests";
import { RoomClient } from "./room-client";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: { crewId: string };
  searchParams: { p?: string };
}) {
  const session = await requireSession();
  await requireCrewMember(session.user.id, params.crewId);

  const [crew] = await db.select().from(crews).where(eq(crews.id, params.crewId)).limit(1);
  if (!crew) notFound();

  const members = await db
    .select()
    .from(crewMembers)
    .where(eq(crewMembers.crewId, params.crewId));

  const contest = await getActiveContest(params.crewId);

  const problem = contest
    ? ((await getProblemById(searchParams.p ?? contest.problems[0].id)) ??
      (await getProblemById(contest.problems[0].id)))
    : await getTodaysProblem(params.crewId);
  if (!problem) notFound();

  const userSubs = await getUserSubmissions(session.user.id, problem.id);

  const userCrews = await getUserCrews(session.user.id);

  const solutionRows = (await getCrewSolutionsForProblem(session.user.id, params.crewId, problem.id)) ?? [];
  const crewSolutions = solutionRows.map((row) =>
    row.status === "visible"
      ? {
          userId: row.userId,
          status: row.status,
          link: `/crew/${params.crewId}/problems/${problem.id}/solutions/${row.userId}`,
        }
      : { userId: row.userId, status: row.status, link: null },
  );

  return (
    <RoomClient
      crewId={crew.id}
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
      crewSolutions={crewSolutions}
      userCrews={userCrews.map((c) => ({ crewId: c.crewId, crewName: c.crewName, role: c.role }))}
      contest={
        contest
          ? { id: contest.id, name: contest.name, endAt: contest.endAt.toISOString(), problems: contest.problems }
          : null
      }
      activeProblemId={problem.id}
    />
  );
}
