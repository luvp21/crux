import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";

const SESSION_COOKIE = "authjs.session-token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * GET /api/dev-login?email=you@example.com&name=You
 * Dev-only shortcut that creates (or reuses) a user and a real database
 * session, bypassing OAuth. Disabled outside development.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }
  const name = req.nextUrl.searchParams.get("name") || email.split("@")[0];

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, name, emailVerified: new Date() })
      .returning();
  }

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + THIRTY_DAYS_MS);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  const res = NextResponse.redirect(new URL("/crew/new", req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
