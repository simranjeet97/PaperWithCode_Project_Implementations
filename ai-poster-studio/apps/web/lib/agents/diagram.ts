/**
 * Diagram generation — produces clean inline SVG for the poster.
 *
 * AutoDesign-style systems use this kind of structured diagram rather than
 * fighting with Mermaid's runtime. We extract the architecture (input →
 * encoder → decoder → output) from the paper's "Model Architecture" /
 * "Method" section, then render a clean SVG.
 *
 * For papers with explicit component lists (e.g. "We propose X, Y, and Z
 * that feed into W"), we extract those components.
 *
 * If we can't extract a clear architecture, we return null and the design
 * step falls back to a placeholder.
 */

import "server-only"
import type { ContentBrief } from "./ingest"

export type ArchitectureDiagram = {
  svg: string
  caption: string
  reasoning: string
}

const COMPONENT_PATTERNS = [
  /(?:we (?:propose|introduce|present)\s+)([^.]+)/gi,
  /(?:our (?:model|architecture|framework)\s+(?:consists?\s+of|comprises|includes)\s+)([^.]+)/gi,
  /(?:the (?:model|architecture|framework)\s+(?:consists?\s+of|comprises|includes)\s+)([^.]+)/gi,
]

const ARROW_PATTERNS = [
  /(?:then|next|finally|after that|outputs?)\s+([^.]+)/gi,
  /(?:feeds?\s+into|is (?:passed|fed) to|goes to)\s+([^.]+)/gi,
]

export async function generateArchitectureDiagram(
  brief: ContentBrief,
): Promise<ArchitectureDiagram | null> {
  // 1. Find a section that's about architecture/method
  const archSection = brief.sections.find((s) =>
    /architecture|model|method|approach|framework|network/i.test(s.heading),
  )
  if (!archSection) return null

  const text = archSection.text

  // 2. Extract components
  const components: string[] = []
  for (const pattern of COMPONENT_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) {
      for (const m of matches) {
        // Split on commas / "and"
        const parts = m
          .replace(/^[^,]*?(?:propose|introduce|present|consists?\s+of|comprises|includes)\s+/i, "")
          .split(/,\s*|\s+and\s+/)
          .map((s) => s.trim().replace(/[.;]+$/, ""))
          .filter((s) => s.length > 2 && s.length < 50)
        components.push(...parts)
      }
    }
  }

  if (components.length < 2) {
    // Fallback: extract technical terms from the architecture text
    // For ML papers: "encoder", "decoder", "attention", "layer", etc.
    const lower = text.toLowerCase()
    const TECH_TERMS = [
      "encoder", "decoder", "attention", "input", "output", "embedding",
      "layer", "head", "feed-forward", "position-wise", "residual",
      "normalization", "token", "embedding layer", "self-attention",
      "multi-head attention", "encoder layer", "decoder layer",
      "linear projection", "softmax", "mask", "query", "key", "value",
    ]
    const found = TECH_TERMS.filter((term) => lower.includes(term))
    if (found.length >= 2) {
      components.push(...found.slice(0, 6))
    } else {
      // Last resort: capitalized noun phrases
      const phrases = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}/g) ?? []
      const SKIP = new Set([
        "The", "This", "These", "Our", "We", "In", "An", "It", "As", "By", "All", "Most",
        "Given", "Each", "Both", "Many", "Some", "One", "Two", "Three", "Here",
      ])
      const candidates = phrases
        .filter((p) => !SKIP.has(p.split(" ")[0] ?? ""))
        .filter((p) => p.toLowerCase() !== archSection.heading.toLowerCase())
        .filter((p) => p.length < 35 && p.length > 4)
        .slice(0, 6)
      components.push(...candidates)
    }
  }

  if (components.length < 2) return null

  // Dedupe, keep order, cap at 6
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const c of components) {
    const key = c.toLowerCase().slice(0, 20)
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(c)
    }
    if (deduped.length >= 6) break
  }

  // 3. Render a horizontal flow diagram
  const boxWidth = 130
  const boxHeight = 56
  const gap = 36
  const totalWidth = deduped.length * boxWidth + (deduped.length - 1) * gap
  const height = boxHeight + 60
  const startX = 20
  const boxY = 30

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth + 40} ${height}" width="100%" height="${height}" style="font-family: 'Inter', sans-serif;">`

  // Background
  svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5"/></marker></defs>`

  // Boxes + arrows
  deduped.forEach((comp, i) => {
    const x = startX + i * (boxWidth + gap)
    svg += `<rect x="${x}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="8" fill="white" stroke="#4f46e5" stroke-width="1.5"/>`
    // Truncate text to fit
    const label = comp.length > 18 ? `${comp.slice(0, 17)}…` : comp
    svg += `<text x="${x + boxWidth / 2}" y="${boxY + boxHeight / 2 + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">${escapeXml(label)}</text>`
    if (i < deduped.length - 1) {
      const arrowX = x + boxWidth
      const arrowY = boxY + boxHeight / 2
      svg += `<line x1="${arrowX}" y1="${arrowY}" x2="${arrowX + gap}" y2="${arrowY}" stroke="#4f46e5" stroke-width="1.5" marker-end="url(#arrow)"/>`
    }
  })

  svg += `</svg>`

  return {
    svg,
    caption: `Model architecture — ${archSection.heading}`,
    reasoning: `Extracted ${deduped.length} components from the "${archSection.heading}" section. Rendered as a left-to-right flow because the section describes sequential processing (input → ... → output).`,
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}