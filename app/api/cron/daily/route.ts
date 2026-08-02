import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, crews, crewMembers, crewChallengePreferences } from "@/db/schema";
import { selectChallengeProblem } from "@/lib/challenge-selection";

/**
 * GET /api/cron/daily
 * Called daily (via Vercel Cron or manual trigger).
 * Per crew: picks tomorrow's daily problem (respecting the crew's topic/difficulty
 * preference, falling back to unfiltered random), and resets the crew's streak if
 * nobody solved today.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const allProblems = await db
      .select({ id: problems.id, topicTag: problems.topicTag, difficulty: problems.difficulty })
      .from(problems);
    const allCrews = await db.select().from(crews);

    let crewsProcessed = 0;
    let challengesCreated = 0;
    let crewsFailed = 0;
    const failedCrewIds: string[] = [];

    for (const crew of allCrews) {
      try {
        // ---- Challenge selection ----
        const [existing] = await db
          .select()
          .from(challenges)
          .where(and(eq(challenges.crewId, crew.id), eq(challenges.type, "daily"), eq(challenges.challengeDate, tomorrow)))
          .limit(1);

        if (!existing) {
          const [todayChallenge] = await db
            .select()
            .from(challenges)
            .where(and(eq(challenges.crewId, crew.id), eq(challenges.type, "daily"), eq(challenges.challengeDate, today)))
            .limit(1);

          const [preference] = await db
            .select()
            .from(crewChallengePreferences)
            .where(and(eq(crewChallengePreferences.crewId, crew.id), eq(crewChallengePreferences.type, "daily")))
            .limit(1);

          const picked = selectChallengeProblem(
            allProblems,
            preference ? { topicTag: preference.topicTag, difficulty: preference.difficulty } : null,
            todayChallenge?.problemId ?? null,
          );

          if (picked) {
            await db.insert(challenges).values({
              crewId: crew.id,
              type: "daily",
              challengeDate: tomorrow,
              problemId: picked.id,
            });
            challengesCreated++;
          }
        }

        // ---- Streak reset ----
        const members = await db.select().from(crewMembers).where(eq(crewMembers.crewId, crew.id));
        const anyoneSolvedToday = members.some((m) => m.lastCompleted === today);
        if (!anyoneSolvedToday) {
          await db.update(crews).set({ currentStreak: 0 }).where(eq(crews.id, crew.id));
        }

        crewsProcessed++;
      } catch (crewErr) {
        crewsFailed++;
        failedCrewIds.push(crew.id);
        console.error(`[cron/daily] Failed to process crew ${crew.id}:`, crewErr);
      }
    }

    return NextResponse.json({
      message: "Daily challenges processed",
      crewsProcessed,
      challengesCreated,
      crewsFailed,
      date: tomorrow,
    });
  } catch (err) {
    console.error("[cron/daily] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
