# Crew Practice Transparency — Plan 3: Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's current dark/light editorial identity with the approved dark-only system — warm near-black + acid-yellow on the landing page, cooler near-black elsewhere — and retire the light-mode toggle and the decorative plus-mark/Archivo treatment it depended on.

**Architecture:** The existing app already routes nearly all color through CSS custom properties (`var(--bg)`, `var(--panel)`, `var(--line)`, etc.) rather than literal hex values, so most pages re-skin automatically once `globals.css`'s `:root` values change. Two screens get a full layout rebuild to match the approved mockups (landing, crew home); everything else gets a lighter retheme pass (font-variable swap, remove the retired components).

**Tech Stack:** Next.js 14 App Router, CSS custom properties, `next/font/google` (Instrument Serif, Inter, JetBrains Mono).

## Global Constraints

- **Prerequisite: Plans 1 and 2 should be merged first**, or at minimum this plan's Task 3 (crew home rebuild) needs Plan 2's `getCrewSolutionsForProblem`-backed activity data to already exist — this plan only changes how that data is *rendered*, not what it is.
- Dark-only, no light mode: `ThemeToggle` and the `html[data-theme="light"]` CSS block are removed entirely, not just unused (spec: Visual/UX direction).
- The landing page uses its own warm-black literal values (per spec: `--bg-base: #0E0D0B` family); every other page continues to use the shared `var(--bg)`/`var(--panel)`/etc. custom properties, now repointed to the cooler near-black app palette. Two palettes, not one — do not collapse them into a single token set.
- No page in this plan changes functional behavior established in Plans 1/2 (data fetching, the submit-gate, checkpoint posting) — this plan only changes markup and styling.
- There is no visual regression testing set up in this project. Each task ends with a manual dev-server check instead of an automated visual test, matching the precedent set in Plan 2's Task 6 — this is stated explicitly per task, not silently skipped.

---

## File Structure

- `app/globals.css` (modified) — new dark-only `:root` token values; light-theme block and now-orphaned `mark`/`rise`/`blink`/`rail` keyframes removed.
- `app/layout.tsx` (modified) — swap `Archivo` for `Instrument_Serif` + `Inter`, keep `JetBrains_Mono`; remove the light/dark theme-init script and `data-theme` attribute.
- `app/page.tsx` (modified) — full rebuild of the landing page per the approved `landing-v2` mockup.
- `app/crew/[crewId]/page.tsx` (modified) — full rebuild: sidebar + main-canvas layout per the approved `agenta-ref` mockup, keeping all of Plan 1/2's data-fetching logic.
- `app/signin/sign-in-panel.tsx` (modified) — font-variable retheme only.
- `app/crew/new/page.tsx` (modified) — font-variable retheme only.
- `app/crew/[crewId]/room/room-client.tsx` (modified) — font-variable retheme, remove `ThemeToggle`.
- `components/theme-toggle.tsx` (deleted).
- `components/plus-marks.tsx` (deleted).

---

### Task 1: Dark-only design tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `var(--bg)`, `var(--panel)`, `var(--raise)`, `var(--fg)`, `var(--muted)`, `var(--line)`, `var(--accent)`, `var(--accent-fg)`, `var(--ok)` — same custom property **names** as today (so every not-yet-touched page in this plan re-skins with zero markup changes), new dark-only **values**. New `--font-display` (Instrument Serif) and `--font-inter` (Inter) custom properties from `layout.tsx`, alongside the existing `--font-jetbrains-mono`.

- [ ] **Step 1: Replace the `:root` and remove the light theme block**

In `app/globals.css`, replace:

```css
:root {
  --bg: oklch(0.152 0.004 70);
  --panel: oklch(0.192 0.005 70);
  --raise: oklch(0.225 0.005 70);
  --fg: oklch(0.965 0.004 85);
  --muted: oklch(0.635 0.008 75);
  --line: oklch(0.298 0.006 70);
  --accent: oklch(0.81 0.12 78);
  --accent-fg: oklch(0.17 0.02 78);
  --ok: oklch(0.81 0.12 78);
}

html[data-theme="light"] {
  --bg: oklch(0.985 0.003 85);
  --panel: oklch(0.962 0.004 85);
  --raise: oklch(1 0 0);
  --fg: oklch(0.18 0.006 70);
  --muted: oklch(0.475 0.008 75);
  --line: oklch(0.878 0.005 80);
  --accent: oklch(0.58 0.11 68);
  --accent-fg: oklch(0.99 0.01 85);
  --ok: oklch(0.55 0.1 68);
}
```

with:

```css
:root {
  --bg: #0c0c0e;
  --panel: #16171b;
  --raise: #1e2024;
  --fg: #f6f5f3;
  --muted: #9a968e;
  --line: #232427;
  --accent: #eae23c;
  --accent-fg: #161503;
  --ok: #22c55e;
}
```

This is the "cooler near-black" app palette from the spec, shared by every page except the landing page (which carries its own warm-black literal values in Task 2, not these tokens).

- [ ] **Step 2: Remove the now-orphaned keyframes**

In `app/globals.css`, delete the `@keyframes mark`, `@keyframes rise`, and `@keyframes blink` blocks. `@keyframes up`, `@keyframes fade`, and `@keyframes pulse` stay — `pulse` is still used by `room-client.tsx` (untouched by this task), and `up`/`fade` are used broadly across pages this plan retains.

`@keyframes rail` also becomes orphaned once Task 2/3 land (it's currently only referenced by `app/page.tsx`, which Task 2 rewrites) — leave it in place for now and remove it in Task 5's cleanup pass once nothing references it, to avoid breaking a task ordering dependency mid-file.

- [ ] **Step 3: Swap fonts in `app/layout.tsx`**

Replace:

```ts
import { Archivo, JetBrains_Mono } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});
```

with:

```ts
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
```

- [ ] **Step 4: Remove the theme-init script and `data-theme`, update the `<body>` className**

Replace:

```tsx
// Read the persisted theme before paint to avoid a flash of the wrong theme.
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${archivo.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

with:

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

The site is dark-only now, so there's nothing to read from `localStorage` or flash-protect against.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in every file still referencing `var(--font-archivo)` or `<ThemeToggle />` — that's expected at this point in the plan; Tasks 2-4 fix each one. Confirm the error list matches: `app/page.tsx`, `app/crew/[crewId]/page.tsx`, `app/signin/sign-in-panel.tsx`, `app/crew/new/page.tsx`, `app/crew/[crewId]/room/room-client.tsx`. If any *other* file errors, investigate before continuing — it means something unexpected also depended on the removed script/attribute.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: replace light/dark theme with the dark-only design token system"
```

---

### Task 2: Rebuild the landing page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `auth()`, `getUserCrewId()` — same data dependencies as the current landing page; only the markup changes.
- Produces: no new exports; this is the page component itself.

- [ ] **Step 1: Replace the page**

```tsx
// app/page.tsx
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
          maxWidth: "76%",
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
```

This drops the "one loop" pillar from the original three (which referenced a global daily/weekly problem) in favor of "no rank" — the original copy no longer matches reality post-Plan-1 (challenges are per-crew now, chosen by the leader), and "no rank" states the feature's actual differentiator directly, matching the approved mockup's copy.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `app/page.tsx` no longer errors. Errors should remain only in the files Tasks 3-4 haven't touched yet.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, visit `/`. Confirm: warm near-black background, framed lighter-toned column with visible dark gutters on both sides, serif headline with the highlighted "crew" word, nav/CTA both work (sign-in redirect when logged out, correct crew link when logged in).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rebuild the landing page in the approved warm-black design system"
```

---

### Task 3: Rebuild the crew home page

**Files:**
- Modify: `app/crew/[crewId]/page.tsx`

**Interfaces:**
- Consumes: everything Plan 1/2 already wired up on this page — `getTodaysProblem`, `getWeeklyProblems`, `getCrewSolutionsForProblem`, `crews`/`crewMembers` queries. This task only changes the returned JSX, not any of the `await` calls above it.

- [ ] **Step 1: Replace the returned JSX**

Keep every line of `app/crew/[crewId]/page.tsx` **above** the `return (` unchanged (all the data fetching from Plans 1/2, including the `activity` array built in Plan 2's Task 8) — only the component's return value changes. Replace the full `return (...)` block with:

```tsx
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      <div style={{ width: 200, background: "var(--panel)", borderRight: "1px solid var(--line)", padding: "20px 14px", flexShrink: 0 }}>
        <p style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 13, color: "var(--fg)", margin: "0 0 20px" }}>
          {crew.name}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          <div style={{ background: "var(--raise)", borderRadius: 6, padding: "6px 10px", color: "var(--fg)" }}>Today</div>
        </div>
        <div style={{ marginTop: 28, background: "var(--raise)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
          <p style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10.5px", color: "var(--accent)", margin: "0 0 4px" }}>
            {crew.currentStreak}-day streak
          </p>
          <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0 }}>invite code {crew.inviteCode}</p>
        </div>
        <span
          style={{
            display: "block",
            marginTop: 10,
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: "10.5px",
            letterSpacing: "0.08em",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          {initials}
        </span>
      </div>

      <div style={{ flex: 1, padding: "28px 32px", maxWidth: 720 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
          <p
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: "9.5px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted)",
              margin: "0 0 6px",
            }}
          >
            today &middot; {members.length} in the crew
          </p>
          <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: 16, color: "var(--fg)", margin: "0 0 4px" }}>
            {todaysProblem.title}
          </p>
          <p style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10.5px", color: "var(--muted)", margin: "0 0 14px" }}>
            {todaysProblem.difficulty} &middot; {todaysProblem.topicTag}
          </p>
          <Link
            href={`/crew/${crew.id}/room`}
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--accent-fg)",
              fontSize: "11.5px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "10px 18px",
              borderRadius: 6,
            }}
          >
            Open room &rarr;
          </Link>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 6px" }}>
            This week: {weeklyTopics.join(", ")} &middot; {weeklyDone} of {weeklyTotal} done
          </p>
          <div style={{ height: 3, background: "var(--line)", overflow: "hidden", borderRadius: 2 }}>
            <div style={{ width: `${weeklyPct}%`, height: "100%", background: "var(--accent)" }} />
          </div>
        </div>

        <p
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: "9.5px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--muted)",
            margin: "0 0 8px",
          }}
        >
          crew log
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activity.map((a) => (
            <div
              key={a.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 4px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: 12,
                  color: "var(--fg)",
                  flex: 1,
                }}
              >
                {a.label}
              </span>
              {a.link && (
                <Link href={a.link} style={{ fontSize: "10.5px", color: "var(--accent)" }}>
                  view &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
```

- [ ] **Step 2: Remove the now-unused `PlusMarks`/`ThemeToggle` imports**

At the top of the file, remove:

```ts
import { PlusMarks } from "@/components/plus-marks";
import { ThemeToggle } from "@/components/theme-toggle";
```

Neither is referenced by the new JSX from Step 1.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `app/crew/[crewId]/page.tsx` no longer errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in, open a crew's home page. Confirm: sidebar shows crew name, streak, invite code; main canvas shows today's problem card and the crew log with locked/unlocked rows exactly as Plan 2 wired them, now in the cooler-black app palette instead of the old bordered-grid look.

- [ ] **Step 5: Commit**

```bash
git add "app/crew/[crewId]/page.tsx"
git commit -m "feat: rebuild crew home with sidebar layout in the app design system"
```

---

### Task 4: Retheme remaining pages

**Files:**
- Modify: `app/signin/sign-in-panel.tsx:14,18,37,38`
- Modify: `app/crew/new/page.tsx` (three `var(--font-archivo)` + `fontVariationSettings` sites)
- Modify: `app/crew/[crewId]/room/room-client.tsx:6,352,422,423`

**Interfaces:**
- No new exports. This task swaps the retired font variable for the new one and removes `ThemeToggle` from the room. All `var(--bg)`/`var(--panel)`/`var(--line)`/etc. references in these files are untouched and pick up Task 1's new values automatically.

- [ ] **Step 1: `app/signin/sign-in-panel.tsx`**

At both of the two locations using:

```ts
fontFamily: "var(--font-archivo), sans-serif",
```

change to:

```ts
fontFamily: "var(--font-display), serif",
```

and remove the `fontVariationSettings: "'wdth' 70",` line at both locations (Instrument Serif has no `wdth` axis).

- [ ] **Step 2: `app/crew/new/page.tsx`**

At all three locations using:

```ts
fontFamily: "var(--font-archivo), sans-serif",
fontVariationSettings: "'wdth' 70",
```

change to just:

```ts
fontFamily: "var(--font-display), serif",
```

(dropping the `fontVariationSettings` line, same reason as Step 1). Also drop `textTransform: "uppercase"` from these three headings — the new display face is a serif meant to be read in sentence case (matches the landing page treatment from Task 2); leaving uppercase on a serif reads as a mismatched holdover from the old all-caps grotesque treatment.

- [ ] **Step 3: `app/crew/[crewId]/room/room-client.tsx`**

Remove the import:

```ts
import { ThemeToggle } from "@/components/theme-toggle";
```

Remove its usage:

```tsx
<ThemeToggle style={{ padding: "6px 10px", fontSize: 10 }} />
```

(Check the surrounding JSX after removal — if this was the only child of a flex container meant to hold multiple controls, leave the container in place with its remaining children; if it was the sole child, remove the now-empty wrapper too. Read the ~10 lines around line 352 before removing to confirm which case applies.)

At the two `fontFamily: "var(--font-archivo), sans-serif"` / `fontVariationSettings: "'wdth' 70"` sites (around line 422-423), apply the same swap as Steps 1-2: `fontFamily: "var(--font-display), serif"`, drop the variation-settings line.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project. This is the first point in Plan 3 where the whole project type-checks clean again — Task 1 intentionally left it broken as a checklist for exactly these three files.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Visit `/signin`, `/crew/new`, and a crew's `/room` page. Confirm: no `ThemeToggle` button appears anywhere, headings render in Instrument Serif instead of the old bold uppercase grotesque, and every page reads in the new cooler near-black palette with no leftover light-mode styling.

- [ ] **Step 6: Commit**

```bash
git add app/signin/sign-in-panel.tsx "app/crew/new/page.tsx" "app/crew/[crewId]/room/room-client.tsx"
git commit -m "feat: retheme signin, crew setup, and room to the new dark-only design system"
```

---

### Task 5: Retire the plus-marks and theme-toggle components

**Files:**
- Delete: `components/theme-toggle.tsx`
- Delete: `components/plus-marks.tsx`
- Modify: `app/globals.css` (remove the now-fully-orphaned `@keyframes rail`)

**Interfaces:**
- Removes two exports (`ThemeToggle`, `PlusMarks`) that, after Tasks 2-4, have no remaining importers anywhere in the codebase.

- [ ] **Step 1: Confirm there are no remaining references**

Run: `grep -rln "ThemeToggle\|PlusMarks" --include="*.tsx" --include="*.ts" app components`
Expected: no output. If anything prints, stop and fix that file before deleting — this plan's earlier tasks were supposed to remove every usage, and a leftover reference means something was missed.

- [ ] **Step 2: Delete the files**

```bash
rm components/theme-toggle.tsx components/plus-marks.tsx
```

- [ ] **Step 3: Remove the now-orphaned `rail` keyframe**

In `app/globals.css`, delete the `@keyframes rail { ... }` block — its only consumer was `app/page.tsx`, which Task 2 already rewrote without it.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests from Plans 1 and 2 still pass — this task touches no logic they cover, only dead markup/CSS.

- [ ] **Step 6: Commit**

```bash
git add -u components/theme-toggle.tsx components/plus-marks.tsx app/globals.css
git commit -m "chore: remove the retired light-mode toggle and plus-mark decoration"
```

---

## Plan Self-Review

- **Spec coverage:** "Two dark palettes, no light mode" → Task 1 (tokens) + Task 2 (landing's own warm-black literals). "Signature pattern — the crew log row" → already built functionally in Plan 2; Task 3 here is purely its visual finish. Type/layout/component conventions from the spec's Visual/UX direction section are followed in Tasks 2-3's mockup-derived markup.
- **Placeholder scan:** no TBD/TODO; every step has real code or an explicit, justified manual-verification note (consistent with Plan 2's precedent).
- **Type consistency:** `var(--font-display)` and `var(--font-inter)` (introduced in Task 1) are the only two font-variable names used across Tasks 2-4 — no task invents a third alias. The `PALETTE` object in Task 2 stays local to `app/page.tsx` (it's intentionally *not* a shared token, per the Global Constraints note that the landing page's warm-black values are its own, separate from the shared `var(--bg)` family every other page uses).
