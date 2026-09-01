import { requireUser } from "@/lib/auth/session"
import { getProject, listDraftsByProject, listEventsByProject } from "@/lib/db/local"
import { NextResponse } from "next/server"

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const events = await listEventsByProject(id)
  const drafts = await listDraftsByProject(id)

  const accepted = drafts.find((d) => d.accepted)
  const latest = drafts[drafts.length - 1]
  const posterHtml = accepted?.htmlContent ?? latest?.htmlContent ?? null

  return NextResponse.json({
    status: project.status,
    template: project.template,
    aspectRatio: project.aspectRatio,
    paperFileUrl: project.paperFileUrl,
    events,
    drafts: drafts.map((d) => ({
      id: d.id,
      turnNumber: d.turnNumber,
      previewColor: "",
      accepted: d.accepted,
      critique: d.criticFeedback?.consolidated ?? "",
      htmlContent: d.htmlContent,
    })),
    posterHtml,
  })
}
