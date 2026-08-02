import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, crews, crewMembers } from "@/db/schema";

/**
 * GET /api/cron/daily
 * Called daily (via Vercel Cron or manual trigger).
 * 1. Picks tomorrow's daily problem (random, not the same as today's).
 * 2. Updates crew streaks based on today's activity.
 */
export async function GET(req: NextRequest) {
  // Optional: verify cron secret
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Check if tomorrow's challenge already exists
    const [existing] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.challengeDate, tomorrow), eq(challenges.type, "daily")))
      .limit(1);

    if (existing) {
      return NextResponse.json({ message: "Tomorrow's challenge already set", challengeId: existing.id });
    }

    // Get today's problem to avoid repeating
    const [todayChallenge] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.challengeDate, today), eq(challenges.type, "daily")))
      .limit(1);

    // Pick a random problem (not the same as today's)
    let allProblems = await db.select({ id: problems.id }).from(problems);
    if (todayChallenge) {
      allProblems = allProblems.filter((p) => p.id !== todayChallenge.problemId);
    }

    if (allProblems.length === 0) {
      return NextResponse.json({ error: "No problems available" }, { status: 500 });
    }

    const randomProblem = allProblems[Math.floor(Math.random() * allProblems.length)];

    // Create tomorrow's challenge
    const [challenge] = await db
      .insert(challenges)
      .values({
        type: "daily",
        challengeDate: tomorrow,
        problemId: randomProblem.id,
      })
      .returning();

    // ---- Update crew streaks for today ----
    const allCrews = await db.select().from(crews);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    for (const crew of allCrews) {
      const members = await db
        .select()
        .from(crewMembers)
        .where(eq(crewMembers.crewId, crew.id));

      const anyoneSolvedToday = members.some((m) => m.lastCompleted === today);

      if (anyoneSolvedToday) {
        // Streak continues — already updated in real-time by submit route
      } else {
        // No one solved today — reset streak
        await db
          .update(crews)
          .set({ currentStreak: 0 })
          .where(eq(crews.id, crew.id));
      }
    }

    return NextResponse.json({
      message: "Daily challenge set",
      challengeId: challenge.id,
      problemId: randomProblem.id,
      date: tomorrow,
    });
  } catch (err) {
    console.error("[cron/daily] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
