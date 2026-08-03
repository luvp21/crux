import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getProblemById, getUserSubmissions } from "@/lib/problems";
import { PracticeClient } from "@/components/practice/practice-client";

export default async function PracticeSolvePage({ params }: { params: { problemId: string } }) {
  const session = await requireSession();

  const problem = await getProblemById(params.problemId);
  if (!problem) notFound();

  const userSubs = await getUserSubmissions(session.user.id, problem.id);

  return (
    <PracticeClient
      problem={problem}
      previousSubmissions={userSubs.map((s) => ({
        id: s.id,
        verdict: s.verdict,
        runtime: s.runtime,
        submittedAt: s.submittedAt.toISOString(),
      }))}
    />
  );
}
