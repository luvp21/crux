import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { codeCheckpoints } from "@/db/schema";

const MIN_INTERVAL_MS = 10_000;
const PASTE_THRESHOLD_CHARS = 80;

interface CheckpointRequest {
  problemId: string;
  crewId: string;
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
    if (!problemId || !crewId || typeof code !== "string" || !language) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
    const isPasteFlag = insertedChars > PASTE_THRESHOLD_CHARS;

    const [checkpoint] = await db
      .insert(codeCheckpoints)
      .values({ userId: session.user.id, problemId, crewId, code, language, insertedChars, isPasteFlag })
      .returning({ id: codeCheckpoints.id });

    return NextResponse.json({ checkpointId: checkpoint.id, isPasteFlag });
  } catch (err) {
    console.error("[checkpoints] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
