import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, submissions } from "@/db/schema";
import { PROBLEMS as SEED_PROBLEMS } from "@/db/seed";

export type Problem = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topicTag: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string;
  starterCode: Record<string, string>;
  testCases: { input: string; expected: string }[];
};

export interface ProblemSummary {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topicTag: string;
}

type ProblemRow = typeof problems.$inferSelect;

function toProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    topicTag: row.topicTag,
    description: row.description,
    examples: (row.examples ?? []) as Problem["examples"],
    constraints: row.constraints,
    starterCode: (row.starterCode ?? {}) as Record<string, string>,
    testCases: (row.testCases ?? []) as Problem["testCases"],
  };
}

/**
 * Get today's daily challenge problem.
 * Falls back to a static seed problem if no DB challenge exists.
 */
export async function getTodaysProblem(crewId: string): Promise<Problem> {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.crewId, crewId), eq(challenges.challengeDate, today), eq(challenges.type, "daily")))
      .limit(1);

    if (challenge) {
      const [problem] = await db
        .select()
        .from(problems)
        .where(eq(problems.id, challenge.problemId))
        .limit(1);

      if (problem) {
        return toProblem(problem);
      }
    }
  } catch {
    // DB not available — fall through to seed data
  }

  // Fallback: pick a deterministic problem from seed data based on today's date
  const dayIndex = Math.floor(Date.now() / 86400000) % SEED_PROBLEMS.length;
  const seed = SEED_PROBLEMS[dayIndex];

  return {
    id: `seed-${dayIndex}`,
    title: seed.title,
    difficulty: seed.difficulty,
    topicTag: seed.topicTag,
    description: seed.description,
    examples: seed.examples,
    constraints: seed.constraints,
    starterCode: seed.starterCode,
    testCases: seed.testCases,
  };
}

/**
 * Get this week's challenge problems.
 */
export async function getWeeklyProblems(crewId: string): Promise<Problem[]> {
  try {
    // Get challenges for this week (Monday of current week)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getTime() + mondayOffset * 86400000);
    const weekDate = monday.toISOString().slice(0, 10);

    const weeklyChallenges = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.crewId, crewId), eq(challenges.challengeDate, weekDate), eq(challenges.type, "weekly")));

    if (weeklyChallenges.length > 0) {
      const result: Problem[] = [];
      for (const c of weeklyChallenges) {
        const [problem] = await db
          .select()
          .from(problems)
          .where(eq(problems.id, c.problemId))
          .limit(1);
        if (problem) {
          result.push(toProblem(problem));
        }
      }
      if (result.length > 0) return result;
    }
  } catch {
    // Fall through
  }

  // Fallback: pick 3 seed problems
  const weekIndex = Math.floor(Date.now() / (7 * 86400000));
  return Array.from({ length: 3 }, (_, i) => {
    const idx = (weekIndex * 3 + i) % SEED_PROBLEMS.length;
    const seed = SEED_PROBLEMS[idx];
    return {
      id: `seed-${idx}`,
      title: seed.title,
      difficulty: seed.difficulty,
      topicTag: seed.topicTag,
      description: seed.description,
      examples: seed.examples,
      constraints: seed.constraints,
      starterCode: seed.starterCode,
      testCases: seed.testCases,
    };
  });
}

/**
 * Get recent activity for a crew (last 20 submissions).
 */
export async function getCrewActivity(crewId: string) {
  try {
    const recentSubs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.crewId, crewId))
      .orderBy(desc(submissions.submittedAt))
      .limit(20);

    return recentSubs;
  } catch {
    return [];
  }
}

/**
 * Get submission count for a user on a specific problem.
 */
export async function getUserSubmissions(userId: string, problemId: string) {
  try {
    const subs = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, userId),
          eq(submissions.problemId, problemId),
        ),
      )
      .orderBy(desc(submissions.submittedAt));

    return subs;
  } catch {
    return [];
  }
}

/**
 * Full problem catalog (or a filtered slice), for the solo-practice catalog
 * and contest problem pickers. Returns [] on DB error rather than falling
 * back to seed data — unlike the daily/weekly getters, an empty catalog is a
 * legitimate, visible "no matches" state here, not something to paper over.
 */
export async function listProblems(filters?: {
  topicTag?: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<ProblemSummary[]> {
  try {
    const conditions = [
      filters?.topicTag ? eq(problems.topicTag, filters.topicTag) : undefined,
      filters?.difficulty ? eq(problems.difficulty, filters.difficulty) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await db
      .select({ id: problems.id, title: problems.title, difficulty: problems.difficulty, topicTag: problems.topicTag })
      .from(problems)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return rows;
  } catch {
    return [];
  }
}

/** A single problem by id, for the room (contest mode) and solo practice. */
export async function getProblemById(problemId: string): Promise<Problem | null> {
  try {
    const [row] = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
    return row ? toProblem(row) : null;
  } catch {
    return null;
  }
}
