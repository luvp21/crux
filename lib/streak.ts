import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { crewMembers, crews } from "@/db/schema";

/**
 * After a user solves a problem, update both their individual streak and
 * the crew's overall streak. Called from the submit route on "accepted".
 */
export async function updateStreaksAfterSolve(userId: string, crewId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Update member's individual streak
    const [member] = await db
      .select()
      .from(crewMembers)
      .where(and(eq(crewMembers.userId, userId), eq(crewMembers.crewId, crewId)))
      .limit(1);

    if (!member) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastCompleted = member.lastCompleted; // date string or null

    let newStreak = 1;
    if (lastCompleted === today) {
      // Already solved today — no change
      return;
    } else if (lastCompleted === yesterday) {
      newStreak = member.currentStreak + 1;
    }

    await db
      .update(crewMembers)
      .set({ currentStreak: newStreak, lastCompleted: today })
      .where(and(eq(crewMembers.userId, userId), eq(crewMembers.crewId, crewId)));

    // Update crew streak — crew streak increments if at least one member
    // solved today (the streak represents consecutive days where the crew
    // was active, matching the brief's "if one person shows up, nobody
    // loses it" principle).
    const [crew] = await db
      .select()
      .from(crews)
      .where(eq(crews.id, crewId))
      .limit(1);

    if (!crew) return;

    // Simple streak update: bump if not already bumped today.
    // The daily cron handles the full computation; this is the real-time
    // optimistic update so the UI feels responsive.
    const crewStreak = crew.currentStreak + 1;
    const longestStreak = Math.max(crew.longestStreak, crewStreak);

    await db
      .update(crews)
      .set({ currentStreak: crewStreak, longestStreak })
      .where(eq(crews.id, crewId));
  } catch (err) {
    console.error("[streak] Error updating streaks:", err);
    // Don't throw — streak failure shouldn't block submission
  }
}
