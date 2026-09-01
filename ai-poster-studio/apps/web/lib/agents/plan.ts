/**
 * Poster planning — given a content brief, decide:
 *   - which panels to include
 *   - color palette (single accent)
 *   - typography
 *
 * Uses Ollama locally if available. Falls back to a deterministic template.
 */

import "server-only"
import { getOllamaBaseUrl, ollamaComplete } from "@/lib/llm/ollama"
import type { ContentBrief } from "./ingest"

export type PosterPlan = {
  template: string
  panels: Array<{
    id: string
    type: string
    title: string
    contentRefs: string[]
    position: { x: number; y: number; width: number; height: number }
    priority: number
  }>
  palette: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    muted: string
    source: string
  }
  typography: {
    displayFont: string
    bodyFont: string
    monoFont: string
  }
  generatedAt: string
}

export async function generatePosterPlan(
  brief: ContentBrief,
  template: string,
): Promise<PosterPlan> {
  const basePlan = templatePlan(brief, template)

  // Try Ollama for palette selection (optional — falls back to deterministic)
  try {
    const ollamaUrl = getOllamaBaseUrl()
    const palettePrompt = `Paper title: ${brief.paperTitle.slice(0, 80)}.
Suggest ONE accent color (hex) that fits the topic. Reply with only the hex code.`
    const response = await ollamaComplete(ollamaUrl, palettePrompt, { model: "qwen2.5:7b" })
    const match = response.match(/#[0-9a-fA-F]{6}/)
    if (match) {
      basePlan.palette.primary = match[0]
      basePlan.palette.accent = match[0]
    }
  } catch {
    // Ollama not running — use deterministic palette
  }

  return basePlan
}

function templatePlan(brief: ContentBrief, template: string): PosterPlan {
  const panels: PosterPlan["panels"] = [
    {
      id: "p-title",
      type: "title",
      title: brief.paperTitle,
      contentRefs: [],
      position: { x: 0, y: 0, width: 1, height: 0.1 },
      priority: 1,
    },
    {
      id: "p-abstract",
      type: "abstract",
      title: "Abstract",
      contentRefs: brief.sections[0]?.id ? [brief.sections[0].id] : [],
      position: { x: 0, y: 0.1, width: 1, height: 0.1 },
      priority: 2,
    },
  ]

  brief.sections.slice(0, 6).forEach((sec, idx) => {
    panels.push({
      id: `p-section-${idx}`,
      type: ["method", "results", "conclusion", "body", "body", "body"][idx] ?? "body",
      title: sec.heading,
      contentRefs: [sec.id],
      position: {
        x: (idx % 2) * 0.5,
        y: 0.22 + Math.floor(idx / 2) * 0.16,
        width: 0.5,
        height: 0.15,
      },
      priority: 3 + idx,
    })
  })

  brief.figures.slice(0, 3).forEach((fig, idx) => {
    panels.push({
      id: `p-fig-${fig.id}`,
      type: "figure",
      title: fig.caption,
      contentRefs: [fig.id],
      position: { x: 0.5 + (idx % 2) * 0.25, y: 0.7, width: 0.25, height: 0.15 },
      priority: 7,
    })
  })

  panels.push({
    id: "p-references",
    type: "references",
    title: "References",
    contentRefs: [],
    position: { x: 0, y: 0.92, width: 1, height: 0.08 },
    priority: 99,
  })

  return {
    template,
    panels,
    palette: {
      primary: "#4f46e5",
      secondary: "#eef1ff",
      accent: "#4f46e5",
      background: "#ffffff",
      text: "#111827",
      muted: "#6b7280",
      source: "template",
    },
    typography: {
      displayFont: "Inter",
      bodyFont: "Inter",
      monoFont: "JetBrains Mono",
    },
    generatedAt: new Date().toISOString(),
  }
}
