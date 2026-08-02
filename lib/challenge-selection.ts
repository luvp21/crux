export interface ChallengeCandidate {
  id: string;
  topicTag: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ChallengePreference {
  topicTag: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
}

export function selectChallengeProblem(
  allProblems: ChallengeCandidate[],
  preference: ChallengePreference | null,
  excludeProblemId: string | null,
  rng: () => number = Math.random,
): ChallengeCandidate | null {
  const pool = allProblems.filter((p) => p.id !== excludeProblemId);
  if (pool.length === 0) return null;

  if (preference && (preference.topicTag || preference.difficulty)) {
    const filtered = pool.filter((p) => {
      const topics = p.topicTag.split(",").map((t) => t.trim());
      const topicMatches = !preference.topicTag || topics.includes(preference.topicTag);
      const difficultyMatches = !preference.difficulty || p.difficulty === preference.difficulty;
      return topicMatches && difficultyMatches;
    });
    if (filtered.length > 0) {
      return filtered[Math.floor(rng() * filtered.length)];
    }
    // filter matched nothing — fall through to the unfiltered pool below
  }

  return pool[Math.floor(rng() * pool.length)];
}
