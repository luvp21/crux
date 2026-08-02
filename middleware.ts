import { NextRequest, NextResponse } from "next/server";

// Database sessions (via neon-serverless's `ws` driver) can't be verified
// here — middleware runs in the Edge runtime, which the driver doesn't
// support. This does a cheap cookie-presence check only; the real,
// authoritative session lookup happens server-side via requireSession()
// (lib/auth-helpers.ts) in each protected page.
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function middleware(req: NextRequest) {
  const hasSession = SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
  if (!hasSession) {
    const signInUrl = new URL("/signin", req.nextUrl.origin);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: ["/crew/:path*"],
};
