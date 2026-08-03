export interface MemberForOwnerPick {
  userId: string;
  joinedAt: Date;
}

/**
 * Deterministic successor when a crew's owner leaves: earliest `joinedAt`
 * among the remaining members, ties broken by `userId` ascending. Returns
 * null when no members remain, in which case the crew is simply left
 * ownerless (not deleted) — a crew is never removed by a membership change.
 */
export function pickNextOwner(remainingMembers: MemberForOwnerPick[]): string | null {
  if (remainingMembers.length === 0) return null;

  const sorted = [...remainingMembers].sort((a, b) => {
    const byJoinedAt = a.joinedAt.getTime() - b.joinedAt.getTime();
    if (byJoinedAt !== 0) return byJoinedAt;
    return a.userId.localeCompare(b.userId);
  });

  return sorted[0].userId;
}
