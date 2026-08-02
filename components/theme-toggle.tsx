"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({
  style,
}: {
  style?: React.CSSProperties;
}) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme !== "light");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      style={{
        background: "none",
        border: "1px solid var(--line)",
        color: "var(--muted)",
        fontSize: "10.5px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "7px 11px",
        cursor: "pointer",
        ...style,
      }}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
