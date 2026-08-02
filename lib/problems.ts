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
        return {
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          topicTag: problem.topicTag,
          description: problem.description,
          examples: (problem.examples ?? []) as Problem["examples"],
          constraints: problem.constraints,
          starterCode: (problem.starterCode ?? {}) as Record<string, string>,
          testCases: (problem.testCases ?? []) as Problem["testCases"],
        };
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
          result.push({
            id: problem.id,
            title: problem.title,
            difficulty: problem.difficulty,
            topicTag: problem.topicTag,
            description: problem.description,
            examples: (problem.examples ?? []) as Problem["examples"],
            constraints: problem.constraints,
            starterCode: (problem.starterCode ?? {}) as Record<string, string>,
            testCases: (problem.testCases ?? []) as Problem["testCases"],
          });
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
