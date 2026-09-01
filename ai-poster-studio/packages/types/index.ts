// Shared domain types for AI Poster Studio
// Used by web app, worker, and Inngest functions.

export type UserTier = "free" | "pro" | "lab"

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  tier: UserTier
  postersThisMonth: number
  createdAt: string
}

export type ProjectStatus =
  | "uploading"
  | "ingesting"
  | "planning"
  | "drafting"
  | "critiquing"
  | "finalizing"
  | "completed"
  | "failed"

export interface Project {
  id: string
  userId: string
  title: string
  paperFileUrl: string
  paperArxivId: string | null
  template: PosterTemplate
  aspectRatio: PosterAspectRatio
  accentColor: string
  status: ProjectStatus
  contentBrief: ContentBrief | null
  posterPlan: PosterPlan | null
  drafts: PosterDraft[]
  finalDraftId: string | null
  panelOverrides?: Record<string, string> | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export type PosterTemplate =
  | "cvpr-landscape"
  | "cvpr-portrait"
  | "icml-portrait"
  | "neurips-portrait"
  | "nature-portrait"
  | "custom"

export type PosterAspectRatio = "A0-landscape" | "A0-portrait" | "US-Letter"

export interface ContentBrief {
  paperTitle: string
  authors: string[]
  abstract: string
  sections: PaperSection[]
  figures: PaperFigure[]
  tables: PaperTable[]
  claims: PaperClaim[]
  references: PaperReference[]
}

export interface PaperSection {
  id: string
  heading: string
  level: number
  text: string
  pageStart: number
  pageEnd: number
}

export interface PaperFigure {
  id: string
  caption: string
  pageNumber: number
  boundingBox: { x: number; y: number; width: number; height: number }
  imageUrl: string
  type: "diagram" | "chart" | "photo" | "screenshot" | "equation"
}

export interface PaperTable {
  id: string
  caption: string
  pageNumber: number
  rows: string[][]
  headers: string[]
}

export interface PaperClaim {
  id: string
  text: string
  sourcePage: number
  sourceSection: string
  importance: "primary" | "secondary" | "supporting"
}

export interface PaperReference {
  id: string
  citation: string
  doi: string | null
  arxivId: string | null
}

export interface PosterPlan {
  template: PosterTemplate
  panels: PosterPanel[]
  palette: ColorPalette
  typography: PosterTypography
  generatedAt: string
}

export interface PosterPanel {
  id: string
  type:
    | "title"
    | "abstract"
    | "method"
    | "results"
    | "figure"
    | "table"
    | "conclusion"
    | "references"
  title: string
  contentRefs: string[]
  position: { x: number; y: number; width: number; height: number }
  priority: number
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  muted: string
  source: "colormind" | "manual" | "template"
}

export interface PosterTypography {
  displayFont: string
  bodyFont: string
  monoFont: string
}

export interface PosterDraft {
  id: string
  projectId: string
  turnNumber: number
  htmlContent: string
  previewPngUrl: string | null
  pdfUrl: string | null
  criticFeedback: CriticFeedback | null
  score: number | null
  accepted: boolean
  createdAt: string
  durationMs: number
}

export interface CriticFeedback {
  ruleChecks: RuleCheck[]
  vlmCritique: VLMCritique | null
  consolidated: string
  blockingFailures: number
}

export interface RuleCheck {
  name: string
  blocking: boolean
  passed: boolean
  message: string
}

export interface VLMCritique {
  layoutScore: number
  densityScore: number
  readabilityScore: number
  aestheticsScore: number
  feedback: string
  localizedIssues: LocalizedIssue[]
}

export interface LocalizedIssue {
  panelId: string
  description: string
  severity: "minor" | "major" | "blocking"
}

export type AgentStage = "reading" | "extracting" | "planning" | "rendering" | "critique" | "done"

export interface AgentEvent {
  id: string
  projectId: string
  runId?: string
  stage: AgentStage
  message: string
  detail?: string
  draftNumber?: number
  timestamp: string
}

export interface PosterSession {
  projectId: string
  userId: string
  currentDraft: number
  totalDrafts: number
  stage: AgentStage
  startedAt: string
  events: AgentEvent[]
}

export interface PosterReasoning {
  panelId: string
  explanation: string
  sourceTurn: number
  sourceCritic: string
}

export interface PricingTier {
  id: UserTier
  name: string
  priceMonthly: number
  priceAnnualMonthly: number
  features: string[]
  limits: {
    postersPerMonth: number
    seats: number
    apiAccess: boolean
    watermark: boolean
  }
  stripePriceId: string | null
  featured: boolean
}

export interface ExamplePoster {
  id: string
  title: string
  paperTitle: string
  paperArxivId: string | null
  authors: string[]
  field: PosterField
  previewUrl: string
  posterUrl: string
  draftCount: number
  timeMinutes: number
  featured: boolean
}

export type PosterField = "ai-ml" | "biomedicine" | "climate" | "economics" | "physics" | "other"

export interface UseCase {
  id: string
  title: string
  description: string
  audience: string
  tint: "peach" | "mint" | "lavender" | "sky" | "rose" | "yellow"
  icon: string
}

export interface CaseStudy {
  id: string
  slug: string
  title: string
  subtitle: string
  authorName: string
  authorRole: string
  authorAvatar: string | null
  body: string
  posterPreviewUrl: string
  stats: { label: string; value: string }[]
  publishedAt: string
}

export interface SocialLink {
  label: string
  href: string
  handle: string
}
