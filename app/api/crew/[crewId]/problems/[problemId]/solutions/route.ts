import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCrewSolutionsForProblem } from "@/lib/crew-solutions";

/**
 * GET /api/crew/[crewId]/problems/[problemId]/solutions
 * Thin wrapper over `getCrewSolutionsForProblem`: authenticates the
 * requester, then returns 403 when they aren't a member of the crew.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { crewId: string; problemId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getCrewSolutionsForProblem(session.user.id, params.crewId, params.problemId);
  if (rows === null) {
    return NextResponse.json({ error: "Not a member of this crew" }, { status: 403 });
  }

  return NextResponse.json({ rows });
}
