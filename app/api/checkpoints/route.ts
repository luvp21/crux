import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { codeCheckpoints, crewMembers } from "@/db/schema";

const MIN_INTERVAL_MS = 10_000;
const PASTE_THRESHOLD_CHARS = 80;

interface CheckpointRequest {
  problemId: string;
  crewId?: string | null;
  code: string;
  language: string;
}

/**
 * POST /api/checkpoints
 * Client posts a code snapshot on a debounce (~25s of active typing) and
 * once on Run/Submit. Rate-limited to one per 10s per (user, problem) so a
 * modified client can't flood the table.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CheckpointRequest;
    const { problemId, crewId, code, language } = body;
    if (!problemId || typeof code !== "string" || !language) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // The client supplies `crewId`; downstream tagging at submit time trusts
    // this same value to scope checkpoints to a crew (see app/api/submit/route.ts),
    // so it must be verified here rather than taken on faith. Solo (crewless)
    // checkpoints have no membership to verify.
    if (crewId) {
      const [membership] = await db
        .select()
        .from(crewMembers)
        .where(and(eq(crewMembers.userId, session.user.id), eq(crewMembers.crewId, crewId)))
        .limit(1);
      if (!membership) {
        return NextResponse.json({ error: "Not a member of this crew" }, { status: 403 });
      }
    }

    const [previous] = await db
      .select()
      .from(codeCheckpoints)
      .where(and(eq(codeCheckpoints.userId, session.user.id), eq(codeCheckpoints.problemId, problemId)))
      .orderBy(desc(codeCheckpoints.createdAt))
      .limit(1);

    if (previous && Date.now() - previous.createdAt.getTime() < MIN_INTERVAL_MS) {
      return NextResponse.json({ error: "Too many checkpoints" }, { status: 429 });
    }

    const insertedChars = Math.max(0, code.length - (previous?.code.length ?? 0));
    // A paste is only meaningful relative to a previous checkpoint. With no
    // `previous`, `insertedChars` is the FULL length of whatever is already
    // in the editor — including starter-code templates that routinely exceed
    // PASTE_THRESHOLD_CHARS on their own — so the very first checkpoint for
    // a (user, problem) is never flagged.
    const isPasteFlag = previous ? insertedChars > PASTE_THRESHOLD_CHARS : false;

    const [checkpoint] = await db
      .insert(codeCheckpoints)
      .values({ userId: session.user.id, problemId, crewId: crewId ?? null, code, language, insertedChars, isPasteFlag })
      .returning({ id: codeCheckpoints.id });

    return NextResponse.json({ checkpointId: checkpoint.id, isPasteFlag });
  } catch (err) {
    console.error("[checkpoints] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
