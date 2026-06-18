/**
 * Math.tsx — KaTeX rendering components
 *
 * DESIGN: "Scientific Notebook" — Swiss Typographic Style meets Modern SaaS
 * Provides two components:
 *   <InlineMath latex="..." /> — renders inline mathematics
 *   <BlockMath latex="..." />  — renders display-mode mathematics in a styled block
 *   <MathText text="..." />    — renders a string that may contain $...$ inline and $$...$$ block math
 */

import "katex/dist/katex.min.css";
import katex from "katex";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

// ─── Low-level renderer ───────────────────────────────────────────────────────

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return `<span class="text-rose-500 font-mono text-sm">${latex}</span>`;
  }
}

// ─── InlineMath ───────────────────────────────────────────────────────────────

export function InlineMath({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}) {
  const html = useMemo(() => renderKatex(latex, false), [latex]);
  return (
    <span
      className={cn("katex-inline", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── BlockMath ────────────────────────────────────────────────────────────────

export function BlockMath({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}) {
  const html = useMemo(() => renderKatex(latex, true), [latex]);
  return (
    <div
      className={cn(
        "equation-display overflow-x-auto py-4 px-5 rounded-r-lg",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── MathText ─────────────────────────────────────────────────────────────────
// Renders a string that may contain mixed text and math:
//   $$...$$ → display block
//   $...$   → inline
//   plain text → rendered as-is

export function MathText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = useMemo(() => parseMathText(text), [text]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }
        if (part.type === "block") {
          return (
            <div
              key={i}
              className="equation-display overflow-x-auto my-2 py-3 px-4 rounded-r-lg"
              dangerouslySetInnerHTML={{
                __html: renderKatex(part.content, true),
              }}
            />
          );
        }
        // inline
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              __html: renderKatex(part.content, false),
            }}
          />
        );
      })}
    </span>
  );
}

// ─── MathLines ────────────────────────────────────────────────────────────────
// Renders a multi-line solution string where each line may be a LaTeX expression.
// Lines starting with "$$" are rendered as display blocks; others as inline.

export function MathLines({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  return (
    <div className={cn("space-y-1.5", className)}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        // If the whole line is a LaTeX expression (starts/ends with $)
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
          const latex = trimmed.slice(2, -2).trim();
          return (
            <div
              key={i}
              className="overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: renderKatex(latex, true) }}
            />
          );
        }
        // Mixed text + inline math
        const parts = parseMathText(trimmed);
        return (
          <div key={i} className="font-mono text-sm leading-relaxed text-foreground">
            {parts.map((part, j) => {
              if (part.type === "text") {
                return <span key={j}>{part.content}</span>;
              }
              return (
                <span
                  key={j}
                  dangerouslySetInnerHTML={{
                    __html: renderKatex(part.content, false),
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Parser ───────────────────────────────────────────────────────────────────

type Part =
  | { type: "text"; content: string }
  | { type: "inline"; content: string }
  | { type: "block"; content: string };

function parseMathText(input: string): Part[] {
  const parts: Part[] = [];
  let remaining = input;

  while (remaining.length > 0) {
    // Check for display math $$...$$
    const blockStart = remaining.indexOf("$$");
    const inlineStart = remaining.indexOf("$");

    if (blockStart === -1 && inlineStart === -1) {
      parts.push({ type: "text", content: remaining });
      break;
    }

    // Block math comes first
    if (blockStart !== -1 && (inlineStart === -1 || blockStart <= inlineStart)) {
      if (blockStart > 0) {
        parts.push({ type: "text", content: remaining.slice(0, blockStart) });
      }
      const end = remaining.indexOf("$$", blockStart + 2);
      if (end === -1) {
        parts.push({ type: "text", content: remaining.slice(blockStart) });
        break;
      }
      parts.push({ type: "block", content: remaining.slice(blockStart + 2, end) });
      remaining = remaining.slice(end + 2);
      continue;
    }

    // Inline math
    if (inlineStart > 0) {
      parts.push({ type: "text", content: remaining.slice(0, inlineStart) });
    }
    const end = remaining.indexOf("$", inlineStart + 1);
    if (end === -1) {
      parts.push({ type: "text", content: remaining.slice(inlineStart) });
      break;
    }
    parts.push({ type: "inline", content: remaining.slice(inlineStart + 1, end) });
    remaining = remaining.slice(end + 1);
  }

  return parts;
}
