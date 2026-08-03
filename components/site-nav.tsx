import Link from "next/link";
import { auth } from "@/auth";
import { getUserCrews } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";

/** Global header used on pages that otherwise have no way back to the rest
 * of the app (signin, crew/new, solution detail) and on the landing page
 * (replacing its old bespoke nav). Crew home and the room keep their own
 * nav-equivalents (sidebar / top bar) and don't render this — so, unlike
 * CrewSwitcher, this has no notion of an "active" crew to highlight. */
export async function SiteNav() {
  const session = await auth();
  const crews = session?.user?.id ? await getUserCrews(session.user.id) : [];
  const crewHref = crews.length === 0 ? "/crew/new" : `/crew/${crews[0].crewId}`;
  const crewLabel = crews.length === 0 ? "Create or join a crew" : crews.length === 1 ? "Your crew" : "Your crews";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 64,
        padding: "0 clamp(20px, 4vw, 40px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        CRUX
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/practice" style={{ fontSize: 12, color: "var(--muted)" }}>
          Practice
        </Link>
        {session ? (
          <Button href={crewHref} size="sm">
            {crewLabel}
          </Button>
        ) : (
          <Button href="/signin" size="sm">
            Sign in
          </Button>
        )}
      </div>
    </div>
  );
}
