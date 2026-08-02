"use client";

import { useRef, useEffect, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

const LANGUAGE_MAP: Record<string, string> = {
  "Python 3": "python",
  "C++ 17": "cpp",
  "Java 17": "java",
  "JavaScript": "javascript",
};

// Theme definition matching Crux CSS variables
function defineThemes(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme("crux-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "c9a84c" },
      { token: "string", foreground: "a3b18a" },
      { token: "comment", foreground: "6a6a5f" },
      { token: "number", foreground: "c9a84c" },
      { token: "type", foreground: "d4b462" },
      { token: "function", foreground: "e8dcc8" },
    ],
    colors: {
      "editor.background": "#1e1d1a",
      "editor.foreground": "#ece8e0",
      "editorLineNumber.foreground": "#6a6a5f",
      "editorLineNumber.activeForeground": "#c9a84c",
      "editor.selectionBackground": "#c9a84c40",
      "editor.lineHighlightBackground": "#ffffff06",
      "editorCursor.foreground": "#c9a84c",
      "editorIndentGuide.background": "#2e2d2a",
      "editorIndentGuide.activeBackground": "#4a4940",
      "editor.selectionHighlightBackground": "#c9a84c20",
      "editorWidget.background": "#262520",
      "editorWidget.border": "#3e3d38",
      "editorSuggestWidget.background": "#262520",
      "editorSuggestWidget.border": "#3e3d38",
      "editorSuggestWidget.selectedBackground": "#3e3d38",
      "scrollbarSlider.background": "#3e3d3840",
      "scrollbarSlider.hoverBackground": "#3e3d3880",
    },
  });

  monaco.editor.defineTheme("crux-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "7a5d1e" },
      { token: "string", foreground: "5a7040" },
      { token: "comment", foreground: "8a8a7f" },
      { token: "number", foreground: "7a5d1e" },
      { token: "type", foreground: "8a6e2e" },
      { token: "function", foreground: "2e2d2a" },
    ],
    colors: {
      "editor.background": "#fafaf8",
      "editor.foreground": "#2e2d2a",
      "editorLineNumber.foreground": "#b0b0a8",
      "editorLineNumber.activeForeground": "#7a5d1e",
      "editor.selectionBackground": "#7a5d1e30",
      "editor.lineHighlightBackground": "#00000006",
      "editorCursor.foreground": "#7a5d1e",
      "editorIndentGuide.background": "#e8e8e4",
      "editorIndentGuide.activeBackground": "#c8c8c0",
      "editorWidget.background": "#f0f0ec",
      "editorWidget.border": "#dcdcd8",
      "scrollbarSlider.background": "#c8c8c040",
    },
  });
}

export function CodeEditor({
  language = "Python 3",
  value,
  onChange,
  readOnly = false,
}: {
  language?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    defineThemes(monaco);

    // Set initial theme based on current HTML data-theme
    const isDark = document.documentElement.dataset.theme !== "light";
    monaco.editor.setTheme(isDark ? "crux-dark" : "crux-light");

    editor.updateOptions({
      fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      padding: { top: 16, bottom: 16 },
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: "off",
      automaticLayout: true,
      readOnly,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "smooth",
      bracketPairColorization: { enabled: true },
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
        useShadows: false,
      },
    });
  }, [readOnly]);

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange?.(value ?? "");
    },
    [onChange],
  );

  // Watch for theme changes on the <html> element
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (monacoRef.current) {
        const isDark = document.documentElement.dataset.theme !== "light";
        monacoRef.current.editor.setTheme(
          isDark ? "crux-dark" : "crux-light",
        );
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Editor
      height="100%"
      language={LANGUAGE_MAP[language] ?? "python"}
      value={value}
      onChange={handleChange}
      onMount={handleMount}
      loading={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--muted)",
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          loading editor...
        </div>
      }
      options={{
        readOnly,
        minimap: { enabled: false },
      }}
    />
  );
}
