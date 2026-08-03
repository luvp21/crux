import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { crewMembers, problems } from "@/db/schema";
import { createContest, getActiveContest } from "@/lib/contests";
import { selectChallengeProblem, type ChallengeCandidate } from "@/lib/challenge-selection";

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const MAX_DURATION_MINUTES = 24 * 60;
const MAX_AUTO_COUNT = 10;

interface ContestRequest {
  name?: string;
  mode: "manual" | "auto";
  problemIds?: string[];
  topicTag?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
  count?: number;
  durationMinutes: number;
}

/**
 * POST /api/crew/[crewId]/contests
 * Owner-only. Starts a timed, multi-problem contest for the crew, either
 * from an explicit problem list ("manual") or by topic/difficulty
 * auto-select ("auto") — reusing the same `selectChallengeProblem` picker
 * the daily/weekly cron jobs use.
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
      return NextResponse.json({ error: "Only the crew owner can start a contest" }, { status: 403 });
    }

    const activeContest = await getActiveContest(params.crewId);
    if (activeContest) {
      return NextResponse.json({ error: "A contest is already running for this crew" }, { status: 409 });
    }

    let body: ContestRequest;
    try {
      body = (await req.json()) as ContestRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.mode !== "manual" && body.mode !== "auto") {
      return NextResponse.json({ error: "mode must be 'manual' or 'auto'" }, { status: 400 });
    }

    const durationMinutes = Number(body.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
      return NextResponse.json(
        { error: `durationMinutes must be an integer between 1 and ${MAX_DURATION_MINUTES}` },
        { status: 400 },
      );
    }

    let problemIds: string[];

    if (body.mode === "manual") {
      if (!Array.isArray(body.problemIds) || body.problemIds.length === 0) {
        return NextResponse.json({ error: "problemIds is required for manual mode" }, { status: 400 });
      }
      const existing = await db
        .select({ id: problems.id })
        .from(problems)
        .where(inArray(problems.id, body.problemIds));
      if (existing.length !== body.problemIds.length) {
        return NextResponse.json({ error: "One or more problemIds do not exist" }, { status: 400 });
      }
      problemIds = body.problemIds;
    } else {
      const count = Number(body.count);
      if (!Number.isInteger(count) || count < 1 || count > MAX_AUTO_COUNT) {
        return NextResponse.json({ error: `count must be an integer between 1 and ${MAX_AUTO_COUNT}` }, { status: 400 });
      }
      if (body.difficulty !== undefined && body.difficulty !== null && !VALID_DIFFICULTIES.has(body.difficulty)) {
        return NextResponse.json({ error: "difficulty must be 'easy', 'medium', 'hard', or null" }, { status: 400 });
      }

      const allProblems = await db
        .select({ id: problems.id, topicTag: problems.topicTag, difficulty: problems.difficulty })
        .from(problems);
      const preference = { topicTag: body.topicTag ?? null, difficulty: body.difficulty ?? null };

      const picked: ChallengeCandidate[] = [];
      for (let i = 0; i < count; i++) {
        const remaining = allProblems.filter((p) => !picked.some((pp) => pp.id === p.id));
        const next = selectChallengeProblem(remaining, preference, null);
        if (!next) break;
        picked.push(next);
      }
      if (picked.length === 0) {
        return NextResponse.json({ error: "No problems available to auto-select" }, { status: 400 });
      }
      problemIds = picked.map((p) => p.id);
    }

    const name = body.name?.trim() || `Contest · ${new Date().toLocaleDateString()}`;

    const contestId = await createContest({
      crewId: params.crewId,
      createdByUserId: session.user.id,
      name,
      problemIds,
      durationMinutes,
    });

    return NextResponse.json({ contestId });
  } catch (err) {
    console.error("[contests] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
