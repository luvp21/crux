import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { contests, contestProblems, problems } from "@/db/schema";
import type { ProblemSummary } from "@/lib/problems";
import { getCrewSolutionsForProblem, type SolutionRow } from "@/lib/crew-solutions";

export interface ContestSummary {
  id: string;
  name: string;
  crewId: string;
  startAt: Date;
  endAt: Date;
  problems: ProblemSummary[];
}

export interface ContestListItem {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
}

/** Every contest a crew has run, most recent first — for the crew home
 * "past contests" list. */
export async function getCrewContests(crewId: string): Promise<ContestListItem[]> {
  const rows = await db
    .select({ id: contests.id, name: contests.name, startAt: contests.startAt, endAt: contests.endAt })
    .from(contests)
    .where(eq(contests.crewId, crewId))
    .orderBy(desc(contests.startAt))
    .limit(10);
  return rows;
}

async function loadContestProblems(contestId: string): Promise<ProblemSummary[]> {
  const rows = await db
    .select({
      id: problems.id,
      title: problems.title,
      difficulty: problems.difficulty,
      topicTag: problems.topicTag,
    })
    .from(contestProblems)
    .innerJoin(problems, eq(contestProblems.problemId, problems.id))
    .where(eq(contestProblems.contestId, contestId))
    .orderBy(asc(contestProblems.orderIndex));
  return rows;
}

/** The crew's currently-running contest (startAt <= now < endAt), if any.
 * A crew has at most one active contest in practice (the room only ever
 * offers "start a contest" when none is active), but this picks the most
 * recently started one defensively. */
export async function getActiveContest(crewId: string): Promise<ContestSummary | null> {
  const now = new Date();
  const [contest] = await db
    .select()
    .from(contests)
    .where(and(eq(contests.crewId, crewId), gt(contests.endAt, now)))
    .orderBy(desc(contests.startAt))
    .limit(1);

  if (!contest || contest.startAt > now) return null;

  return {
    id: contest.id,
    name: contest.name,
    crewId: contest.crewId,
    startAt: contest.startAt,
    endAt: contest.endAt,
    problems: await loadContestProblems(contest.id),
  };
}

export async function createContest(args: {
  crewId: string;
  createdByUserId: string;
  name: string;
  problemIds: string[];
  durationMinutes: number;
}): Promise<string> {
  const { crewId, createdByUserId, name, problemIds, durationMinutes } = args;
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  const [contest] = await db
    .insert(contests)
    .values({ crewId, createdByUserId, name, startAt, endAt })
    .returning({ id: contests.id });

  if (problemIds.length > 0) {
    await db.insert(contestProblems).values(
      problemIds.map((problemId, orderIndex) => ({
        contestId: contest.id,
        problemId,
        orderIndex,
      })),
    );
  }

  return contest.id;
}

export interface ContestResults {
  contest: { id: string; name: string; startAt: Date; endAt: Date };
  problems: ProblemSummary[];
  rows: { userId: string; solutions: SolutionRow[] }[];
}

/** Per-member, per-problem results for a contest — reuses the existing
 * teammate-solution gate (`getCrewSolutionsForProblem`) per problem rather
 * than reimplementing visibility rules; a member's row is only visible to
 * the requester once the requester has their own submission for that
 * problem, same as the daily flow. No ranking/sorting by performance. */
export async function getContestResults(
  requesterId: string,
  crewId: string,
  contestId: string,
): Promise<ContestResults | null> {
  const [contest] = await db.select().from(contests).where(eq(contests.id, contestId)).limit(1);
  if (!contest || contest.crewId !== crewId) return null;

  const contestProblemsList = await loadContestProblems(contestId);

  const perProblemRows = await Promise.all(
    contestProblemsList.map((p) => getCrewSolutionsForProblem(requesterId, crewId, p.id)),
  );
  if (perProblemRows.some((rows) => rows === null)) return null;

  const userIds = new Set<string>();
  for (const problemRows of perProblemRows) {
    for (const row of problemRows ?? []) userIds.add(row.userId);
  }

  const rows = [...userIds].map((userId) => ({
    userId,
    solutions: perProblemRows.map(
      (problemRows) => problemRows?.find((r) => r.userId === userId) ?? { userId, status: "not_started" as const },
    ),
  }));

  return {
    contest: { id: contest.id, name: contest.name, startAt: contest.startAt, endAt: contest.endAt },
    problems: contestProblemsList,
    rows,
  };
}
