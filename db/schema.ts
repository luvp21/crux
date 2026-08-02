import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  date,
  pgEnum,
  jsonb,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Auth.js (NextAuth v5) tables — shape required by @auth/drizzle-adapter.
// `users` doubles as the brief's own `users` table (id/email/name), extended
// with the columns the adapter needs (emailVerified/image).
// ---------------------------------------------------------------------------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---------------------------------------------------------------------------
// Crux data model — crews, membership, problems, challenges,
// submissions, live sessions. See project brief's "Data model" section.
// ---------------------------------------------------------------------------

export const crewRoleEnum = pgEnum("crew_role", ["owner", "member"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const challengeTypeEnum = pgEnum("challenge_type", ["daily", "weekly"]);
export const verdictEnum = pgEnum("verdict", [
  "accepted",
  "wrong_answer",
  "runtime_error",
  "time_limit_exceeded",
]);

export const crews = pgTable("crews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const crewMembers = pgTable(
  "crew_members",
  {
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: crewRoleEnum("role").notNull().default("member"),
    currentStreak: integer("current_streak").notNull().default(0),
    lastCompleted: date("last_completed"),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (cm) => [primaryKey({ columns: [cm.crewId, cm.userId] })],
);

export const problems = pgTable("problems", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  topicTag: text("topic_tag").notNull(),
  description: text("description").notNull().default(""),
  examples: jsonb("examples").$type<{ input: string; output: string; explanation?: string }[]>().default([]),
  constraints: text("constraints").notNull().default(""),
  starterCode: jsonb("starter_code").$type<Record<string, string>>().default({}),
  testCases: jsonb("test_cases").$type<{ input: string; expected: string }[]>().default([]),
  hiddenTestCases: jsonb("hidden_test_cases")
    .$type<{ input: string; expected: string }[]>()
    .default([]),
  // Method name + param/return types for generating a real-execution driver
  // (lib/runner). Null for problems that don't fit a single-call model
  // (multi-method classes, round-trip tests, custom graph structures) —
  // those stay mock-execution-only.
  runnerMeta: jsonb("runner_meta").$type<import("@/lib/runner/types").RunnerMeta | null>().default(null),
});

export const challenges = pgTable(
  "challenges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    type: challengeTypeEnum("type").notNull(),
    challengeDate: date("challenge_date").notNull(),
    problemId: text("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.crewId, t.type, t.challengeDate)],
);

export const crewChallengePreferences = pgTable(
  "crew_challenge_preferences",
  {
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    type: challengeTypeEnum("type").notNull(),
    topicTag: text("topic_tag"),
    difficulty: difficultyEnum("difficulty"),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.crewId, t.type] })],
);

export const submissions = pgTable("submissions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  context: text("context"),
  code: text("code").notNull().default(""),
  language: text("language").notNull().default("python"),
  verdict: verdictEnum("verdict").notNull(),
  runtime: integer("runtime"),
  submittedAt: timestamp("submitted_at", { mode: "date" })
    .notNull()
    .defaultNow(),
});

export const codeCheckpoints = pgTable("code_checkpoints", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  language: text("language").notNull(),
  insertedChars: integer("inserted_chars").notNull().default(0),
  isPasteFlag: boolean("is_paste_flag").notNull().default(false),
  submissionId: text("submission_id").references(() => submissions.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const liveSessions = pgTable("live_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date" }),
});
