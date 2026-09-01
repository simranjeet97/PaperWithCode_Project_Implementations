/**
 * Poster template definitions.
 *
 * Each template describes:
 *  - id, name, description
 *  - aspect ratio (poster width × height in mm)
 *  - layout style: "2col" | "landscape-flow" | "stack" | "neurips" | "nature"
 *  - accent treatment (bordered, tinted, minimal)
 *
 * The actual rendering happens in design.ts — this is the catalog.
 * Used by both server (design.ts) and client (TemplatePicker).
 */

export type TemplateLayout = "2col" | "landscape-flow" | "stack" | "neurips" | "nature"

export type PosterTemplateDef = {
  id: "cvpr-portrait" | "cvpr-landscape" | "icml-portrait" | "neurips-portrait" | "nature-portrait"
  name: string
  shortName: string
  description: string
  aspectRatio: "A0-portrait" | "A0-landscape" | "US-Letter"
  layout: TemplateLayout
  pageSize: { width: number; height: number }
  popular?: boolean
}

export const POSTER_TEMPLATES: PosterTemplateDef[] = [
  {
    id: "cvpr-portrait",
    name: "CVPR Portrait",
    shortName: "CVPR",
    description:
      "Standard 2-column vertical layout. Title + abstract on top, sections on the left, figures/diagrams/claims/table on the right.",
    aspectRatio: "A0-portrait",
    layout: "2col",
    pageSize: { width: 841, height: 1189 },
    popular: true,
  },
  {
    id: "cvpr-landscape",
    name: "CVPR Landscape",
    shortName: "CVPR L",
    description:
      "Wide 3-column horizontal flow. Big architecture diagram in the center, sections fan out left and right.",
    aspectRatio: "A0-landscape",
    layout: "landscape-flow",
    pageSize: { width: 1189, height: 841 },
  },
  {
    id: "icml-portrait",
    name: "ICML Portrait",
    shortName: "ICML",
    description:
      "Single-column stacked layout. Sections flow top-to-bottom in full width — best for narrative-heavy papers.",
    aspectRatio: "A0-portrait",
    layout: "stack",
    pageSize: { width: 841, height: 1189 },
  },
  {
    id: "neurips-portrait",
    name: "NeurIPS Portrait",
    shortName: "NeurIPS",
    description:
      "Hero header layout. Title section takes 30% of canvas, abstract spans full width, then 2-column body.",
    aspectRatio: "A0-portrait",
    layout: "neurips",
    pageSize: { width: 841, height: 1189 },
  },
  {
    id: "nature-portrait",
    name: "Nature Portrait",
    shortName: "Nature",
    description:
      "Minimal magazine layout. Large abstract, three key claims highlighted, condensed sections.",
    aspectRatio: "A0-portrait",
    layout: "nature",
    pageSize: { width: 841, height: 1189 },
  },
]

export function getTemplate(id: string): PosterTemplateDef {
  const t = POSTER_TEMPLATES.find((t) => t.id === id)
  if (!t) return POSTER_TEMPLATES[0] as PosterTemplateDef
  return t
}
