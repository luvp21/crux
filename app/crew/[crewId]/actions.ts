"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession, getUserCrews } from "@/lib/auth-helpers";
import { pickNextOwner } from "@/lib/crew-membership";
import { db } from "@/db";
import { crewMembers } from "@/db/schema";

export async function leaveCrew(crewId: string) {
  const session = await requireSession();
  const userId = session.user.id;

  const members = await db.select().from(crewMembers).where(eq(crewMembers.crewId, crewId));
  const caller = members.find((m) => m.userId === userId);
  if (!caller) redirect("/crew/new");

  await db.transaction(async (tx) => {
    const others = members.filter((m) => m.userId !== userId);

    if (caller.role === "owner" && others.length > 0) {
      const nextOwnerId = pickNextOwner(others.map((m) => ({ userId: m.userId, joinedAt: m.joinedAt })));
      if (nextOwnerId) {
        await tx
          .update(crewMembers)
          .set({ role: "owner" })
          .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, nextOwnerId)));
      }
    }

    await tx
      .delete(crewMembers)
      .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)));
  });

  const remaining = await getUserCrews(userId);
  redirect(remaining.length > 0 ? `/crew/${remaining[0].crewId}` : "/crew/new");
}
