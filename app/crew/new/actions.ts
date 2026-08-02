"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { generateInviteCode } from "@/lib/invite-code";
import { db } from "@/db";
import { crewMembers, crews } from "@/db/schema";

async function existingCrewId(userId: string) {
  const [membership] = await db
    .select({ crewId: crewMembers.crewId })
    .from(crewMembers)
    .where(eq(crewMembers.userId, userId))
    .limit(1);
  return membership?.crewId ?? null;
}

export async function createCrew(formData: FormData) {
  const session = await requireSession();
  const userId = session.user.id;

  const existing = await existingCrewId(userId);
  if (existing) redirect(`/crew/${existing}`);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Crew name is required");

  let crewId: string | null = null;

  // Invite codes are random 6-char strings — retry on the rare collision.
  for (let attempt = 0; attempt < 5 && !crewId; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const [crew] = await db
        .insert(crews)
        .values({ name, inviteCode })
        .returning({ id: crews.id });
      crewId = crew.id;
    } catch {
      // unique constraint collision on invite_code — retry with a new code
    }
  }
  if (!crewId) throw new Error("Could not generate a unique invite code, try again");

  await db.insert(crewMembers).values({ crewId, userId, role: "owner" });

  redirect(`/crew/${crewId}`);
}

export async function joinCrew(formData: FormData) {
  const session = await requireSession();
  const userId = session.user.id;

  const existing = await existingCrewId(userId);
  if (existing) redirect(`/crew/${existing}`);

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) throw new Error("Invite code is required");

  const [crew] = await db.select().from(crews).where(eq(crews.inviteCode, code)).limit(1);
  if (!crew) throw new Error("No crew found for that code");

  await db.insert(crewMembers).values({ crewId: crew.id, userId, role: "member" });

  redirect(`/crew/${crew.id}`);
}
