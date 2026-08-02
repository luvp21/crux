import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubmissionTimeline } from "@/lib/submission-timeline";

/**
 * GET /api/submissions/[id]/timeline
 * Gated: returns a submission's checkpoint timeline only to the submission's
 * own author, or a crewmate who has submitted their own attempt on the same
 * problem. See `lib/submission-timeline.ts` for the gate logic.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getSubmissionTimeline(session.user.id, params.id);
    if (!result.ok) {
      const message = result.status === 404 ? "Not found" : "Submit your own attempt to view this timeline";
      return NextResponse.json({ error: message }, { status: result.status });
    }

    return NextResponse.json({ timeSpentLabel: result.timeSpentLabel, checkpoints: result.checkpoints });
  } catch (err) {
    console.error("[submissions/timeline] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
