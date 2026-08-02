import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { submissions, problems } from "@/db/schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MIN_FAILED_ATTEMPTS = 3;

// Static hints as fallback (when no Gemini key is set)
const FALLBACK_HINTS = [
  "Think about what data structure would let you look up values in O(1) time.",
  "Consider whether a two-pointer approach could simplify this.",
  "Try breaking the problem down — can you solve a smaller version first?",
  "Draw out the examples on paper. What pattern do you see?",
  "Think about edge cases: empty input, single element, all duplicates.",
];

interface HintRequest {
  problemId: string;
  crewId: string;
  code: string;
  language: string;
}

/**
 * POST /api/hint
 * Returns an AI-generated hint after N failed submissions.
 * Falls back to static hints if GEMINI_API_KEY isn't set.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as HintRequest;
    const { problemId, crewId, code, language } = body;

    // Count failed submissions for this user on this problem
    const userSubs = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, session.user.id),
          eq(submissions.problemId, problemId),
        ),
      );

    const failedCount = userSubs.filter(
      (s) => s.verdict !== "accepted",
    ).length;

    if (failedCount < MIN_FAILED_ATTEMPTS) {
      return NextResponse.json({
        locked: true,
        attemptsNeeded: MIN_FAILED_ATTEMPTS - failedCount,
        message: `Solve ${MIN_FAILED_ATTEMPTS - failedCount} more time${MIN_FAILED_ATTEMPTS - failedCount > 1 ? "s" : ""} to unlock hints`,
      });
    }

    // Fetch problem details
    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, problemId))
      .limit(1);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // ---- Fallback: static hint ----
    if (!GEMINI_API_KEY) {
      const hintIdx = Math.min(
        Math.floor((failedCount - MIN_FAILED_ATTEMPTS) / 1),
        FALLBACK_HINTS.length - 1,
      );
      return NextResponse.json({
        hint: FALLBACK_HINTS[hintIdx],
        source: "static",
      });
    }

    // ---- Gemini API call ----
    const prompt = `You are a helpful DSA tutor. The student is working on this problem:

Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}

Their current code (${language}):
\`\`\`${language}
${code}
\`\`\`

They have failed ${failedCount} times. Give them ONE short, specific hint that points them toward the right approach without giving away the solution. Be concise (2-3 sentences max). Don't write any code.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200 },
        }),
      },
    );

    if (!response.ok) {
      // Fall back to static hint on API error
      return NextResponse.json({
        hint: FALLBACK_HINTS[0],
        source: "static",
        note: "AI hint unavailable, showing static hint",
      });
    }

    const data = await response.json();
    const hint =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? FALLBACK_HINTS[0];

    return NextResponse.json({
      hint,
      source: "ai",
    });
  } catch (err) {
    console.error("[hint] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
