import { login } from "@/lib/auth/session"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { userId } = await login(parsed.data)
  return NextResponse.json({ userId, ok: true })
}
