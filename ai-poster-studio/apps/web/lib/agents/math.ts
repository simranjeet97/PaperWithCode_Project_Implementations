/**
 * Math detection and rendering for poster text.
 *
 * Finds inline LaTeX patterns (`$...$`, `\(...\)`) and display patterns
 * (`$$...$$`, `\[...\]`) in extracted text, replaces them with placeholder
 * spans that KaTeX will render on the client.
 *
 * Also auto-wraps common math patterns (subscripts, superscripts, Greek
 * letters) so ML papers' implicit math gets rendered.
 */

import "server-only"

const INLINE_PATTERN = /(\$[^$\n]+\$|\\\([\s\S]+?\\\))/g
const DISPLAY_PATTERN = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g

// Common math shortcuts found in ML papers — convert plain to LaTeX
const SUBSCRIPT_RE = /\b([A-Za-z]+)_(\d+|[A-Za-z])\b/g // x_1, x_n -> x_{1}, x_{n}
const SUPERSCRIPT_RE = /\b([A-Za-z])\^(\d+|[A-Za-z])\b/g // x^2, x^T -> x^{2}, x^{T}
const GREEK_RE =
  /\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|lambda|mu|pi|sigma|tau|phi|psi|omega)\b/g

export type MathSegment =
  | { type: "text"; value: string }
  | { type: "inline"; latex: string }
  | { type: "display"; latex: string }

export function preProcessMath(text: string): string {
  return text
    .replace(SUBSCRIPT_RE, "$1_{$2}")
    .replace(SUPERSCRIPT_RE, "$1^{$2}")
    .replace(GREEK_RE, (m) => `\\${m}`)
}

export function splitMath(text: string): MathSegment[] {
  const segments: MathSegment[] = []
  // First find display math
  const displayMatches: { start: number; end: number; latex: string }[] = []
  for (const m of text.matchAll(DISPLAY_PATTERN)) {
    displayMatches.push({
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      latex: m[0].replace(/^\$\$|\$\$$|\\\ [|\\\ ]$/g, ""),
    })
  }
  // Find inline math (only outside display blocks)
  const inlineMatches: { start: number; end: number; latex: string }[] = []
  for (const m of text.matchAll(INLINE_PATTERN)) {
    const s = m.index ?? 0
    const e = s + m[0].length
    if (displayMatches.some((d) => s >= d.start && e <= d.end)) continue
    inlineMatches.push({
      start: s,
      end: e,
      latex: m[0].replace(/^\$|\$$|\\\(|\\\)$/g, ""),
    })
  }
  // Merge all
  const all = [
    ...displayMatches.map((d) => ({ ...d, type: "display" as const })),
    ...inlineMatches.map((i) => ({ ...i, type: "inline" as const })),
  ].sort((a, b) => a.start - b.start)
  let cursor = 0
  for (const m of all) {
    if (m.start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, m.start) })
    }
    segments.push({ type: m.type, latex: m.latex })
    cursor = m.end
  }
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) })
  }
  return segments
}

export function renderMathInText(text: string): string {
  const preprocessed = preProcessMath(text)
  const segments = splitMath(preprocessed)
  return segments
    .map((s) => {
      if (s.type === "text") return escapeHtml(s.value)
      if (s.type === "inline") {
        return `<span class="math math-inline" data-latex="${escapeHtml(s.latex)}"></span>`
      }
      return `<div class="math math-display" data-latex="${escapeHtml(s.latex)}"></div>`
    })
    .join("")
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
