import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { challenges, problems, crews } from "@/db/schema";

/**
 * GET /api/cron/weekly
 * Called weekly (Sunday midnight UTC via Vercel Cron or manual trigger).
 * Picks 2–3 problems for the new week's challenge set.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Compute next Monday's date as the challenge_date for this week
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now.getTime() + daysUntilMonday * 86400000);
    const weekDate = nextMonday.toISOString().slice(0, 10);

    // Check if this week's challenges already exist
    const existing = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.challengeDate, weekDate), eq(challenges.type, "weekly")));

    if (existing.length > 0) {
      return NextResponse.json({
        message: "Weekly challenges already set",
        count: existing.length,
      });
    }

    // Pick 3 random problems (different from each other)
    const allProblems = await db.select({ id: problems.id, topicTag: problems.topicTag }).from(problems);

    // Shuffle and take 3
    const shuffled = allProblems.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(3, shuffled.length));

    // Get all crews
    const allCrews = await db.select().from(crews);

    const created = [];
    for (const crew of allCrews) {
      for (const p of picked) {
        const [challenge] = await db
          .insert(challenges)
          .values({
            crewId: crew.id,
            type: "weekly",
            challengeDate: weekDate,
            problemId: p.id,
          })
          .returning();
        created.push(challenge);
      }
    }

    return NextResponse.json({
      message: "Weekly challenges set",
      weekDate,
      count: created.length,
      challengeIds: created.map((c) => c.id),
    });
  } catch (err) {
    console.error("[cron/weekly] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
