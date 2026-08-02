import Link from "next/link";
import { auth } from "@/auth";
import { getUserCrewId } from "@/lib/auth-helpers";
import { PlusMarks } from "@/components/plus-marks";
import { ThemeToggle } from "@/components/theme-toggle";

const PILLARS = [
  {
    k: "one room",
    v: "Everyone lands on the same problem in the same editor. No lobby, no setup.",
    delay: 520,
  },
  {
    k: "one streak",
    v: "The crew keeps a single streak. If one person shows up, nobody loses it.",
    delay: 620,
  },
  {
    k: "one loop",
    v: "A daily problem and a weekly set. Nothing else competing for attention.",
    delay: 720,
  },
];

export default async function LandingPage() {
  const session = await auth();
  const crewId = session?.user?.id ? await getUserCrewId(session.user.id) : null;
  const ctaHref = !session ? "/signin" : crewId ? `/crew/${crewId}` : "/crew/new";
  const ctaLabel = !session ? "Create a crew" : crewId ? "Go to your crew" : "Create a crew";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
      <div style={{ borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            position: "relative",
            maxWidth: 1240,
            margin: "0 auto",
            borderLeft: "1px solid var(--line)",
            borderRight: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 76,
            padding: "0 32px",
          }}
        >
          <PlusMarks corners={["top-left", "top-right", "bottom-left", "bottom-right"]} />
          <div
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 19,
              letterSpacing: "0.01em",
              fontVariationSettings: "'wdth' 70",
            }}
          >
            CRUX
          </div>
          <div
            style={{
              display: "flex",
              gap: 30,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {session ? (
              <Link href={crewId ? `/crew/${crewId}` : "/crew/new"}>Your crew</Link>
            ) : (
              <Link href="/signin">Sign in</Link>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle />
            <Link
              href={ctaHref}
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
                border: "none",
                padding: "9px 18px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          borderLeft: "1px solid var(--line)",
          borderRight: "1px solid var(--line)",
          padding: "0 32px",
        }}
      >
        <PlusMarks corners={["bottom-left", "bottom-right"]} />
        <div style={{ padding: "104px 0 88px", textAlign: "center", position: "relative" }}>
          <div
            style={{
              animation: "fade 600ms ease both",
              fontSize: "11.5px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 26,
            }}
          >
            system.online // crew.sync
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 12,
                background: "var(--accent)",
                marginLeft: 6,
                verticalAlign: -1,
                animation: "blink 1.1s steps(1, end) infinite",
              }}
            >
              &nbsp;
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontVariationSettings: "'wdth' 70",
              fontWeight: 800,
              fontSize: 82,
              lineHeight: 0.94,
              letterSpacing: "-0.015em",
              textTransform: "uppercase",
              margin: "0 auto 28px",
              maxWidth: "15ch",
            }}
          >
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={{ display: "block", animation: "rise 720ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both" }}>
                Practice DSA
              </span>
            </span>
            <span style={{ display: "block", overflow: "hidden" }}>
              <span style={{ display: "block", animation: "rise 720ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both" }}>
                with your crew
              </span>
            </span>
          </h1>
          <p
            style={{
              animation: "up 600ms ease 140ms both",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--muted)",
              margin: "0 auto 40px",
              maxWidth: "58ch",
            }}
          >
            One room, one problem, one shared streak. Bring the four people you already grind with
            and keep each other honest until placements.
          </p>
          <div
            style={{
              animation: "up 600ms ease 220ms both",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 14,
            }}
          >
            <Link
              href={ctaHref}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--accent)",
                color: "var(--accent-fg)",
                border: "none",
                padding: "15px 30px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {ctaLabel} <span style={{ fontWeight: 400 }}>&rarr;</span>
            </Link>
            <Link
              href="/crew/new"
              style={{
                background: "none",
                border: "1px solid var(--line)",
                color: "var(--fg)",
                padding: "15px 26px",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Join with code
            </Link>
          </div>
          <div
            style={{
              animation: "fade 800ms ease 400ms both",
              marginTop: 34,
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            1 842 crews active &middot; streaks.today: 611
          </div>
        </div>

        <div
          style={{
            animation: "up 700ms ease 300ms both",
            border: "1px solid var(--line)",
            background: "var(--panel)",
            marginBottom: 88,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderBottom: "1px solid var(--line)",
              fontSize: "10.5px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--accent)",
                  display: "inline-block",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              cse-2027-nightshift &middot; 4 online
            </div>
            <span>live</span>
          </div>
          <div style={{ padding: "22px 18px", fontSize: "12.5px", lineHeight: 2, color: "var(--muted)" }}>
            <div style={{ animation: "up 420ms cubic-bezier(0.16, 1, 0.3, 1) 520ms both" }}>
              <span style={{ color: "var(--accent)" }}>def</span> two_sum(nums, target):
            </div>
            <div style={{ animation: "up 420ms cubic-bezier(0.16, 1, 0.3, 1) 620ms both", paddingLeft: "3ch" }}>
              seen = {"{}"}
            </div>
            <div style={{ animation: "up 420ms cubic-bezier(0.16, 1, 0.3, 1) 720ms both", paddingLeft: "3ch" }}>
              <span style={{ color: "var(--accent)" }}>for</span> i, n{" "}
              <span style={{ color: "var(--accent)" }}>in</span> enumerate(nums):
            </div>
            <div style={{ animation: "up 420ms cubic-bezier(0.16, 1, 0.3, 1) 820ms both", paddingLeft: "6ch" }}>
              <span style={{ color: "var(--accent)" }}>if</span> target - n{" "}
              <span style={{ color: "var(--accent)" }}>in</span> seen:
            </div>
            <div style={{ animation: "up 420ms cubic-bezier(0.16, 1, 0.3, 1) 920ms both", paddingLeft: "9ch" }}>
              <span style={{ color: "var(--accent)" }}>return</span> [seen[target - n], i]
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderTop: "1px solid var(--line)",
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            <span>aditi.m solved it &middot; 2 min ago</span>
            <span style={{ color: "var(--accent)" }}>streak 23</span>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            borderTop: "1px solid var(--line)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
          }}
        >
          <PlusMarks corners={["top-left", "top-right"]} offset={-32} />
          {PILLARS.map((p) => (
            <div
              key={p.k}
              style={{
                padding: "26px 24px 26px 0",
                borderRight: "1px solid var(--line)",
                animation: `up 620ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}ms both`,
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: 10,
                }}
              >
                {p.k}
              </div>
              <div style={{ fontSize: "12.5px", lineHeight: 1.7, color: "var(--muted)" }}>{p.v}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            position: "relative",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "26px 0 34px",
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          <PlusMarks corners={["top-left", "top-right"]} offset={-32} />
          <span
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.02em",
              color: "var(--fg)",
              fontVariationSettings: "'wdth' 70",
            }}
          >
            CRUX
          </span>
          <span>Free while in beta &middot; python / c++ / java</span>
        </div>
      </div>
    </div>
  );
}
