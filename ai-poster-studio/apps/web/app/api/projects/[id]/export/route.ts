import { getTemplate } from "@/lib/agents/templates"
import { requireUser } from "@/lib/auth/session"
import { getProject, listDraftsByProject } from "@/lib/db/local"
import { NextResponse } from "next/server"
import puppeteer from "puppeteer-core"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Page dimensions sourced from the template definition (lib/agents/templates.ts).
// Puppeteer uses CSS pixels. 96 CSS px = 1 inch = 25.4mm. So 1mm ≈ 3.7795 px.

const schema = z.object({
  format: z.enum(["png", "pdf", "html"]),
  draftNumber: z.number().int().min(1).max(10).default(1),
})

async function findChrome(): Promise<string | null> {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    try {
      const { statSync } = await import("node:fs")
      statSync(c)
      return c
    } catch {}
  }
  return null
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const drafts = await listDraftsByProject(id)
  // Find all drafts with the requested turnNumber; prefer the most recent.
  // If the client didn't specify (default 1), return the latest draft.
  const turn = parsed.data.draftNumber
  const matching = turn === 1 ? drafts : drafts.filter((d) => d.turnNumber === turn)
  const draft = matching[matching.length - 1] ?? drafts[drafts.length - 1] ?? drafts[0]
  if (!draft?.htmlContent) {
    return NextResponse.json({ error: "No draft available" }, { status: 404 })
  }

  if (parsed.data.format === "html") {
    return new NextResponse(draft.htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="poster-draft-${draft.turnNumber}.html"`,
      },
    })
  }

  const chromePath = await findChrome()
  if (!chromePath) {
    return NextResponse.json(
      { error: "Chrome/Chromium not found. Set CHROME_PATH env var or install Chrome." },
      { status: 503 },
    )
  }

  // Resolve actual page dimensions from the template definition
  const templateDef = getTemplate(project.template)
  const pageMm: { width: number; height: number } = {
    width: templateDef.pageSize.width,
    height: templateDef.pageSize.height,
  }
  // Puppeteer uses CSS pixels. 96 CSS px = 1 inch = 25.4mm. So 1mm ≈ 3.7795 px.
  const MM_TO_PX = 96 / 25.4
  const pagePx = {
    width: Math.round(pageMm.width * MM_TO_PX),
    height: Math.round(pageMm.height * MM_TO_PX),
  }
  // PNG at 300 DPI: scale by 300/96 ≈ 3.125
  const PNG_DPI_SCALE = 300 / 96

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({
      width: pagePx.width,
      height: pagePx.height,
      deviceScaleFactor: parsed.data.format === "png" ? PNG_DPI_SCALE : 1,
    })
    await page.setContent(draft.htmlContent, { waitUntil: "networkidle0", timeout: 30000 })
    // Wait for KaTeX to render
    await new Promise((r) => setTimeout(r, 1000))

    if (parsed.data.format === "png") {
      const png = await page.screenshot({ type: "png", fullPage: true })
      return new NextResponse(Buffer.from(png as Uint8Array), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="poster-${project.template}-draft-${draft.turnNumber}.png"`,
        },
      })
    }
    if (parsed.data.format === "pdf") {
      const pdf = await page.pdf({
        width: `${pageMm.width}mm`,
        height: `${pageMm.height}mm`,
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
        preferCSSPageSize: true,
      })
      return new NextResponse(Buffer.from(pdf as Uint8Array), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="poster-${project.template}-draft-${draft.turnNumber}.pdf"`,
        },
      })
    }
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
  } finally {
    await browser.close()
  }
}
