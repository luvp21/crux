import Link from "next/link";
import { requireSession, getUserCrews } from "@/lib/auth-helpers";
import { SiteNav } from "@/components/site-nav";
import { createCrew, joinCrew } from "./actions";

export default async function CrewSetupPage() {
  const session = await requireSession();
  const crews = await getUserCrews(session.user.id);
  const hasCrews = crews.length > 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      <SiteNav />
      <div style={{ minHeight: "calc(100vh - 104px)", display: "grid", placeItems: "center", padding: "48px 24px" }}>
      <div style={{ width: "100%", maxWidth: 820, animation: "up 500ms ease both" }}>
        <div style={{ textAlign: "center", marginBottom: hasCrews ? 32 : 48 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: "10.5px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 14,
            }}
          >
            crew.init // max 8 nodes
          </div>
          <h2
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: 700,
              fontSize: 40,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              margin: "0 0 12px",
            }}
          >
            {hasCrews ? "Add another crew" : "Start where your friends are"}
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
            {hasCrews
              ? "Add another crew, or jump back into one you're already in."
              : "Crews are free to make. Join as many as your friends run."}
          </p>
        </div>

        {hasCrews && (
          <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
            {crews.map((c) => (
              <Link
                key={c.crewId}
                href={`/crew/${c.crewId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--line)",
                  fontSize: "12.5px",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--fg)" }}>{c.crewName}</span>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {c.role}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: "10.5px",
                    color: "var(--accent)",
                  }}
                >
                  {c.crewStreak}-day streak
                </span>
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid var(--line)" }}>
          <form
            action={createCrew}
            style={{ padding: "30px 28px", borderRight: "1px solid var(--line)", background: "var(--panel)" }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: "10.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 14,
              }}
            >
              01 / create
            </div>
            <h3
              style={{
                fontFamily: "var(--font-inter)",
                fontWeight: 700,
                fontSize: 20,
                margin: "0 0 10px",
              }}
            >
              Create a crew
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 22px", lineHeight: 1.65 }}>
              You get an invite code to drop in the group chat.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="text"
                name="name"
                placeholder="crew name"
                required
                style={{
                  width: "100%",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  padding: "13px 14px",
                  fontSize: "12.5px",
                  color: "var(--fg)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  border: "none",
                  padding: 13,
                  fontSize: "11.5px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Create crew
              </button>
            </div>
          </form>

          <form action={joinCrew} style={{ padding: "30px 28px" }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: "10.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 14,
              }}
            >
              02 / join
            </div>
            <h3
              style={{
                fontFamily: "var(--font-inter)",
                fontWeight: 700,
                fontSize: 20,
                margin: "0 0 10px",
              }}
            >
              Join with a code
            </h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 22px", lineHeight: 1.65 }}>
              Six characters, from whoever set it up.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="text"
                name="code"
                placeholder="A7K2QM"
                required
                maxLength={6}
                style={{
                  width: "100%",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  padding: "13px 14px",
                  fontSize: 13,
                  color: "var(--fg)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "none",
                  border: "1px solid var(--line)",
                  color: "var(--fg)",
                  padding: 13,
                  fontSize: "11.5px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Join crew
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
