import { requireUser } from "@/lib/auth/session"
import { appendEvent, getProject, updateProject } from "@/lib/db/local"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  feedback: z.string().min(1).max(2000),
})

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

  await appendEvent({
    projectId: id,
    runId: id,
    stage: "planning",
    message: `User feedback: "${parsed.data.feedback.slice(0, 120)}${parsed.data.feedback.length > 120 ? "…" : ""}"`,
    draftNumber: (project.drafts?.length ?? 0) + 1,
  })

  // Mark project as needing another iteration
  await updateProject(id, { status: "drafting" })

  // Trigger the pipeline to run one more turn with feedback applied
  // Lazy import to avoid circular deps
  const { runPipeline } = await import("@/lib/agents/run-pipeline")
  void runPipeline(id, parsed.data.feedback).catch((err: unknown) => {
    console.error("Feedback pipeline failed:", err)
  })

  return NextResponse.json({ ok: true })
}
