"use client";

import { useRef, useCallback } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

const LANGUAGE_MAP: Record<string, string> = {
  "Python 3": "python",
  "C++ 17": "cpp",
  "Java 17": "java",
  "JavaScript": "javascript",
};

// Theme definition matching Crux's cooler app palette (app/globals.css :root).
// Dark-only per Plan 3 Task 1 — there is no light-mode counterpart anymore.
function defineThemes(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme("crux-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "eae23c" },
      { token: "string", foreground: "a3b18a" },
      { token: "comment", foreground: "9a968e" },
      { token: "number", foreground: "eae23c" },
      { token: "type", foreground: "eae27a" },
      { token: "function", foreground: "f6f5f3" },
    ],
    colors: {
      "editor.background": "#1e2024",
      "editor.foreground": "#f6f5f3",
      "editorLineNumber.foreground": "#9a968e",
      "editorLineNumber.activeForeground": "#eae23c",
      "editor.selectionBackground": "#eae23c40",
      "editor.lineHighlightBackground": "#ffffff06",
      "editorCursor.foreground": "#eae23c",
      "editorIndentGuide.background": "#232427",
      "editorIndentGuide.activeBackground": "#585b62",
      "editor.selectionHighlightBackground": "#eae23c20",
      "editorWidget.background": "#16171b",
      "editorWidget.border": "#585b62",
      "editorSuggestWidget.background": "#16171b",
      "editorSuggestWidget.border": "#585b62",
      "editorSuggestWidget.selectedBackground": "#1e2024",
      "scrollbarSlider.background": "#585b6240",
      "scrollbarSlider.hoverBackground": "#585b6280",
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
    monaco.editor.setTheme("crux-dark");

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
