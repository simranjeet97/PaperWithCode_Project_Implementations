import { requireUser } from "@/lib/auth/session"
import { getProject } from "@/lib/db/local"
import { NextResponse } from "next/server"

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ project })
}
