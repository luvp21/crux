import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, crews, crewChallengePreferences } from "@/db/schema";
import { selectChallengeProblem, type ChallengeCandidate } from "@/lib/challenge-selection";

const PROBLEMS_PER_WEEK = 3;

/**
 * GET /api/cron/weekly
 * Called weekly (Sunday midnight UTC via Vercel Cron or manual trigger).
 * Per crew: picks 2–3 problems for the new week, respecting the crew's topic/difficulty
 * preference (falling back to unfiltered random), avoiding duplicates within the set.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now.getTime() + daysUntilMonday * 86400000);
    const weekDate = nextMonday.toISOString().slice(0, 10);

    const allProblems = await db
      .select({ id: problems.id, topicTag: problems.topicTag, difficulty: problems.difficulty })
      .from(problems);
    const allCrews = await db.select().from(crews);

    let crewsProcessed = 0;
    let challengesCreated = 0;

    for (const crew of allCrews) {
      crewsProcessed++;

      const existing = await db
        .select()
        .from(challenges)
        .where(and(eq(challenges.crewId, crew.id), eq(challenges.type, "weekly"), eq(challenges.challengeDate, weekDate)));
      if (existing.length > 0) continue;

      const [preference] = await db
        .select()
        .from(crewChallengePreferences)
        .where(and(eq(crewChallengePreferences.crewId, crew.id), eq(crewChallengePreferences.type, "weekly")))
        .limit(1);
      const prefArg = preference ? { topicTag: preference.topicTag, difficulty: preference.difficulty } : null;

      const picked: ChallengeCandidate[] = [];
      let excludeId: string | null = null;
      for (let i = 0; i < PROBLEMS_PER_WEEK; i++) {
        const remaining = allProblems.filter((p) => !picked.some((pp) => pp.id === p.id));
        const next = selectChallengeProblem(remaining, prefArg, excludeId);
        if (!next) break;
        picked.push(next);
        excludeId = next.id; // only prevents immediate re-pick within the loop's exclusion arg; dedup is via the filter above
      }

      for (const p of picked) {
        await db.insert(challenges).values({
          crewId: crew.id,
          type: "weekly",
          challengeDate: weekDate,
          problemId: p.id,
        });
        challengesCreated++;
      }
    }

    return NextResponse.json({
      message: "Weekly challenges processed",
      weekDate,
      crewsProcessed,
      challengesCreated,
    });
  } catch (err) {
    console.error("[cron/weekly] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
