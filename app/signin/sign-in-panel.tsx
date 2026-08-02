"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignInPanel({ devMode = false }: { devMode?: boolean }) {
  const [signUp, setSignUp] = useState(false);
  const [devEmail, setDevEmail] = useState("");

  return (
    <div style={{ width: "100%", maxWidth: 400, animation: "up 500ms ease both" }}>
      <div
        style={{
          fontFamily: "var(--font-archivo), sans-serif",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: "0.02em",
          fontVariationSettings: "'wdth' 70",
          marginBottom: 40,
        }}
      >
        CRUX
      </div>
      <div
        style={{
          fontSize: "10.5px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 14,
        }}
      >
        {signUp ? "auth.signup // step 1 of 2" : "auth.signin // welcome back"}
      </div>
      <h2
        style={{
          fontFamily: "var(--font-archivo), sans-serif",
          fontVariationSettings: "'wdth' 70",
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          textTransform: "uppercase",
          margin: "0 0 12px",
        }}
      >
        {signUp ? "Create your account" : "Sign in"}
      </h2>
      <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "0 0 32px", lineHeight: 1.6 }}>
        {signUp ? "Takes about twenty seconds." : "Pick up where your crew left off."}
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          onClick={() => signIn("google", { callbackUrl: "/crew/new" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
            padding: "14px 16px",
            fontSize: "11.5px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <span style={{ color: "var(--muted)" }}>01</span> Continue with Google
        </button>
        <button
          onClick={() => signIn("github", { callbackUrl: "/crew/new" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
            padding: "14px 16px",
            fontSize: "11.5px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <span style={{ color: "var(--muted)" }}>02</span> Continue with GitHub
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          margin: "24px 0",
          color: "var(--muted)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} /> or{" "}
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      {/* Email/password auth is out of MVP scope per the brief (Google/GitHub
          OAuth only) — this field is presentational, matching the design,
          and intentionally not wired to a submit handler. */}
      <div style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="college.email@domain.edu"
          disabled
          style={{
            width: "100%",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            padding: "14px 16px",
            fontSize: "12.5px",
            color: "var(--fg)",
            outline: "none",
            opacity: 0.6,
          }}
        />
        <button
          disabled
          title="Email sign-in isn't part of the MVP — use Google or GitHub above"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            border: "none",
            padding: 14,
            fontSize: "11.5px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          {signUp ? "Create account" : "Continue with email"}
        </button>
      </div>

      {devMode && (
        <div style={{ marginTop: 24, padding: 14, border: "1px dashed var(--line)", display: "grid", gap: 8 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)" }}>
            Dev only — instant login
          </div>
          <input
            type="email"
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              padding: "10px 12px",
              fontSize: "12.5px",
              color: "var(--fg)",
              outline: "none",
            }}
          />
          <button
            onClick={() => {
              if (!devEmail) return;
              window.location.href = `/api/dev-login?email=${encodeURIComponent(devEmail)}`;
            }}
            style={{
              background: "var(--fg)",
              color: "var(--bg)",
              border: "none",
              padding: 10,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Log in as this email
          </button>
        </div>
      )}

      <p style={{ fontSize: "11.5px", color: "var(--muted)", margin: "22px 0 0", letterSpacing: "0.04em" }}>
        {signUp ? "Already have an account?" : "New here?"}{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSignUp((v) => !v);
          }}
          style={{ color: "var(--accent)" }}
        >
          {signUp ? "Sign in" : "Create an account"}
        </a>
      </p>
    </div>
  );
}
