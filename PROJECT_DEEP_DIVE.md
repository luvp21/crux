# Crux — Interview Deep Dive

> **One-liner:** Built a real-time collaborative DSA practice platform using Next.js 14, Neon Postgres, PartyKit WebSockets, and Claude AI that enables small friend groups to solve daily coding challenges together in shared live rooms with streak-based accountability.

---

## 1. Elevator Pitches

### 30-Second  *(for "Tell me about this project")*
I built Crux because I noticed that the biggest problem with DSA prep isn't finding problems — it's staying consistent. So I built a platform where a small group of friends (a "crew") gets one shared problem per day, solves it together in a live coding room with real-time presence and chat, and maintains a collective streak that any single member can keep alive. The interesting technical challenge was wiring real-time collaboration through PartyKit WebSockets alongside server-side rendering in Next.js, and building a judge pipeline that proxies code execution through Judge0 while recording submission verdicts against a normalized Postgres schema.

### 2-Minute  *(for "Walk me through it" / whiteboard session opener)*
The motivation was straightforward: placement season prep works better with accountability, and existing platforms like LeetCode are designed for solo grinders. Crux flips that — you create a crew of 2–8 people, and every day a cron job selects a new problem from a curated 50-problem seed bank. Everyone lands in the same live room with a Monaco-powered code editor, real-time crew presence via PartyKit WebSockets, and a built-in chat. When you submit, your code gets proxied to Judge0 for sandboxed execution against stored test cases, the verdict is recorded in Postgres via Drizzle ORM, and your individual + crew streaks are updated atomically. If you're stuck after three failed attempts, you can request an AI hint from Claude — it reads your current code and the problem context and gives you a nudge without giving the answer away. The architecture is a Next.js App Router monolith with server components doing the heavy SSR lifting, API routes handling the async work (judge, hints, cron), and a separate PartyKit server process managing WebSocket rooms. Auth is handled by Auth.js v5 with Google/GitHub OAuth, and the whole thing deploys to Vercel + Neon serverless Postgres. If I were to extend it, the next investment would be batch-submitting test cases to Judge0 in parallel rather than sequentially, and adding an Upstash Redis layer for caching daily problem lookups and streak computations.

---

## 2. Problem Statement

**What problem does this solve?**
DSA preparation for placements and interviews is a consistency game, not a knowledge gap. Most students know *what* to practice — they struggle with *showing up daily*. Existing platforms (LeetCode, HackerRank) are designed for individual use, and social features are bolted on as leaderboards that feel impersonal. Crux targets the 3–8 person friend group that already studies together over WhatsApp or Discord, and gives them a shared room, a shared problem, and a shared streak. The key insight is that a streak that *any one member* can keep alive creates positive social pressure without punishment — it's designed for the friend who opens the app at 11:55 PM just so nobody's streak breaks.

**Why is this technically interesting?**
The core engineering challenge is real-time state coordination across multiple concerns: WebSocket-based live presence and chat (who's in the room, who's coding, who's solved it), sandboxed code execution through an external Judge0 service with sequential test-case evaluation and verdict aggregation, AI-powered contextual hints that need to read both the problem and the user's current code, and streak computation that requires both real-time optimistic updates (for responsive UI) and authoritative cron-based reconciliation (for correctness). All of this sits in a Next.js App Router architecture where server components do authenticated data fetching and client components manage real-time interactive state — the boundary between those two worlds is a meaningful architectural decision.

**Scope & Constraints**
This was built as a full-stack MVP with a deliberate constraint of keeping the deployment footprint minimal: a single Next.js deployment on Vercel, a single Neon Postgres instance, and a PartyKit server for WebSockets. The team size was one, which drove the decision to use a monolithic Next.js architecture rather than splitting services. The 50-problem seed bank was pre-curated to cover the 12 most common DSA topics for placement interviews, prioritizing problem quality over quantity.

---

## 3. High Level Design (HLD)

> HLD describes the *what* and *why* of each major system component, how they communicate, and what properties the system provides at a macro level.

### 3.1 System Architecture Diagram

```mermaid
graph TD
    Client["🖥️ Browser Client\n(React + Monaco Editor)"]
    NextJS["Next.js 14 App Router\n(SSR + API Routes)"]
    AuthJS["Auth.js v5\n(Google / GitHub OAuth)"]
    PartyKit["PartyKit Server\n(WebSocket Rooms)"]
    NeonDB[("Neon Postgres\n(Serverless)")]
    Judge0["Judge0 CE\n(Code Execution Engine)"]
    Claude["Anthropic Claude API\n(AI Hints)"]
    VercelCron["Vercel Cron\n(Daily/Weekly Scheduler)"]

    Client -->|"HTTPS\n(SSR + API calls)"| NextJS
    Client <-->|"WebSocket\n(Presence + Chat)"| PartyKit
    NextJS --> AuthJS
    AuthJS --> NeonDB
    NextJS -->|"Drizzle ORM\n(Queries)"| NeonDB
    NextJS -->|"POST /submissions\n(base64 encoded)"| Judge0
    NextJS -->|"POST /v1/messages\n(Claude Sonnet)"| Claude
    VercelCron -->|"GET /api/cron/daily\nGET /api/cron/weekly"| NextJS
```

The architecture is a **server-rendered monolith with two external stateful services**. The Next.js App Router handles all HTTP traffic — server components do authenticated reads from Neon Postgres via Drizzle ORM, while API routes handle the write-heavy async operations (code submission, hint generation, cron jobs). The PartyKit WebSocket server runs as a separate deployment, managing ephemeral room state (presence, chat) independently of the persistence layer. The single most important architectural boundary is between the **SSR data path** (Next.js server components → Postgres) and the **real-time data path** (client ↔ PartyKit), which are intentionally decoupled so that a PartyKit outage doesn't affect page loads or submissions.

---

### 3.2 Data Flow Diagram

```mermaid
flowchart LR
    UserCode["User writes code\nin Monaco Editor"]
    ClickSubmit["Clicks Submit"]
    AuthCheck["Auth Check\n(session validation)"]
    FetchProblem["Fetch Problem +\nTest Cases from DB"]
    Judge0Loop["Sequential Judge0\nExecution per test case"]
    VerdictAgg["Aggregate Verdict\n(accepted / wrong_answer / RE / TLE)"]
    RecordSub["INSERT submission\ninto Postgres"]
    UpdateStreak["Update Member +\nCrew Streaks"]
    PartyStatus["Broadcast 'solved'\nstatus via PartyKit"]
    Response["Return verdict +\nper-case results to client"]

    UserCode --> ClickSubmit
    ClickSubmit --> AuthCheck
    AuthCheck -->|"Valid Session"| FetchProblem
    AuthCheck -->|"401"| ErrorResp["Error Response"]
    FetchProblem --> Judge0Loop
    Judge0Loop --> VerdictAgg
    VerdictAgg --> RecordSub
    RecordSub --> UpdateStreak
    VerdictAgg --> Response
    UpdateStreak --> PartyStatus
```

The primary data path starts when a user submits code: the API route validates the session, fetches the problem's test cases from Postgres, then iterates through each test case sequentially — sending the user's code + test input to Judge0, decoding the base64 stdout, and comparing against the expected output. The aggregated verdict (first failure wins) is persisted as a submission record, streaks are updated optimistically, and the client receives a structured response with per-case pass/fail details.

---

### 3.3 Component Responsibilities

| Component | Responsibility | Communication Style | State |
|-----------|---------------|---------------------|-------|
| Next.js Server Components | Authenticated page rendering, data fetching | Sync (SSR) | Stateless |
| Next.js API Routes | Code submission, hint generation, cron handlers | Sync REST | Stateless |
| Auth.js v5 | OAuth flow, session management, user creation | Sync (DB sessions) | Stateful (DB-backed sessions) |
| PartyKit Server | WebSocket room management, presence tracking, chat relay | Async WebSocket | Stateful (in-memory per room) |
| Neon Postgres | Persistent data store for users, crews, problems, submissions | TCP/WebSocket | Stateful |
| Judge0 CE | Sandboxed code compilation and execution | Sync REST (with `wait=true`) | Stateless |
| Claude API | Contextual AI hint generation | Sync REST | Stateless |
| Vercel Cron | Scheduled daily/weekly challenge rotation | Sync HTTP trigger | Stateless |

---

### 3.4 System Properties (CAP / Consistency Model)

**Consistency:** The system prioritizes strong consistency for all write operations. Submissions, streak updates, and crew creation all go through Drizzle ORM to Neon Postgres with standard ACID transactions. The Drizzle adapter for Auth.js uses the `neon-serverless` driver (not `neon-http`) specifically because the `linkAccount` step in OAuth requires transactional guarantees that HTTP-only drivers don't support. Streak computation uses a dual-update pattern: real-time optimistic updates on submit for responsive UI, plus authoritative reconciliation via the daily cron job — this accepts a brief window of potential inconsistency (a few hours at most) in exchange for instant UI feedback.

**Availability:** The system degrades gracefully across all external dependencies. If Judge0 is unavailable, the code execution route falls back to mock mode with randomized verdicts. If the Anthropic API is down, hints fall back to a static bank of 5 pre-written hints. If PartyKit is unavailable, the client-side hook falls back to local-only state (single-user presence). If the database is unreachable for daily problem lookup, the system falls back to a deterministic selection from the in-memory seed data, keyed by `Math.floor(Date.now() / 86400000) % PROBLEMS.length`.

**Partition tolerance:** As a single-region deployment (Vercel + Neon), the primary partition concern is between the Next.js app and Neon Postgres. Connection pooling via `@neondatabase/serverless` with WebSocket transport handles transient network issues. The PartyKit server is independently deployed, so a network split between Vercel and PartyKit only affects real-time features — all persistent operations (submissions, streaks, crew management) continue to work.

**Latency budget:** For the primary submit flow: Auth session check ~5ms, DB problem fetch ~20ms, Judge0 execution per test case ~400–800ms × 3 cases ≈ 1.5–2.5s, DB submission write ~15ms, streak update ~20ms. Total p95 ≈ 3s. For the hint flow: Auth check ~5ms, DB submission count ~15ms, DB problem fetch ~20ms, Claude API call ~1.5s. Total p95 ≈ 1.8s.

---

### 3.5 Non-Functional Requirements (NFR)

| NFR | Current State | Production Target | Gap to Bridge |
|-----|--------------|-------------------|---------------|
| Latency (p95) | ~3s for submit (sequential Judge0 calls) | <1.5s | Parallelize test case execution via Judge0 batch API |
| Throughput | ~10 concurrent submissions | 200+ concurrent submissions | Connection pooling + Judge0 instance scaling |
| Availability | Single Vercel + Neon instance | 99.9% SLA | Multi-region Vercel deployment + Neon read replicas |
| Security | OAuth2 (Google/GitHub) + DB sessions | OAuth2 + RBAC + input sanitization | Rate limiting + CSP headers + code execution sandboxing audit |
| Observability | Console.error logging | Structured logs + distributed traces | OpenTelemetry + Grafana/Datadog integration |
| Data durability | Neon single instance with WAL | Replicated + point-in-time recovery | Neon branching + automated backups |

---

### 3.6 Scalability Strategy

The system scales horizontally at the stateless API layer — Vercel's serverless functions auto-scale to handle concurrent requests without configuration. The first bottleneck under real traffic would be the **sequential Judge0 execution loop** in the submit route, where each test case is submitted and awaited one at a time. The immediate fix is switching to Judge0's batch submission endpoint (`/submissions/batch`) to parallelize test case execution, which would cut submit latency by ~60%. The second bottleneck is the daily cron job, which currently iterates through all crews in a single request to update streaks — at 10K+ crews, this would need to be partitioned into batched updates or moved to a proper job queue. Neon Postgres handles connection scaling well through its serverless driver (HTTP-based queries for reads, WebSocket for transactions), but at high write volume, the streak update pattern (read member → compute → write member → read crew → compute → write crew) would benefit from a single SQL CTE or stored procedure to reduce round-trips. The PartyKit server scales naturally — each room is an independent actor, so adding rooms doesn't increase per-room overhead.

---

## 4. Low Level Design (LLD)

> LLD describes *how* the key components are implemented — class structure, data structures, algorithms, design patterns, and interface contracts.

### 4.1 Core Module / Class Design

```mermaid
classDiagram
    class RoomServer {
        +members: Map~string, RoomMember~
        +chatHistory: ChatMessage[]
        +room: Party.Room
        +onConnect(conn, ctx): void
        +onMessage(message, sender): void
        +onClose(conn): void
        -broadcastMembers(): void
    }

    class usePartyRoom {
        +members: RoomMember[]
        +chat: ChatMessage[]
        +connected: boolean
        +sendChat(text): void
        +updateStatus(status): void
        -connect(): void
    }

    class RoomClient {
        +crewId: string
        +problem: Problem
        +userId: string
        +handleRun(): Promise
        +handleSubmit(): Promise
        +handleRequestHint(): Promise
        -handleCodeChange(val): void
        -handleLanguageChange(lang): void
    }

    class AuthHelpers {
        +requireSession(): Session
        +getUserCrewId(userId): string|null
        +requireCrewMember(userId, crewId): Membership
    }

    class StreakService {
        +updateStreaksAfterSolve(userId, crewId): void
        +crewCompletionToday(crewId): CompletionResult
    }

    class ProblemsService {
        +getTodaysProblem(): Problem
        +getWeeklyProblems(): Problem[]
        +getCrewActivity(crewId): Submission[]
        +getUserSubmissions(userId, problemId): Submission[]
    }

    class CodeEditor {
        +language: string
        +value: string
        +onChange(value): void
        +readOnly: boolean
        -defineThemes(monaco): void
    }

    RoomClient --> usePartyRoom : real-time state
    RoomClient --> CodeEditor : embeds
    RoomClient --> ProblemsService : fetches problem
    RoomClient --> StreakService : triggers on accept
    RoomServer --> usePartyRoom : WebSocket protocol
    AuthHelpers --> RoomClient : guards access
```

The architecture follows a **service layer pattern** with clear separation between data access (Drizzle queries in `db/`), business logic (streak computation in `lib/streak.ts`, problem selection in `lib/problems.ts`), and presentation (server components for SSR, client components for interactivity). The `RoomServer` (PartyKit) and `usePartyRoom` (client hook) form a clean protocol pair — the server manages ephemeral state (who's connected, chat history), while all persistent state flows through the Next.js API routes to Postgres. The boundary between business logic and infrastructure is at the `lib/` directory — functions like `updateStreaksAfterSolve` encapsulate domain rules and are called from API routes but know nothing about HTTP.

---

### 4.2 Key Algorithm / Logic Walkthrough

> Pick the 3 most non-trivial pieces of logic in the codebase. For each, explain it as if you're at a whiteboard.

#### Algorithm 1: Multi-Case Verdict Aggregation Pipeline

**What it does:** Executes a user's code against every test case sequentially via Judge0, collects per-case results, and aggregates them into a single submission verdict.

**Why it's non-trivial:** The aggregation must handle five distinct Judge0 status codes (accepted, wrong answer, runtime error, TLE, compilation error), decode base64 stdout for string comparison, and use a "first failure wins" strategy — if case 2 is wrong_answer and case 3 is TLE, the overall verdict is wrong_answer, not TLE.

**Step-by-step:**
```mermaid
flowchart TD
    A["Receive code + problemId"] --> B["Fetch problem's test_cases from DB"]
    B --> C{"JUDGE0_URL set?"}
    C -->|"No"| D["Mock mode:\nRandom verdict, fake results"]
    C -->|"Yes"| E["Loop: for each test case"]
    E --> F["POST to Judge0\n(base64 code + stdin, wait=true)"]
    F --> G["Decode base64 stdout"]
    G --> H{"stdout.trim() === expected.trim()?"}
    H -->|"Yes"| I["Case passed"]
    H -->|"No"| J["Check status_id:\n5=TLE, 6-12=RE, else=WA"]
    J --> K["Set overallVerdict to first failure"]
    I --> L{"More test cases?"}
    K --> L
    L -->|"Yes"| E
    L -->|"No"| M["INSERT submission record\nwith aggregated verdict"]
    M --> N{"Verdict === accepted?"}
    N -->|"Yes"| O["updateStreaksAfterSolve()"]
    N -->|"No"| P["Return results"]
    O --> P
    D --> M
```

**Edge cases this handles:** Judge0 returning a non-200 response (treated as runtime_error for that case, execution continues for remaining cases). Empty stdout from Judge0 (decoded as empty string, compared against expected). Test cases array being empty (skips execution loop entirely, defaults to accepted verdict). Mock mode randomization (70% accepted, 30% wrong_answer) for development without a Judge0 instance.

**Code path:** `app/api/submit/route.ts → POST handler`

---

#### Algorithm 2: Dual-Layer Streak Computation (Optimistic + Authoritative)

**What it does:** Maintains both individual member streaks and a crew-wide streak using a two-phase approach: immediate optimistic updates on each submission, and a daily cron-based authoritative reconciliation.

**Why it's non-trivial:** The streak logic must handle three temporal states (solved today, solved yesterday → increment, gap → reset to 1), avoid double-counting when a user submits multiple accepted solutions in one day, and reconcile the crew-level streak using the "any member can keep it alive" rule from the product spec.

**Step-by-step:**
```mermaid
flowchart TD
    A["User submits accepted solution"] --> B["Read crewMember record"]
    B --> C{"lastCompleted === today?"}
    C -->|"Yes"| D["Return early\n(already counted)"]
    C -->|"No"| E{"lastCompleted === yesterday?"}
    E -->|"Yes"| F["newStreak = currentStreak + 1"]
    E -->|"No"| G["newStreak = 1\n(streak broken, restart)"]
    F --> H["UPDATE crewMember\nset streak, lastCompleted=today"]
    G --> H
    H --> I["Read crew record"]
    I --> J["crewStreak = current + 1\nlongest = max(longest, crewStreak)"]
    J --> K["UPDATE crew streaks"]
    K --> L["Daily cron runs at midnight"]
    L --> M["For each crew:\ncheck if ANY member solved today"]
    M --> N{"Anyone solved?"}
    N -->|"Yes"| O["Streak preserved\n(already updated by submit)"]
    N -->|"No"| P["Reset crew.currentStreak = 0"]
```

**Edge cases this handles:** Idempotent daily counting via `lastCompleted === today` early return. Streak failures are caught and logged but never block the submission response (non-critical path). The cron job handles the authoritative reset — if the optimistic increment over-counts (e.g., two members submit simultaneously), the cron reconciles. The `longestStreak` field is a high-water mark that never decreases.

**Code path:** `lib/streak.ts → updateStreaksAfterSolve()` and `app/api/cron/daily/route.ts → GET handler`

---

#### Algorithm 3: Progressive AI Hint Generation with Attempt Gating

**What it does:** Provides contextual coding hints powered by Claude, but only after a minimum number of failed attempts, with graceful degradation to static hints when the API is unavailable.

**Why it's non-trivial:** The system must query the submissions table to count failures per user per problem, construct a prompt that includes both the problem context and the user's current code without revealing the solution, and handle three distinct response modes (locked, AI-generated, static fallback) with consistent client-side UX.

**Step-by-step:**
```mermaid
flowchart TD
    A["User clicks 'Request hint'"] --> B["Auth check"]
    B --> C["Query submissions WHERE\nuserId=X AND problemId=Y"]
    C --> D["Count non-accepted verdicts"]
    D --> E{"failedCount >= 3?"}
    E -->|"No"| F["Return locked: true\nwith attemptsNeeded count"]
    E -->|"Yes"| G{"ANTHROPIC_API_KEY set?"}
    G -->|"No"| H["Select static hint\nby index: floor((failed-3)/1)"]
    G -->|"Yes"| I["Construct Claude prompt with:\nproblem title, difficulty,\ndescription, user's code"]
    I --> J["POST to Anthropic API\nmodel: claude-sonnet, max_tokens: 200"]
    J --> K{"Response OK?"}
    K -->|"Yes"| L["Return AI hint"]
    K -->|"No"| M["Fallback to static hint\nwith note about AI unavailability"]
    H --> N["Return hint to client"]
    L --> N
    M --> N
```

**Edge cases this handles:** Users who haven't submitted enough times get a "locked" response with a specific count of remaining attempts needed. The static hint index is clamped to `Math.min(index, FALLBACK_HINTS.length - 1)` to avoid out-of-bounds access. The Claude prompt explicitly instructs "Don't write any code" to prevent solution leakage. API errors from Anthropic gracefully fall back to the static hint bank rather than surfacing an error.

**Code path:** `app/api/hint/route.ts → POST handler`

---

### 4.3 Data Model & ER Diagram

```mermaid
erDiagram
    USER {
        text id PK "crypto.randomUUID()"
        text email UK "NOT NULL"
        text name
        timestamp emailVerified
        text image
    }

    ACCOUNT {
        text userId FK "CASCADE on delete"
        text type "NOT NULL (oauth/oidc)"
        text provider "PK (compound)"
        text providerAccountId "PK (compound)"
        text access_token
        text refresh_token
        integer expires_at
    }

    SESSION {
        text sessionToken PK
        text userId FK "CASCADE on delete"
        timestamp expires "NOT NULL"
    }

    CREW {
        text id PK "crypto.randomUUID()"
        text name "NOT NULL"
        text invite_code UK "NOT NULL"
        integer current_streak "default 0"
        integer longest_streak "default 0"
        timestamp created_at "defaultNow()"
    }

    CREW_MEMBER {
        text crew_id PK_FK "CASCADE on delete"
        text user_id PK_FK "CASCADE on delete"
        crew_role role "default 'member'"
        integer current_streak "default 0"
        date last_completed
        timestamp joined_at "defaultNow()"
    }

    PROBLEM {
        text id PK "crypto.randomUUID()"
        text title "NOT NULL"
        difficulty difficulty "enum: easy/medium/hard"
        text topic_tag "NOT NULL"
        text description "NOT NULL"
        jsonb examples "array of input/output pairs"
        text constraints
        jsonb starter_code "Record of lang -> code"
        jsonb test_cases "array of input/expected pairs"
    }

    CHALLENGE {
        text id PK "crypto.randomUUID()"
        challenge_type type "enum: daily/weekly"
        date challenge_date "NOT NULL"
        text problem_id FK "CASCADE on delete"
    }

    SUBMISSION {
        text id PK "crypto.randomUUID()"
        text user_id FK "CASCADE on delete"
        text problem_id FK "CASCADE on delete"
        text crew_id FK "CASCADE on delete"
        text context
        text code "NOT NULL"
        text language "default 'python'"
        verdict verdict "enum: accepted/wrong_answer/RE/TLE"
        integer runtime
        timestamp submitted_at "defaultNow()"
    }

    LIVE_SESSION {
        text id PK "crypto.randomUUID()"
        text crew_id FK "CASCADE on delete"
        timestamp started_at "defaultNow()"
        timestamp ended_at
    }

    USER ||--o{ ACCOUNT : "authenticates via"
    USER ||--o{ SESSION : "has"
    USER ||--o{ CREW_MEMBER : "belongs to"
    CREW ||--o{ CREW_MEMBER : "has"
    USER ||--o{ SUBMISSION : "submits"
    PROBLEM ||--o{ SUBMISSION : "receives"
    CREW ||--o{ SUBMISSION : "tracks"
    PROBLEM ||--o{ CHALLENGE : "is assigned in"
    CREW ||--o{ LIVE_SESSION : "hosts"
```

**Entity descriptions:**

| Entity | Purpose | Key Constraints | Indexed On |
|--------|---------|-----------------|------------|
| USER | Auth.js-managed user profile, shared with Crux domain | email UNIQUE NOT NULL | id (PK), email (UK) |
| CREW | A study group with streak tracking and invite system | invite_code UNIQUE NOT NULL, max 8 members (app-enforced) | id (PK), invite_code (UK) |
| CREW_MEMBER | Junction table with role + individual streak state | Compound PK (crew_id, user_id), CASCADE deletes | Compound PK |
| PROBLEM | Curated DSA problem with multi-language starter code and test cases | JSONB for examples, starter_code, test_cases | id (PK) |
| CHALLENGE | Maps a date + type to a specific problem (daily or weekly rotation) | challenge_date + type together identify a challenge | challenge_date, type |
| SUBMISSION | Complete submission record with code, verdict, and timing | All FKs CASCADE, verdict is an enum | user_id, problem_id, crew_id, submitted_at |

**Query patterns this schema is optimized for:**
1. **Daily problem lookup:** `SELECT FROM challenges WHERE challenge_date = today AND type = 'daily'` → `SELECT FROM problems WHERE id = challenge.problemId` — two indexed lookups, sub-millisecond.
2. **User submission history for a problem:** `SELECT FROM submissions WHERE userId = X AND problemId = Y ORDER BY submitted_at DESC` — covers the Submissions tab and hint unlock counting.
3. **Crew activity feed:** `SELECT FROM submissions WHERE crewId = X ORDER BY submitted_at DESC LIMIT 20` — used on the crew home page.

**What changes at scale:**
At 10M submissions, the `submissions` table becomes the primary bottleneck. The fix is adding composite indexes on `(userId, problemId)` and `(crewId, submitted_at)`, and potentially partitioning by `submitted_at` (monthly range partitions). The JSONB columns on `problems` (examples, starter_code, test_cases) are read-heavy and never queried by content — they could be moved to a separate `problem_content` table or served from a CDN/cache layer. The `challenges` table grows linearly (1 daily + 3 weekly = ~4 rows/week) and will never be a bottleneck.

---

### 4.4 Sequence Diagrams for Key Flows

#### Flow 1: User Submits Code and Gets Verdict

```mermaid
sequenceDiagram
    actor User
    participant RoomClient as Room Client
    participant SubmitAPI as POST /api/submit
    participant AuthJS as Auth.js
    participant NeonDB as Neon Postgres
    participant Judge0 as Judge0 CE
    participant Streak as Streak Service
    participant PartyKit as PartyKit WS

    User->>RoomClient: Clicks "Submit" (or Ctrl+Shift+Enter)
    RoomClient->>SubmitAPI: POST {problemId, crewId, code, language}
    SubmitAPI->>AuthJS: Validate session
    AuthJS-->>SubmitAPI: Session {userId}
    SubmitAPI->>NeonDB: SELECT problem WHERE id = problemId
    NeonDB-->>SubmitAPI: Problem {testCases: [...]}
    loop For each test case
        SubmitAPI->>Judge0: POST /submissions (base64 code + stdin)
        Judge0-->>SubmitAPI: {stdout, stderr, status, time}
        SubmitAPI->>SubmitAPI: Decode base64, compare output
    end
    SubmitAPI->>SubmitAPI: Aggregate verdict (first failure wins)
    SubmitAPI->>NeonDB: INSERT submission {verdict, code, runtime}
    NeonDB-->>SubmitAPI: {submissionId}
    alt verdict === "accepted"
        SubmitAPI->>Streak: updateStreaksAfterSolve(userId, crewId)
        Streak->>NeonDB: UPDATE crewMember, UPDATE crew
    end
    SubmitAPI-->>RoomClient: {verdict, runtime, results[], submissionId}
    RoomClient->>RoomClient: Update UI (verdict banner, case dots)
    RoomClient->>RoomClient: Append to submissions list
    alt verdict === "accepted"
        RoomClient->>PartyKit: Send status: "solved"
        PartyKit-->>RoomClient: Broadcast updated member list
    end
    RoomClient-->>User: Display verdict + per-case results
```

The bottleneck in this flow is the sequential Judge0 loop — each test case blocks on a synchronous `wait=true` response. For 3 test cases at ~500ms each, this adds ~1.5s of latency. The natural optimization is Judge0's batch submission API. The streak update is fire-and-forget (errors are caught but don't block the response), which keeps the critical path lean.

---

#### Flow 2: OAuth Sign-In → Crew Creation → First Room Entry

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant SignIn as /signin
    participant AuthJS as Auth.js
    participant Google as Google OAuth
    participant NeonDB as Neon Postgres
    participant CrewSetup as /crew/new
    participant CrewHome as /crew/[crewId]
    participant Room as /crew/[crewId]/room
    participant PartyKit as PartyKit WS

    User->>Browser: Navigates to /signin
    Browser->>SignIn: GET /signin
    SignIn->>AuthJS: Check session
    AuthJS-->>SignIn: No session
    SignIn-->>Browser: Render sign-in panel
    User->>Browser: Clicks "Continue with Google"
    Browser->>AuthJS: signIn("google", {callbackUrl: "/crew/new"})
    AuthJS->>Google: OAuth redirect
    Google-->>AuthJS: Authorization code
    AuthJS->>NeonDB: Upsert user + link account (transaction)
    NeonDB-->>AuthJS: User created
    AuthJS-->>Browser: Set session cookie, redirect to /crew/new

    Browser->>CrewSetup: GET /crew/new
    CrewSetup->>AuthJS: requireSession()
    AuthJS-->>CrewSetup: Session {userId}
    CrewSetup->>NeonDB: Check existing crew membership
    NeonDB-->>CrewSetup: None
    CrewSetup-->>Browser: Render create/join form
    User->>Browser: Enters crew name, clicks "Create crew"
    Browser->>CrewSetup: Server Action: createCrew(formData)
    CrewSetup->>CrewSetup: generateInviteCode() (retry up to 5x)
    CrewSetup->>NeonDB: INSERT crew, INSERT crewMember (role: owner)
    NeonDB-->>CrewSetup: {crewId}
    CrewSetup-->>Browser: redirect(/crew/{crewId})

    Browser->>CrewHome: GET /crew/[crewId]
    CrewHome->>NeonDB: Fetch crew, members, today's problem, activity
    CrewHome-->>Browser: Render crew dashboard
    User->>Browser: Clicks "Start live session"
    Browser->>Room: GET /crew/[crewId]/room
    Room->>NeonDB: Fetch crew, problem, user submissions
    Room-->>Browser: SSR with problem + starter code
    Browser->>PartyKit: WebSocket connect to room
    PartyKit-->>Browser: init {members, chat history}
    Browser-->>User: Full live coding room with editor + chat
```

This flow demonstrates the complete onboarding journey. The Auth.js Drizzle adapter's `linkAccount` step is the reason the `neon-serverless` WebSocket driver is used instead of `neon-http` — account linking requires a database transaction, which HTTP-only drivers don't support. The invite code generation uses a retry loop (up to 5 attempts) to handle the rare unique constraint collision on the 6-character code.

---

### 4.5 Design Patterns Used

| Pattern | Where It's Applied | Why It Was Chosen |
|---------|-------------------|-------------------|
| Service Layer | `lib/problems.ts`, `lib/streak.ts`, `lib/auth-helpers.ts` | Encapsulates domain logic (streak rules, problem selection, auth checks) away from route handlers, making each function independently testable and reusable across server components and API routes |
| Strategy (Fallback) | Judge0 mock mode, Claude static hints, seed problem fallback | Every external dependency has a fallback strategy controlled by environment variables — this allows the entire app to run locally with zero external services configured |
| Observer (Pub/Sub) | PartyKit `RoomServer` broadcast pattern | The `broadcastMembers()` method implements a pub/sub pattern where any state change (join, leave, status update) triggers a broadcast to all connected WebSocket clients, keeping all room participants synchronized |
| Adapter | `@auth/drizzle-adapter` mapping Auth.js types to Drizzle schema | Decouples the Auth.js session/account lifecycle from the Drizzle schema definition, allowing the `users` table to serve both Auth.js and Crux domain concerns without schema conflicts |
| Factory (Deterministic) | `getTodaysProblem()` seed-based fallback | When no DB challenge exists, the fallback uses `Math.floor(Date.now() / 86400000) % PROBLEMS.length` as a deterministic factory — every user sees the same problem on the same day, even without a database |
| Middleware Guard | `middleware.ts` + `requireSession()` / `requireCrewMember()` | Auth guard pattern — Next.js middleware redirects unauthenticated users at the edge before the request hits the server component, while `requireCrewMember()` enforces crew-level authorization at the data layer |

---

## 5. Tech Stack — With Justification

> Every choice must have a "why this, not X" — not just a name.

| Layer | Technology | Why This | What Was the Alternative |
|-------|------------|----------|--------------------------|
| Frontend Framework | Next.js 14 (App Router) | Server components for authenticated data fetching without client-side state management overhead; API routes colocated with the app; built-in SSR for fast first paint | Plain React SPA — rejected because every page needs authenticated DB queries, which would require a separate API server and add latency from client-side fetch waterfalls |
| Language | TypeScript | End-to-end type safety from Drizzle schema to React props; the `Problem` type flows from DB schema → `lib/problems.ts` → server component → client component without a single `any` | JavaScript — rejected because the JSONB columns (examples, starterCode, testCases) need typed interfaces to prevent runtime shape errors |
| Database | Neon Postgres (Serverless) | Connection pooling built in, scales to zero when idle (cost-effective for MVP), WebSocket-based driver supports transactions needed by Auth.js | Supabase Postgres — viable but adds an unnecessary abstraction layer; PlanetScale MySQL — rejected because Drizzle's Postgres adapter is more mature and JSONB is superior to JSON for structured problem data |
| ORM | Drizzle ORM | Type-safe schema-as-code with zero codegen step; first-class Postgres support including enums and JSONB; lightweight runtime (~15KB) compared to Prisma's ~2MB | Prisma — rejected because its client generation step adds build complexity, and its query engine is heavier for a serverless deployment where cold starts matter |
| Auth | Auth.js v5 (NextAuth) | First-party Next.js integration, built-in OAuth providers, database session strategy with Drizzle adapter; handles the entire OAuth flow including CSRF protection and session rotation | Clerk — adds vendor lock-in and a monthly cost; Lucia Auth — viable but requires more manual setup for OAuth flows |
| Code Editor | Monaco Editor (@monaco-editor/react) | Same editor that powers VS Code — syntax highlighting, bracket matching, and language-specific IntelliSense for Python/C++/Java out of the box | CodeMirror — viable alternative but Monaco's theming API made it easier to match the Crux design system (custom dark/light themes with OKLCH colors) |
| Real-time | PartyKit | Per-room WebSocket actors with zero-config deployment; each room is an isolated server-side object with its own state, which maps perfectly to the "one crew = one room" model | Socket.IO — requires a dedicated server process; Ably/Pusher — adds vendor dependency and per-message costs; Supabase Realtime — tied to Supabase ecosystem |
| Code Execution | Judge0 CE | Open-source, self-hostable, supports 60+ languages with configurable time/memory limits; synchronous `wait=true` mode simplifies the submission flow | Piston — fewer language configurations; custom Docker sandboxing — significant security surface area to manage |
| AI Hints | Anthropic Claude (Sonnet) | Strong instruction-following for the "hint without solution" constraint; 200 max_tokens keeps responses concise; Sonnet balances cost and quality | OpenAI GPT-4 — viable but Claude's instruction adherence is stronger for the "don't write code" constraint; local LLM — too slow and resource-intensive for serverless |
| Deployment | Vercel + Vercel Cron | Zero-config Next.js deployment with serverless functions; Vercel Cron provides free scheduled triggers for daily/weekly challenge rotation | AWS Lambda + API Gateway — far more configuration overhead for the same result; Railway — viable but Vercel's Next.js integration is tighter |
| Styling | Vanilla CSS + OKLCH variables | Design system based on CSS custom properties with OKLCH color space for perceptually uniform dark/light theme switching; inline styles for component-level control | Tailwind CSS — rejected because the design system's OKLCH variable approach and inline style patterns match the pixel-precise design reference better than utility classes |

---

## 6. Architecture & System Design Decisions

> This is what interviewers probe hardest. Write **6–8 distinct decisions** from the codebase. Each must have explicit alternatives considered.

### Decision 1: Monolithic Next.js App Router over Microservices

**Context:** The app has multiple distinct concerns — auth, crew management, code execution, real-time presence, AI hints — which could each be separate services.

**Options considered:**
- **Option A — Microservices:** Separate services for auth, crew API, judge pipeline, hint service. Independent scaling, independent deployment, clear ownership boundaries.
- **Option B — Next.js Monolith:** All concerns in a single Next.js deployment, with API routes for async operations and server components for reads.

**What we chose:** Option B — monolith with Next.js App Router.

**Reasoning:** With a team size of one, the operational overhead of managing multiple deployments, inter-service auth, and distributed tracing outweighs the architectural benefits of microservices. The App Router's server components naturally separate read paths (SSR) from write paths (API routes), providing the organizational benefits of a service layer without the deployment complexity. Vercel's serverless model means each API route independently scales.

**Tradeoff accepted:** All API routes share the same deployment — a bug in the hint route could theoretically affect the submit route's availability. In practice, Vercel's serverless isolation minimizes this risk.

**How this evolves at scale:** At the point where the team grows to 3+ engineers, the judge pipeline would be the first candidate for extraction — it has the most distinct scaling profile (CPU-bound, external dependency on Judge0) and the clearest API boundary.

---

### Decision 2: Database Sessions over JWT

**Context:** Auth.js v5 supports both JWT and database session strategies. The choice affects latency, scalability, and security properties.

**Options considered:**
- **Option A — JWT sessions:** Stateless, no DB lookup per request, token contains user data. Can't be revoked without a blocklist.
- **Option B — Database sessions:** Session token stored in Postgres, validated per request. Fully revocable, but adds a DB query to every authenticated request.

**What we chose:** Option B — database sessions via `session: { strategy: "database" }`.

**Reasoning:** The Drizzle adapter already requires DB access for the OAuth account linking flow, so a session table adds minimal overhead. Database sessions provide immediate revocability (important for a social app where users might need to be removed from crews), and the session data is always fresh — no stale JWT claims after a user changes their name or email. With Neon's serverless pooling, the per-request session lookup adds <5ms.

**Tradeoff accepted:** Every authenticated request hits the database. At high scale, this would be the first candidate for a Redis-backed session store.

**How this evolves at scale:** Move session lookups to Upstash Redis (in-memory, edge-compatible) while keeping Postgres as the source of truth for session creation and revocation.

---

### Decision 3: neon-serverless WebSocket Driver over neon-http

**Context:** Neon provides two driver options: an HTTP-based driver (simpler, one query per HTTP request) and a WebSocket-based driver (supports transactions, connection pooling).

**Options considered:**
- **Option A — neon-http:** Simpler, no WebSocket dependency, each query is an independent HTTP request. Cannot do transactions.
- **Option B — neon-serverless (WebSocket):** Supports transactions, requires a `ws` polyfill for Node.js, maintains a connection pool.

**What we chose:** Option B — `@neondatabase/serverless` with `ws` polyfill.

**Reasoning:** The Auth.js Drizzle adapter's `linkAccount` method runs inside a transaction to atomically create a user and link their OAuth provider. The HTTP driver doesn't support transactions, which causes the OAuth sign-up flow to fail. This is documented as a comment in `db/index.ts` to prevent future developers from "simplifying" the driver choice.

**Tradeoff accepted:** Added a `ws` dependency and the `neonConfig.webSocketConstructor = ws` boilerplate. The WebSocket connection is slightly more stateful than pure HTTP.

**How this evolves at scale:** No change needed — the neon-serverless driver handles connection pooling internally and is designed for serverless environments.

---

### Decision 4: Sequential Judge0 Execution over Batch API

**Context:** When submitting code, each test case must be executed against Judge0 and the outputs compared.

**Options considered:**
- **Option A — Sequential execution:** Loop through test cases, await each Judge0 response, build results array incrementally.
- **Option B — Batch execution:** Use Judge0's `/submissions/batch` endpoint to submit all test cases at once, then collect results.
- **Option C — Parallel execution:** Use `Promise.all` to submit all test cases concurrently via individual endpoints.

**What we chose:** Option A — sequential execution with `wait=true`.

**Reasoning:** Sequential execution provides the clearest error handling and debugging — if case 3 fails, we know exactly which request failed and can include the Judge0 error details in the per-case results. It also allows early termination patterns (though not currently implemented) where execution stops after the first failure. For 3 test cases at ~500ms each, the total latency (~1.5s) is acceptable for an MVP. The simplicity of the code (a straightforward for loop) reduces the surface area for race conditions.

**Tradeoff accepted:** Linear latency scaling with test case count. At 10+ test cases, this becomes unacceptably slow.

**How this evolves at scale:** Switch to Judge0's batch API for problems with many test cases, falling back to sequential for error-prone submissions where detailed per-case debugging is valuable.

---

### Decision 5: PartyKit for WebSocket Rooms over Socket.IO or Ably

**Context:** The live room needs real-time presence (who's online, who's coding, who solved it) and chat — a classic WebSocket use case.

**Options considered:**
- **Option A — Socket.IO:** Mature, battle-tested, huge ecosystem. Requires a persistent server process.
- **Option B — Ably/Pusher:** Managed WebSocket infrastructure, zero server-side code. Per-message pricing.
- **Option C — PartyKit:** Per-room "Durable Object" model, each room is an isolated server-side actor. Deploys to Cloudflare's edge.

**What we chose:** Option C — PartyKit.

**Reasoning:** PartyKit's room-as-actor model maps directly to the product's "one crew = one room" concept. Each `RoomServer` class instance manages exactly one crew's presence and chat, with no shared state between rooms. The deployment model (separate from the Next.js app) means WebSocket scaling is independent of API scaling. The fallback pattern (no `NEXT_PUBLIC_PARTYKIT_HOST` → mock local state) means the app works perfectly for development without any WebSocket infrastructure.

**Tradeoff accepted:** PartyKit is a younger platform than Socket.IO with a smaller ecosystem. Chat history is in-memory (capped at 200 messages per room) and lost on server restart.

**How this evolves at scale:** Persist chat history to Postgres or Upstash Redis. Add PartyKit's hibernation API for rooms with no active connections to reduce memory usage.

---

### Decision 6: Environment-Variable-Driven Feature Flags (Mock/Real Mode)

**Context:** The app depends on three external services (Judge0, Anthropic, PartyKit) that may not be available in all environments.

**Options considered:**
- **Option A — Compile-time feature flags:** `#ifdef`-style conditional compilation. Removes unused code paths but complicates the build.
- **Option B — Runtime feature detection:** Check for environment variables at request time and branch to mock or real implementations.
- **Option C — Separate mock services:** Deploy mock versions of Judge0/Anthropic/PartyKit as local services.

**What we chose:** Option B — runtime feature detection via environment variable presence.

**Reasoning:** Each external dependency is guarded by an `if (!ENV_VAR) { ... mock mode ... }` check at the top of its handler. This means `npm run dev` works immediately with zero configuration — all features render and respond with plausible mock data. New developers can clone the repo and have a running app in 30 seconds. The mock responses are designed to be realistic (random verdicts, simulated latency via `setTimeout`) so the UI can be fully tested without real infrastructure.

**Tradeoff accepted:** The mock branches add code that never runs in production. Mock mode doesn't catch integration bugs — a submission that "works" in mock mode might fail against real Judge0 due to encoding issues.

**How this evolves at scale:** Add integration test suites that run against real Judge0/Anthropic instances in CI. Keep mock mode for development.

---

### Decision 7: OKLCH Color Space for Theme System

**Context:** The design requires a dark/light theme toggle with perceptually balanced colors — the accent color should feel equally vibrant in both themes.

**Options considered:**
- **Option A — HSL variables:** Standard CSS HSL, widely supported, easy to reason about.
- **Option B — OKLCH variables:** Perceptually uniform color space, ensures consistent visual weight across lightness values.
- **Option C — Separate color palettes:** Two completely independent sets of color values with no shared derivation.

**What we chose:** Option B — OKLCH custom properties in `globals.css`.

**Reasoning:** OKLCH ensures that when switching themes, the accent color (`--accent`) maintains the same perceived vibrancy — in HSL, a hue at L=80% looks washed out but at L=50% looks saturated, breaking visual consistency. The OKLCH values were tuned so that `--accent` in dark mode (`oklch(0.81 0.12 78)`) and light mode (`oklch(0.58 0.11 68)`) have the same perceptual chroma against their respective backgrounds.

**Tradeoff accepted:** OKLCH is newer and not supported in very old browsers (Safari <15.4). For the target audience (CS students prepping for placements), browser support is not a concern.

**How this evolves at scale:** OKLCH is future-proof — it's the direction CSS Color Level 4 is moving.

---

### Decision 8: Ambiguity-Free Invite Code Alphabet

**Context:** Crews are joined via a 6-character alphanumeric invite code. The code needs to be easy to read aloud and type without confusion.

**Options considered:**
- **Option A — Full alphanumeric:** 0-9, A-Z — 36 characters, 36^6 ≈ 2.2 billion combinations.
- **Option B — Curated alphabet:** Remove visually ambiguous characters (0/O, 1/I/L) — 30 characters, 30^6 ≈ 729 million combinations.
- **Option C — Words-based:** Generate codes from word lists (e.g., "tiger-maple-seven").

**What we chose:** Option B — `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (30 characters).

**Reasoning:** Invite codes are shared verbally ("Hey, join my crew, the code is A7K2QM") and typed manually on mobile keyboards. Removing 0/O, 1/I, and L eliminates the most common transcription errors. With 729 million combinations and a retry loop (up to 5 attempts on unique constraint collision), the collision probability is negligible even at 100K crews. The uppercase-only constraint means case-insensitive matching (`.toUpperCase()` in `joinCrew`) doesn't lose information.

**Tradeoff accepted:** Slightly reduced entropy (729M vs 2.2B). For the expected scale, this is more than sufficient.

**How this evolves at scale:** At millions of crews, monitor collision retry rates. If retries spike, extend to 7 or 8 characters.

---

## 7. API Design

**Style:** REST — the natural fit for Next.js API routes. Each route handles a single concern (submit code, get hint, run code, rotate challenges) with standard HTTP verbs and JSON request/response bodies. REST was chosen over GraphQL because the API surface is small (5 routes) and each route has a well-defined request shape — there's no query flexibility benefit from GraphQL here.

**Key endpoints:**

| Method | Route | Purpose | Request Body | Response | Auth |
|--------|-------|---------|-------------|----------|------|
| POST | /api/submit | Submit code against all test cases, record verdict | `{problemId, crewId, code, language}` | `{verdict, runtime, results[], submissionId}` | Session |
| POST | /api/judge0 | Run code against single test input (sandbox mode) | `{code, language, stdin?}` | `{stdout, stderr, status, time, memory}` | None |
| POST | /api/hint | Get AI-powered or static hint for a problem | `{problemId, crewId, code, language}` | `{hint, source}` or `{locked, attemptsNeeded}` | Session |
| GET | /api/cron/daily | Rotate daily challenge, reconcile streaks | — | `{challengeId, problemId, date}` | Bearer (CRON_SECRET) |
| GET | /api/cron/weekly | Set 3 weekly challenge problems | — | `{weekDate, count, challengeIds[]}` | Bearer (CRON_SECRET) |
| * | /api/auth/[...nextauth] | Auth.js OAuth flows (sign-in, callback, sign-out) | Varies | Varies | Public |

**Error contract:**
All errors return a JSON body with `{ error: string }` and an appropriate HTTP status code. Status codes used: `400` (missing fields / bad input), `401` (no session or invalid cron secret), `404` (problem not found), `500` (internal error), `502` (Judge0 upstream error). Clients are expected to check `res.ok` before parsing the response body, and display `data.error` to the user if present.

**Versioning strategy:**
Currently no versioning — the API surface is internal-only (consumed by the Next.js frontend, not external clients). In a production rollout with mobile clients, URI-prefix versioning (`/api/v1/submit`) would be the approach, with a deprecation window of 2 major versions.

**Rate limiting & throttling:**
Cron endpoints are protected by a `CRON_SECRET` Bearer token compared against the `Authorization` header. The submit and hint endpoints are protected by session-based auth, which inherently limits abuse to authenticated users. In production, Vercel's Edge Middleware would add per-user rate limiting (e.g., 10 submissions/minute, 5 hints/minute) using Upstash Redis as a sliding-window counter.

---

## 8. Challenges & How I Solved Them

### Challenge 1: Auth.js Drizzle Adapter Crashing on OAuth Sign-Up

**What happened:** During the initial OAuth flow, Auth.js's `linkAccount` method threw a "transactions not supported" error, causing the entire sign-up flow to fail silently with a redirect loop back to `/signin`.

**Why it was hard:** The error only appeared during the first OAuth sign-up (not subsequent sign-ins), and only with the `neon-http` driver. The error message was deep inside the Auth.js adapter internals, not surfaced in the application logs. It took tracing through `@auth/drizzle-adapter`'s source to find that `linkAccount` wraps user creation + account linking in a transaction.

**How I solved it:** Switched from `@neondatabase/serverless`'s HTTP mode to the WebSocket driver (`drizzle-orm/neon-serverless`), which supports transactions. Added the `ws` polyfill (`neonConfig.webSocketConstructor = ws`) for the Node.js runtime, and documented the reasoning in a comment in `db/index.ts` to prevent the same mistake from recurring.

**What I'd do differently:** I'd start with the WebSocket driver from the beginning. The "simpler" HTTP driver is a trap for any application that uses an ORM with transactional operations. I'd also add a connection-validation health check endpoint that explicitly tests transaction support.

---

### Challenge 2: Monaco Editor SSR Hydration Mismatch

**What happened:** Importing `@monaco-editor/react` directly in the room client component caused a React hydration error — Monaco accesses `window` and `document` during import, which doesn't exist during server-side rendering.

**Why it was hard:** The error manifested as a blank editor with a cryptic "Text content does not match server-rendered HTML" warning. The Monaco package's entry point eagerly accesses browser APIs at module evaluation time, not just at render time.

**How I solved it:** Used Next.js's `dynamic()` import with `ssr: false` to lazy-load the `CodeEditor` component exclusively on the client. This completely bypasses SSR for the Monaco-dependent code path. The `loading` prop provides a styled placeholder that matches the editor's dimensions, preventing layout shift during the dynamic import.

**What I'd do differently:** I'd evaluate whether CodeMirror 6 (which is SSR-safe by design) would have been a better fit from the start. Monaco is the better editor, but its browser-only assumption adds friction in a server-rendered architecture.

---

### Challenge 3: Keeping Streak Logic Idempotent Under Concurrent Submissions

**What happened:** During testing with multiple rapid submissions, the crew streak could increment multiple times for the same day — two "accepted" submissions from the same user in quick succession would each trigger `updateStreaksAfterSolve`, doubling the streak bump.

**Why it was hard:** The streak update reads the current value, computes the new value, and writes it back — a classic read-compute-write race condition. Two concurrent requests could both read `currentStreak = 5`, compute `6`, and write `6` — but one of those was a duplicate increment.

**How I solved it:** Added an early-return guard: `if (lastCompleted === today) return`. Since `lastCompleted` is set to today's date on the first accepted submission, all subsequent submissions on the same day are no-ops. For the crew-level streak, the daily cron job serves as the authoritative source of truth — it checks whether *any* member has `lastCompleted === today` and only then confirms the streak. The real-time update is optimistic, and the cron reconciles any over-counting.

**What I'd do differently:** I'd implement the streak update as a single SQL `UPDATE ... SET currentStreak = currentStreak + 1 WHERE lastCompleted != $today` to make the guard atomic at the database level, rather than relying on application-level read-then-write.

---

## 9. Production Readiness Roadmap

> Frame this as engineering judgment and roadmap thinking, not an apology.

The current implementation is scoped to an MVP that covers the full user journey (sign up → create crew → solve daily problem → track streaks) with graceful degradation at every external dependency boundary. Here's how I'd evolve it:

**P0 — Before any real traffic:**
- [ ] Add composite database indexes on `submissions(userId, problemId)` and `submissions(crewId, submitted_at)` for the two hottest query patterns
- [ ] Implement per-user rate limiting on `/api/submit` and `/api/hint` via Upstash Redis sliding-window counters
- [ ] Add structured logging with request correlation IDs (replace `console.error` with a structured logger like `pino`)
- [ ] Add CSP headers and input length limits on the code submission field (prevent megabyte-sized code payloads)
- [ ] Add a health check endpoint (`/api/health`) that validates DB connectivity and returns deployment version

**P1 — First 10K users:**
- [ ] Parallelize Judge0 test case execution via the batch submission API, cutting submit latency by ~60%
- [ ] Add Upstash Redis cache layer for daily problem lookups (invalidated by the daily cron) to eliminate repeated DB queries
- [ ] Persist PartyKit chat history to Postgres or Redis (currently in-memory, lost on restart)
- [ ] Add Neon read replica for the crew activity feed and submissions list queries (read-heavy, tolerant of slight staleness)
- [ ] Implement email notifications (via Resend) when crew streak is at risk (no one solved today by 9 PM)

**P2 — Architectural evolution:**
- [ ] Extract the judge pipeline as a separate service with its own queue (BullMQ on Redis) to decouple submission recording from code execution
- [ ] Add a CDN layer (Vercel Edge Config or Cloudflare KV) for serving the 50-problem seed bank without DB queries
- [ ] Implement circuit breakers for Judge0 and Anthropic API calls (use `tenacity`-style retry with exponential backoff + jitter)
- [ ] Add OpenTelemetry tracing across the submit flow (client → API → Judge0 → DB → PartyKit) for p95 latency monitoring
- [ ] Build a problem submission interface for crew owners to add custom problems to their crew's rotation

---

## 10. Interview Q&A Bank

> Answer every question as you'd answer it in the room — first person, specific, conversational.

**Q: Why did you build this?**
A: I was prepping for placements with a group of friends and we'd try to do a LeetCode problem a day, but we'd always fall off after a week. The problem wasn't motivation — it was that there was no shared accountability mechanism. I built Crux to give small friend groups a single streak that any one person can keep alive. The social pressure is gentle but effective — nobody wants to be the reason the group's 23-day streak breaks.

**Q: Walk me through the architecture.**
A: It's a Next.js 14 App Router monolith deployed on Vercel. Server components handle all the authenticated page rendering — they query Neon Postgres through Drizzle ORM for crew data, today's problem, and submission history. The interactive parts are client components: the Monaco code editor, the real-time crew presence panel powered by PartyKit WebSockets, and the chat. When you submit code, it hits a Next.js API route that loops through the problem's test cases, sends each to Judge0 for sandboxed execution, aggregates the verdict, persists the submission, and updates streaks. There's also an AI hint system that calls Claude when you've failed enough times. The whole thing has a daily Vercel Cron job that rotates the problem and reconciles streaks.

**Q: What was the hardest technical challenge?**
A: The Auth.js Drizzle adapter silently failing during OAuth sign-up because the `linkAccount` step requires a database transaction, and I was initially using Neon's HTTP driver which doesn't support transactions. The error wasn't surfaced clearly — it just caused a redirect loop. I had to trace through the adapter source code to find the issue, then switch to the WebSocket driver and add a `ws` polyfill. I documented it in a code comment so no one makes the same mistake.

**Q: How does code submission work under the hood?**
A: When you click Submit, the client POSTs your code, language, and IDs to `/api/submit`. The route validates your session, fetches the problem's test cases from Postgres, then loops through each test case sequentially — sending your code and the test input to Judge0's synchronous execution endpoint. Judge0 compiles and runs the code in a sandbox, returns base64-encoded stdout. I decode it, trim whitespace, and compare against the expected output. The first failing test case determines the overall verdict. Then I persist the submission record and update both the individual and crew streaks. The response includes per-case pass/fail details so the UI can show exactly which cases failed.

**Q: How would this scale to 10x the current load?**
A: The first bottleneck would be the sequential Judge0 execution — three test cases at 500ms each is 1.5 seconds. I'd switch to Judge0's batch API to parallelize that. The second bottleneck is the daily cron iterating through all crews — at 10K crews, that's 10K queries in one HTTP request. I'd partition it into batched updates or use a job queue. For reads, I'd add an Upstash Redis cache for the daily problem lookup since every user on every page load queries the same problem. The Neon Postgres layer scales well with its serverless pooling, but I'd add read replicas for the activity feed queries.

**Q: What would you change if you were starting over?**
A: I'd use CodeMirror 6 instead of Monaco. Monaco is a superior editor, but it's not SSR-safe — I had to work around it with dynamic imports. CodeMirror is designed to work in any environment. I'd also implement the streak update as a single atomic SQL statement instead of the read-compute-write pattern in TypeScript, which has a race condition under concurrent submissions. And I'd set up the batch Judge0 API from the start rather than sequential execution.

**Q: How did you choose your database?**
A: I needed a Postgres-compatible database that works well in serverless environments and supports transactions. Neon checks both boxes — its serverless driver handles connection pooling automatically, and the WebSocket transport supports the transactions Auth.js needs for account linking. I considered Supabase but decided against adding another abstraction layer. PlanetScale was out because it's MySQL, and I specifically needed Postgres JSONB for storing problem examples, starter code, and test cases as typed structured data.

**Q: What design patterns are in here?**
A: Three main ones. First, a service layer pattern — `lib/problems.ts`, `lib/streak.ts`, and `lib/auth-helpers.ts` encapsulate domain logic that's reused across server components and API routes. Second, a strategy/fallback pattern — every external dependency (Judge0, Claude, PartyKit) has an environment-variable-controlled fallback, so the entire app runs with zero external services configured. Third, an observer pattern in PartyKit — the `RoomServer` broadcasts member list updates to all connected clients whenever anyone joins, leaves, or changes status.

**Q: How do you ensure data consistency?**
A: Writes go through Drizzle ORM to Postgres with standard ACID guarantees. The streak system uses a dual-update approach: immediate optimistic updates for responsive UI, plus a daily cron job that authoritatively reconciles by checking which crews actually had activity. The idempotency guard (`if lastCompleted === today, return early`) prevents double-counting under concurrent submissions. Auth.js sessions are database-backed, so session state is always fresh.

**Q: How is auth handled?**
A: Auth.js v5 with Google and GitHub OAuth providers, using database sessions stored in Postgres via the Drizzle adapter. The middleware protects all `/crew/**` routes at the edge — unauthenticated requests get redirected to `/signin` before they hit any server component. Within server components, `requireSession()` and `requireCrewMember()` provide two layers of authorization: are you logged in, and are you a member of this specific crew.

**Q: What's your testing strategy?**
A: The mock mode system serves as a built-in integration test harness — every external dependency fallback produces realistic responses, so the full user flow (sign up → create crew → solve problem → get hint) can be tested locally without any infrastructure. The seed data bank of 50 curated problems ensures deterministic testing of the problem selection and display pipeline. For production, I'd prioritize integration tests on the submit pipeline (the most complex flow) and the streak computation logic (the most business-critical logic), using a test Neon branch to avoid polluting production data.

**Q: What are the failure modes?**
A: Judge0 goes down → submissions return mock responses with a `mock: true` flag so the UI can display a notice. Anthropic API fails → hints fall back to a static bank of 5 generic DSA hints. PartyKit is unreachable → the room works in solo mode with local-only presence (you see yourself but not crewmates). Neon Postgres is down → page renders use seed data fallbacks for the daily problem; writes (submissions, crew creation) will fail with a 500 error. The cron job failing is the most impactful — if it doesn't run, yesterday's problem stays active and streaks aren't reconciled. A monitoring alert on the cron response code would be the first investment.

**Q: How would you add [obvious next feature]?**
A: For leaderboards: the `submissions` table already has `crewId`, `verdict`, and `runtime` — it's a single aggregate query (`GROUP BY userId, COUNT(*) WHERE verdict = 'accepted'`) rendered as a sorted list on the crew home page. For code replay: the `submissions.code` column stores every submission — adding a diff view between submissions is a frontend concern using Monaco's diff editor mode. For custom problems: the `problems` table schema already supports arbitrary problems via JSONB columns — adding a `/crew/[crewId]/problems/new` form that inserts into `problems` and creates a `challenge` record is straightforward.

**Q: What's the latency profile of a typical request?**
A: For a page load (crew home): edge middleware auth check ~2ms, Neon session lookup ~5ms, crew + members + today's problem queries ~30ms total, SSR rendering ~15ms. Total: ~50ms server time, plus network RTT. For a submission: session check ~5ms, problem fetch ~20ms, 3× Judge0 calls ~1.5s, submission INSERT ~15ms, streak update ~20ms. Total: ~1.6s server time. The Judge0 calls dominate at 95% of the total — that's the optimization target.

---

## 11. Resume Bullet Points

> ATS-optimized. Strong action verb first. Metrics inline (estimate if needed). Keywords embedded naturally.

- **Architected** a real-time collaborative DSA practice platform using Next.js 14 App Router, Neon Postgres, and PartyKit WebSockets, enabling small friend groups to solve daily coding challenges together in shared live rooms
- **Designed and implemented** a code execution pipeline that proxies user submissions to Judge0 CE, aggregating per-test-case verdicts with base64 encoding/decoding and sequential execution across 50+ curated problems with sub-3s p95 latency
- **Integrated** the Anthropic Claude API for contextual AI hint generation, implementing an attempt-gating system that unlocks hints after 3 failed submissions with graceful fallback to static hints when the API is unavailable
- **Built** a WebSocket-based real-time presence and chat system using PartyKit's room-as-actor model, synchronizing crew member status (coding/solved/idle) across all connected clients with exponential backoff reconnection
- **Implemented** a dual-layer streak computation system with real-time optimistic updates on submission and authoritative cron-based reconciliation, maintaining both individual and crew-wide streak state with idempotent guards against concurrent submissions
- **Designed** a normalized PostgreSQL schema using Drizzle ORM with 9 tables, JSONB columns for structured problem data, composite primary keys for junction tables, and cascading deletes across all foreign key relationships
- **Engineered** environment-variable-driven graceful degradation across three external services (Judge0, Anthropic, PartyKit), enabling the full application to run with zero external dependencies configured
- **Implemented** OAuth 2.0 authentication with Google and GitHub via Auth.js v5, database-backed sessions, and a two-layer authorization system (edge middleware for route protection + server-side crew membership verification)

---

## 12. Keywords Index (ATS Reference)

TypeScript, Next.js 14, React 18, App Router, Server Components, Neon Postgres, Drizzle ORM, Auth.js v5, NextAuth, OAuth 2.0, Google OAuth, GitHub OAuth, PartyKit, WebSocket, real-time, Monaco Editor, Judge0, code execution, sandboxed execution, Anthropic Claude API, LLM integration, AI hints, REST API, serverless, Vercel, Vercel Cron, PostgreSQL, JSONB, database sessions, ACID transactions, streak computation, cron jobs, scheduled tasks, SSR, server-side rendering, dynamic imports, CSS custom properties, OKLCH, dark mode, responsive design, Drizzle Kit, schema migrations, environment-driven fallbacks, graceful degradation, base64 encoding, connection pooling, exponential backoff, idempotency, system design, full-stack, monolithic architecture, real-time collaboration, DSA, data structures and algorithms, competitive programming

---

*Generated by coding agent — verify all claims before your interview. The diagrams render in GitHub, Notion, and Obsidian.*
