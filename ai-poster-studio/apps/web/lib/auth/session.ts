/**
 * Cookie-based session auth — zero external services.
 *
 * Flow:
 *   POST /api/auth/login { email } -> creates user (if new), issues session cookie
 *   POST /api/auth/logout          -> clears cookie
 *   getCurrentUser()               -> reads cookie, returns User or null
 */

import "server-only"
import {
  createSession,
  deleteSession,
  findOrCreateUser,
  getUser,
  getUserBySessionToken,
} from "@/lib/db/local"
import { cookies } from "next/headers"

const COOKIE_NAME = "aips_session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function login(input: { email: string; name?: string }): Promise<{ userId: string }> {
  const user = await findOrCreateUser({ email: input.email, name: input.name })
  const token = await createSession(user.id)
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
  return { userId: user.id }
}

export async function logout(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    await deleteSession(token)
  }
  jar.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  return getUserBySessionToken(token)
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    const err = new Error("Unauthorized") as Error & { status: number }
    err.status = 401
    throw err
  }
  return user
}

export async function setCurrentUserId(userId: string): Promise<void> {
  const user = await getUser(userId)
  if (!user) throw new Error("User not found")
  const token = await createSession(user.id)
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
}
