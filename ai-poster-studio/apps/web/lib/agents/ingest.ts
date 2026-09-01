/**
 * PDF ingestion — extracts text + figures + tables + claims from a PDF.
 *
 * Uses pdf-parse in Node for text and figures; Python pdfplumber for
 * structured tables. Falls back to a stub brief if parsing fails.
 */

import "server-only"
import { promises as fs } from "node:fs"
import path from "node:path"

import "server-only"

export type ContentBrief = {
  paperTitle: string
  authors: string[]
  abstract: string
  sections: Array<{
    id: string
    heading: string
    level: number
    text: string
    pageStart: number
    pageEnd: number
  }>
  figures: Array<{
    id: string
    caption: string
    pageNumber: number
    imageUrl: string | null
    type: string
    boundingBox: { x: number; y: number; width: number; height: number }
  }>
  tables: Array<{
    id: string
    caption: string
    pageNumber: number
    headers: string[]
    rows: string[][]
  }>
  claims: Array<{
    id: string
    text: string
    sourcePage: number
    sourceSection: string
    importance: string
  }>
  references: Array<{ id: string; citation: string; doi: string | null; arxivId: string | null }>
}

export async function extractContentBrief(paperFileUrl: string): Promise<ContentBrief> {
  let pdfBytes: Uint8Array | null = null
  try {
    if (paperFileUrl.startsWith("/api/upload/file")) {
      const absUrl = new URL(paperFileUrl, "http://localhost:3000").toString()
      const res = await fetch(absUrl)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        pdfBytes = new Uint8Array(buf)
      }
    } else if (paperFileUrl.startsWith("http")) {
      const res = await fetch(paperFileUrl)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        pdfBytes = new Uint8Array(buf)
      }
    }
  } catch (err) {
    console.warn("Could not fetch PDF for ingestion:", err)
  }

  if (pdfBytes) {
    try {
      return await parsePdfBytes(pdfBytes)
    } catch (err) {
      console.warn("PDF parse failed, using stub brief:", err instanceof Error ? err.message : err)
    }
  }

  return stubBrief()
}

async function parsePdfBytes(bytes: Uint8Array): Promise<ContentBrief> {
  // pdf-parse v1.x — the package's index.js runs a self-test on import.
  // We import the lib file directly to bypass that side effect.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParseMod = await import("pdf-parse/lib/pdf-parse.js")
  const pdfParse = (
    pdfParseMod as unknown as {
      default: (
        buffer: Uint8Array,
        options?: Record<string, unknown>,
      ) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>
    }
  ).default

  const result = await pdfParse(bytes)
  const fullText = result.text
  const numPages = result.numpages

  // Also extract real tables via Python pdfplumber (best-effort, $0 local).
  // We write the PDF to a temp file first since the Python script needs a path.
  let tables: NonNullable<ContentBrief["tables"]> = []
  try {
    const { extractTables, tablesToBrief } = await import("./tables")
    const tmpPath = path.join(process.cwd(), ".data", "tmp", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`)
    await fs.mkdir(path.dirname(tmpPath), { recursive: true })
    await fs.writeFile(tmpPath, bytes)
    const extracted = await extractTables(tmpPath)
    tables = tablesToBrief(extracted)
    await fs.unlink(tmpPath).catch(() => {})
  } catch (err) {
    console.warn("Real table extraction failed (continuing with captions only):", err instanceof Error ? err.message : err)
  }

  // Split by pages — pdf-parse includes form-feed \f between pages
  const pages = fullText
    .split(/\f/)
    .map((p) => p.trim())
    .filter(Boolean)

  // Extract title from first non-empty line of page 1
  // Skip common non-title lines: "Provided proper attribution...", "Abstract", "arXiv:..."
  const page1Text = pages[0] ?? ""
  const page1Lines = page1Text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  let title = "Research Paper"
  for (const line of page1Lines.slice(0, 15)) {
    const lower = line.toLowerCase()
    // Skip permission/license lines, arXiv headers, very short or very long lines
    if (lower.startsWith("provided proper attribution")) continue
    if (lower.startsWith("arxiv:") || lower.startsWith("arXiv:")) continue
    if (lower.startsWith("permission to")) continue
    if (lower.startsWith("reproduce the tables")) continue
    if (lower.startsWith("scholarly works")) continue
    if (lower.startsWith("abstract")) continue
    if (lower.length < 8 || line.length > 200) continue
    if (/^[\d.\s]+$/.test(line)) continue
    // Skip lines that don't look like a title — titles usually start with capital letter
    if (!/^[A-Z]/.test(line)) continue
    title = line
    break
  }

  // Authors — typically follow the title. They may be:
  // 1) one comma-separated line
  // 2) one author per line, possibly interleaved with affiliation markers
  let authors: string[] = []
  const titleIdx = page1Lines.findIndex((l) => l === title)
  const abstractIdx = page1Lines.findIndex((l) => l.toLowerCase().startsWith("abstract"))
  const afterTitle = page1Lines
    .slice(
      titleIdx >= 0 ? titleIdx + 1 : 1,
      abstractIdx > 0 ? abstractIdx : Math.min(titleIdx + 30, page1Lines.length),
    )
    .slice(0, 30)

  // First try: any single line with comma-separated names
  const commaLine = afterTitle.find(
    (l) => l.includes(",") && l.split(",").length >= 2 && l.length < 250,
  )
  if (commaLine) {
    authors = commaLine
      .split(",")
      .map((a) =>
        a
          .replace(/\*|†|‡|§/g, "")
          .replace(/\d+/g, "")
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
          .replace(/equal contribution/gi, "")
          .trim(),
      )
      .filter((a) => a.length >= 3 && a.length < 60)
      .slice(0, 8)
  } else {
    // Otherwise, pick lines that look like names (2-3 capitalized words, no @, no affiliations)
    // Skip past email lines instead of breaking — emails are interleaved with names
    for (const line of afterTitle) {
      if (
        /Google|Inc|Corp|University|MIT|Stanford|Brain|Research|Department|Institute|Lab\b/i.test(
          line,
        )
      )
        continue
      if (/^[*†‡§]/.test(line)) continue
      if (/@/.test(line)) continue
      // 2-4 words, each starting with a capital letter
      if (/^[A-Z][a-z]+(\s+[A-Z]\.?)?\s*([A-Z][a-z]+)?(\s+[A-Z][a-z]+)?$/.test(line)) {
        const cleaned = line
          .replace(/\*|†|‡|§/g, "")
          .replace(/\d+/g, "")
          .trim()
        if (cleaned.length >= 5 && cleaned.length < 50) authors.push(cleaned)
      }
      if (authors.length >= 8) break
    }
  }
  if (authors.length === 0) authors = ["Authors"]

  // Abstract — text between "Abstract" header and "Introduction" (or first 800 chars)
  const abstractMatch = fullText.match(
    /Abstract\s*[:\.\-]?\s*([\s\S]{100,2500}?)(?=\n\s*\n\s*1[\s\.\n]|Introduction|Keywords)/i,
  )
  const abstract = abstractMatch
    ? (abstractMatch[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 1200)
    : page1Text.slice(0, 800)

  // Sections — look for numbered section headers across all pages
  const sections: ContentBrief["sections"] = []
  const sectionRegex = /\n\s*(\d{1,2}(?:\.\d{1,2})?)\s+([A-Z][A-Za-z][A-Za-z\s\-:,]{4,80})\n/g
  const seenHeadings = new Set<string>()
  for (const m of fullText.matchAll(sectionRegex)) {
    const heading = (m[2] ?? "").trim()
    const normalized = heading.toLowerCase().replace(/[^a-z]/g, "")
    if (seenHeadings.has(normalized)) continue
    if (
      ["abstract", "references", "acknowledgments", "appendix"].some((s) =>
        normalized.startsWith(s),
      )
    )
      continue
    seenHeadings.add(normalized)
    const charPos = m.index ?? 0
    const approxPage = Math.min(
      numPages,
      Math.max(1, Math.floor(charPos / (fullText.length / numPages)) + 1),
    )
    sections.push({
      id: `sec-${sections.length}`,
      heading,
      level: m[1]?.includes(".") ? 2 : 1,
      text: extractSectionText(fullText, charPos, m[1]?.length ?? 0),
      pageStart: approxPage,
      pageEnd: approxPage,
    })
    if (sections.length >= 12) break
  }

  if (sections.length === 0) {
    pages.forEach((p, idx) => {
      sections.push({
        id: `sec-${idx}`,
        heading: `Section ${idx + 1}`,
        level: 1,
        text: p.slice(0, 600),
        pageStart: idx + 1,
        pageEnd: idx + 1,
      })
    })
  }

  // Claims
  const claims = extractClaims(sections)

  // Figures — extract from captions
  const figures: ContentBrief["figures"] = []
  const figRegex = /(?:Figure|Fig\.?)\s+(\d+)[:\.\s]+([^\n]{10,120})/gi
  for (const fm of fullText.matchAll(figRegex)) {
    if (figures.length >= 6) break
    const caption = (fm[2] ?? "").trim().replace(/\s+/g, " ")
    const charPos = fm.index ?? 0
    const page = Math.min(
      numPages,
      Math.max(1, Math.floor(charPos / (fullText.length / numPages)) + 1),
    )
    figures.push({
      id: `fig-${fm[1] ?? figures.length}`,
      caption,
      pageNumber: page,
      imageUrl: null,
      type: "figure",
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    })
  }

  // Tables — extract from captions (fallback when Python extraction is unavailable)
  const captionTables: ContentBrief["tables"] = []
  const tblRegex = /(?:Table)\s+(\d+)[:\.\s]+([^\n]{10,120})/gi
  for (const tm of fullText.matchAll(tblRegex)) {
    if (captionTables.length >= 4) break
    const caption = (tm[2] ?? "").trim().replace(/\s+/g, " ")
    const charPos = tm.index ?? 0
    const page = Math.min(
      numPages,
      Math.max(1, Math.floor(charPos / (fullText.length / numPages)) + 1),
    )
    captionTables.push({
      id: `tbl-${tm[1] ?? captionTables.length}`,
      caption,
      pageNumber: page,
      headers: [],
      rows: [],
    })
  }

  return {
    paperTitle: title,
    authors,
    abstract,
    sections,
    figures,
    tables: tables.length > 0 ? tables : captionTables,
    claims,
    references: [],
  }
}

function extractSectionText(fullText: string, startPos: number, numLen: number): string {
  // Find the next section header or a hard cutoff
  const lookahead = fullText.slice(startPos + numLen + 5, startPos + numLen + 5 + 1500)
  // Stop at next numbered section
  const nextSection = lookahead.match(/\n\s*\d{1,2}(?:\.\d{1,2})?\s+[A-Z]/)
  const endPos = nextSection?.index ?? 1200
  return lookahead.slice(0, endPos).trim().slice(0, 800)
}

function extractClaims(sections: ContentBrief["sections"]): ContentBrief["claims"] {
  const verbs = [
    "show",
    "demonstrate",
    "achieve",
    "outperform",
    "propose",
    "introduce",
    "present",
    "report",
  ]
  const claims: ContentBrief["claims"] = []
  for (const sec of sections.slice(0, 6)) {
    for (const sentence of sec.text.split(/(?<=[.!?])\s+/)) {
      const s = sentence.trim().replace(/\s+/g, " ")
      if (s.length < 30 || s.length > 400) continue
      const words = s.toLowerCase().split(/\s+/)
      if (verbs.some((v) => words.includes(v))) {
        claims.push({
          id: `claim-${claims.length}`,
          text: s.endsWith(".") ? s : `${s}.`,
          sourcePage: sec.pageStart,
          sourceSection: sec.heading,
          importance: claims.length < 3 ? "primary" : "secondary",
        })
      }
      if (claims.length >= 10) break
    }
    if (claims.length >= 10) break
  }
  // Pad with synthesized claims if needed
  if (claims.length === 0) {
    claims.push({
      id: "claim-1",
      text: "We present a novel approach that improves upon prior state-of-the-art methods.",
      sourcePage: 1,
      sourceSection: "Abstract",
      importance: "primary",
    })
  }
  return claims
}

function stubBrief(): ContentBrief {
  return {
    paperTitle: "Research Paper",
    authors: ["Author A", "Author B"],
    abstract: "We present a method that advances the state of the art in this area.",
    sections: [
      {
        id: "sec-1",
        heading: "Abstract",
        level: 1,
        text: "We present...",
        pageStart: 1,
        pageEnd: 1,
      },
      {
        id: "sec-2",
        heading: "Introduction",
        level: 1,
        text: "Recent work has...",
        pageStart: 2,
        pageEnd: 3,
      },
      {
        id: "sec-3",
        heading: "Method",
        level: 1,
        text: "Our approach...",
        pageStart: 4,
        pageEnd: 6,
      },
      {
        id: "sec-4",
        heading: "Experiments",
        level: 1,
        text: "We evaluate on...",
        pageStart: 7,
        pageEnd: 9,
      },
      {
        id: "sec-5",
        heading: "Results",
        level: 1,
        text: "Table 2 shows...",
        pageStart: 10,
        pageEnd: 12,
      },
      {
        id: "sec-6",
        heading: "Conclusion",
        level: 1,
        text: "We have shown...",
        pageStart: 13,
        pageEnd: 14,
      },
    ],
    figures: [
      {
        id: "fig-1",
        caption: "Model architecture",
        pageNumber: 4,
        imageUrl: null,
        type: "diagram",
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      },
      {
        id: "fig-2",
        caption: "Training loss",
        pageNumber: 6,
        imageUrl: null,
        type: "chart",
        boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      },
    ],
    tables: [],
    claims: [
      {
        id: "claim-1",
        text: "Our method achieves state-of-the-art results on benchmarks.",
        sourcePage: 10,
        sourceSection: "Results",
        importance: "primary",
      },
      {
        id: "claim-2",
        text: "We demonstrate significant improvements over prior work.",
        sourcePage: 11,
        sourceSection: "Results",
        importance: "primary",
      },
      {
        id: "claim-3",
        text: "The approach scales efficiently to large models.",
        sourcePage: 12,
        sourceSection: "Results",
        importance: "secondary",
      },
    ],
    references: [],
  }
}
