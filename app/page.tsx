import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { auth } from "@/auth";
import { getUserCrews } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/motion/reveal";
import { SiteNav } from "@/components/site-nav";

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

const PRESENCE = [
  { name: "riya", active: true },
  { name: "dev", active: false },
  { name: "aman", active: false },
];

export default async function LandingPage() {
  const session = await auth();
  const crews = session?.user?.id ? await getUserCrews(session.user.id) : [];

  const ctaHref = !session ? "/signin" : crews.length === 0 ? "/crew/new" : `/crew/${crews[0].crewId}`;
  const ctaLabel = !session
    ? "Get started"
    : crews.length === 0
      ? "Create or join a crew"
      : crews.length === 1
        ? "Go to your crew"
        : "Go to your crews";
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <SiteNav />
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)" }}>
        {/* hero */}
        <div style={{ paddingTop: "clamp(40px, 8vw, 88px)", paddingBottom: 64 }}>
          <Reveal>
            <div className="hero-split">
              <div>
                <Badge tone="accent">for crews, not solo grinders</Badge>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(32px, 5vw, 50px)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.01em",
                    color: "var(--fg)",
                    margin: "20px 0 16px",
                  }}
                >
                  Practice with your{" "}
                  <span style={{ background: "var(--raise)", color: "var(--accent)", padding: "0 8px" }}>
                    crew
                  </span>
                  , not a leaderboard.
                </h1>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--muted)",
                    lineHeight: 1.7,
                    maxWidth: 420,
                    margin: "0 0 30px",
                  }}
                >
                  One problem a day. Everyone in the room sees how you solved it, not just that
                  you did.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Button href={ctaHref} className="cta-lift">
                    {ctaLabel}
                  </Button>
                  <Button href="#how-it-works" variant="outline">
                    See how it works
                  </Button>
                </div>
              </div>

              <Panel style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 18px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 12, color: "var(--fg)" }}>Hostel 4B</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    />
                    live &middot; streak 12
                  </span>
                </div>
                <div
                  style={{
                    padding: "18px 20px",
                    background: "var(--raise)",
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: "11.5px",
                    lineHeight: 1.9,
                    color: "var(--muted)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--accent)" }}>def</span> two_sum(nums, target):
                  </div>
                  <div style={{ paddingLeft: 16 }}>seen = {"{}"}</div>
                  <div style={{ paddingLeft: 16 }}>
                    <span style={{ color: "var(--accent)" }}>for</span> i, n{" "}
                    <span style={{ color: "var(--accent)" }}>in</span> enumerate(nums):
                  </div>
                  <div style={{ paddingLeft: 32 }}>
                    <span style={{ color: "var(--accent)" }}>if</span> target - n{" "}
                    <span style={{ color: "var(--accent)" }}>in</span> seen:
                  </div>
                  <div style={{ paddingLeft: 48, color: "var(--fg)" }}>return [seen[target - n], i]</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 18px",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  {PRESENCE.map((p) => (
                    <span
                      key={p.name}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "10.5px", color: "var(--muted)" }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: p.active ? "var(--accent)" : "var(--line)",
                        }}
                      />
                      {p.name}
                    </span>
                  ))}
                </div>
              </Panel>
            </div>
          </Reveal>
        </div>

        {/* why crux */}
        <div id="how-it-works" style={{ borderTop: "1px solid var(--line)", padding: "56px 0" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(22px, 3vw, 28px)",
              color: "var(--fg)",
              margin: "0 0 36px",
              maxWidth: 480,
            }}
          >
            Three rules, nothing else competing for attention.
          </h2>
          <div>
            {PILLARS.map((p, i) => (
              <Reveal key={p.k} delay={i * 0.08}>
                <div
                  className="pillar-row"
                  style={{
                    padding: "24px 0",
                    borderTop: i === 0 ? "1px solid var(--line)" : "none",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono)",
                      fontSize: 28,
                      fontWeight: 700,
                      color: "var(--line)",
                    }}
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, color: "var(--accent)", margin: "0 0 8px" }}>{p.k}</p>
                    <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.7, margin: 0, maxWidth: 480 }}>
                      {p.v}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* close */}
        <div style={{ borderTop: "1px solid var(--line)", padding: "56px 0 80px", textAlign: "center" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(22px, 3vw, 28px)",
              color: "var(--fg)",
              margin: "0 0 24px",
            }}
          >
            Get your hostel back into it.
          </h3>
          <Button href={ctaHref} className="cta-lift" icon={<ArrowUpRight size={14} weight="bold" />} iconPosition="right">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
