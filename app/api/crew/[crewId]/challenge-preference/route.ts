import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { crewMembers, crewChallengePreferences } from "@/db/schema";

interface PreferenceRequest {
  type: "daily" | "weekly";
  topicTag: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
}

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function isValidDifficulty(value: unknown): value is "easy" | "medium" | "hard" | null | undefined {
  return value === null || value === undefined || (typeof value === "string" && VALID_DIFFICULTIES.has(value));
}

/**
 * POST /api/crew/[crewId]/challenge-preference
 * Owner-only. Sets the crew's standing topic/difficulty preference for the
 * daily or weekly challenge cron to read on its next run.
 */
export async function POST(req: NextRequest, { params }: { params: { crewId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [membership] = await db
      .select()
      .from(crewMembers)
      .where(and(eq(crewMembers.userId, session.user.id), eq(crewMembers.crewId, params.crewId)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this crew" }, { status: 403 });
    }
    if (membership.role !== "owner") {
      return NextResponse.json({ error: "Only the crew owner can set the challenge preference" }, { status: 403 });
    }

    let body: PreferenceRequest;
    try {
      body = (await req.json()) as PreferenceRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.type !== "daily" && body.type !== "weekly") {
      return NextResponse.json({ error: "type must be 'daily' or 'weekly'" }, { status: 400 });
    }
    if (!isValidDifficulty(body.difficulty)) {
      return NextResponse.json(
        { error: "difficulty must be 'easy', 'medium', 'hard', or null" },
        { status: 400 },
      );
    }

    // Normalize to `null` explicitly (never `undefined`) so a cleared field is
    // actually cleared on update — Drizzle's onConflictDoUpdate skips `undefined`
    // fields in `.set()` and keeps the previous value, while `.values()` would
    // insert `undefined` as `NULL` on first insert. Passing `null` in both places
    // keeps insert and update behavior consistent.
    const topicTag = body.topicTag ?? null;
    const difficulty = body.difficulty ?? null;

    await db
      .insert(crewChallengePreferences)
      .values({
        crewId: params.crewId,
        type: body.type,
        topicTag,
        difficulty,
        updatedByUserId: session.user.id,
      })
      .onConflictDoUpdate({
        target: [crewChallengePreferences.crewId, crewChallengePreferences.type],
        set: {
          topicTag,
          difficulty,
          updatedByUserId: session.user.id,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ message: "Preference saved" });
  } catch (err) {
    console.error("[challenge-preference] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
