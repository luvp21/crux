import Link from "next/link";
import { auth } from "@/auth";
import { getUserCrewId } from "@/lib/auth-helpers";

const PALETTE = {
  bgBase: "#0e0d0b",
  bgSurface: "#151310",
  bgSurface2: "#1c1a16",
  borderSubtle: "#3a3835",
  textPrimary: "#f6f5f3",
  textSecondary: "#9a968e",
  accent: "#eae23c",
  accentSoftBg: "#262421",
};

const PILLARS = [
  {
    k: "one room",
    v: "Everyone lands on the same problem, the same editor. No lobby, no setup.",
  },
  {
    k: "one streak",
    v: "The crew keeps a single streak. If one person shows up, nobody loses it.",
  },
  {
    k: "no rank",
    v: "No leaderboard to game. Just your crew, watching how you actually work.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  const crewId = session?.user?.id ? await getUserCrewId(session.user.id) : null;
  const ctaHref = !session ? "/signin" : crewId ? `/crew/${crewId}` : "/crew/new";
  const ctaLabel = !session ? "Create a crew" : crewId ? "Go to your crew" : "Create a crew";

  return (
    <div style={{ background: PALETTE.bgBase, minHeight: "100vh" }}>
      <div
        style={{
          width: "76%",
          maxWidth: 1240,
          margin: "0 auto",
          background: PALETTE.bgSurface,
        }}
      >
        {/* nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 36px",
            borderBottom: `1px solid ${PALETTE.borderSubtle}`,
          }}
        >
          <span style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 14, color: PALETTE.textPrimary }}>
            CRUX
          </span>
          <div style={{ display: "flex", gap: 22, fontSize: 12, color: PALETTE.textSecondary }}>
            {session ? (
              <Link href={crewId ? `/crew/${crewId}` : "/crew/new"} style={{ color: "inherit" }}>
                Your crew
              </Link>
            ) : (
              <Link href="/signin" style={{ color: "inherit" }}>
                Sign in
              </Link>
            )}
          </div>
          <Link
            href={ctaHref}
            style={{
              background: PALETTE.accent,
              color: "#161503",
              fontSize: 11,
              fontWeight: 600,
              padding: "7px 15px",
              borderRadius: 20,
            }}
          >
            {ctaLabel}
          </Link>
        </div>

        {/* hero */}
        <div style={{ textAlign: "center", padding: "56px 40px 0" }}>
          <span
            style={{
              display: "inline-block",
              border: `1px solid ${PALETTE.borderSubtle}`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: "10.5px",
              letterSpacing: "0.06em",
              color: PALETTE.textSecondary,
            }}
          >
            for crews, not solo grinders
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              lineHeight: 1.08,
              color: PALETTE.textPrimary,
              margin: "18px auto 14px",
              maxWidth: 560,
            }}
          >
            Practice with your{" "}
            <span style={{ background: PALETTE.accentSoftBg, color: PALETTE.accent, padding: "0 6px" }}>crew</span>,
            not a leaderboard.
          </h1>
          <p style={{ fontSize: "14.5px", color: PALETTE.textSecondary, maxWidth: 440, margin: "0 auto 26px" }}>
            One problem a day. Everyone in the room sees how you solved it, and how long it took — no rank, no
            score, just your crew watching you show up.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 44 }}>
            <Link
              href={ctaHref}
              style={{
                background: PALETTE.accent,
                color: "#161503",
                fontSize: "12.5px",
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 20,
              }}
            >
              {ctaLabel}
            </Link>
            <Link
              href="#how-it-works"
              style={{
                border: `1px solid ${PALETTE.borderSubtle}`,
                color: PALETTE.textPrimary,
                fontSize: "12.5px",
                fontWeight: 600,
                padding: "10px 20px",
                borderRadius: 20,
              }}
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* pillars */}
        <div id="how-it-works" style={{ background: PALETTE.bgSurface2, padding: "52px 40px", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              border: `1px solid ${PALETTE.borderSubtle}`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: "10.5px",
              letterSpacing: "0.06em",
              color: PALETTE.textSecondary,
            }}
          >
            why crux
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: PALETTE.textPrimary, margin: "14px 0 30px" }}>
            Three rules, nothing else competing for attention.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "left" }}>
            {PILLARS.map((p) => (
              <div
                key={p.k}
                style={{
                  background: PALETTE.bgSurface,
                  border: `1px solid ${PALETTE.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: 13, color: PALETTE.accent, margin: "0 0 6px" }}>
                  {p.k}
                </p>
                <p style={{ fontSize: 12, color: PALETTE.textSecondary, margin: 0, lineHeight: 1.5 }}>{p.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* close */}
        <div style={{ borderTop: `1px solid ${PALETTE.borderSubtle}`, padding: "44px 40px", textAlign: "center" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: PALETTE.textPrimary, margin: "0 0 18px" }}>
            Get your hostel back into it.
          </h3>
          <Link
            href={ctaHref}
            style={{
              background: PALETTE.accent,
              color: "#161503",
              fontSize: "12.5px",
              fontWeight: 600,
              padding: "10px 22px",
              borderRadius: 20,
            }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
