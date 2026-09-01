/**
 * Local JSON-file database.
 *
 * A simple, zero-dependency drop-in for the first 100 users. We use a
 * JSON file in .data/db.json. For a real production system, swap this
 * module for SQLite (better-sqlite3) or Postgres — the API surface stays
 * the same.
 */

import { promises as fs } from "node:fs"
import path from "node:path"

import type { AgentEvent, PosterDraft, Project, User } from "@aips/types"

const DATA_DIR = path.join(process.cwd(), ".data")
const DB_PATH = path.join(DATA_DIR, "db.json")

type Schema = {
  users: User[]
  projects: Project[]
  drafts: PosterDraft[]
  events: AgentEvent[]
  sessions: { token: string; userId: string; createdAt: string }[]
}

const EMPTY: Schema = {
  users: [],
  projects: [],
  drafts: [],
  events: [],
  sessions: [],
}

let cache: Schema | null = null
let writeLock: Promise<void> = Promise.resolve()

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function load(): Promise<Schema> {
  if (cache) return cache
  await ensureDir()
  try {
    const raw = await fs.readFile(DB_PATH, "utf8")
    cache = JSON.parse(raw) as Schema
  } catch {
    cache = { ...EMPTY }
    await persist(cache)
  }
  return cache
}

async function persist(db: Schema): Promise<void> {
  await ensureDir()
  const tmp = `${DB_PATH}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db, null, 2))
  await fs.rename(tmp, DB_PATH)
}

async function withWrite<T>(fn: (db: Schema) => T | Promise<T>): Promise<T> {
  const previousLock = writeLock
  let resolve: () => void = () => {}
  writeLock = new Promise<void>((r) => {
    resolve = r
  })
  try {
    await previousLock
    const db = await load()
    const result = await fn(db)
    await persist(db)
    return result
  } finally {
    resolve()
  }
}

// ============================================
// Users
// ============================================
export async function findOrCreateUser(input: {
  email: string
  name?: string
  avatarUrl?: string
}): Promise<User> {
  return withWrite((db) => {
    let user = db.users.find((u) => u.email === input.email)
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: input.email,
        name: input.name ?? null,
        avatarUrl: input.avatarUrl ?? null,
        tier: "free",
        postersThisMonth: 0,
        createdAt: new Date().toISOString(),
      }
      db.users.push(user)
    } else if (input.name && !user.name) {
      user.name = input.name
    }
    return user
  })
}

export async function getUser(id: string): Promise<User | null> {
  const db = await load()
  return db.users.find((u) => u.id === id) ?? null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await load()
  return db.users.find((u) => u.email === email) ?? null
}

export async function setUserTier(userId: string, tier: User["tier"]): Promise<void> {
  await withWrite((db) => {
    const user = db.users.find((u) => u.id === userId)
    if (user) user.tier = tier
  })
}

export async function incrementPostersThisMonth(userId: string): Promise<number> {
  return withWrite((db) => {
    const user = db.users.find((u) => u.id === userId)
    if (!user) return 0
    user.postersThisMonth += 1
    return user.postersThisMonth
  })
}

// ============================================
// Sessions (for cookie auth)
// ============================================
export async function createSession(userId: string): Promise<string> {
  return withWrite((db) => {
    const token = crypto.randomUUID()
    db.sessions.push({
      token,
      userId,
      createdAt: new Date().toISOString(),
    })
    return token
  })
}

export async function getUserBySessionToken(token: string): Promise<User | null> {
  const db = await load()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) return null
  return db.users.find((u) => u.id === session.userId) ?? null
}

export async function deleteSession(token: string): Promise<void> {
  await withWrite((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token)
  })
}

// ============================================
// Projects
// ============================================
export async function createProject(
  input: Omit<Project, "id" | "createdAt" | "updatedAt">,
): Promise<Project> {
  return withWrite((db) => {
    const now = new Date().toISOString()
    const project: Project = {
      ...input,
      createdAt: now,
      updatedAt: now,
      id: crypto.randomUUID(),
    }
    db.projects.push(project)
    return project
  })
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await load()
  return db.projects.find((p) => p.id === id) ?? null
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project | null> {
  return withWrite((db) => {
    const project = db.projects.find((p) => p.id === id)
    if (!project) return null
    Object.assign(project, patch, { updatedAt: new Date().toISOString() })
    return project
  })
}

export async function listProjectsByUser(userId: string): Promise<Project[]> {
  const db = await load()
  return db.projects
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// ============================================
// Drafts
// ============================================
export async function createDraft(
  input: Omit<PosterDraft, "id" | "createdAt">,
): Promise<PosterDraft> {
  return withWrite((db) => {
    const draft: PosterDraft = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    db.drafts.push(draft)
    return draft
  })
}

export async function listDraftsByProject(projectId: string): Promise<PosterDraft[]> {
  const db = await load()
  return db.drafts
    .filter((d) => d.projectId === projectId)
    .sort((a, b) => a.turnNumber - b.turnNumber)
}

export async function getDraft(id: string): Promise<PosterDraft | null> {
  const db = await load()
  return db.drafts.find((d) => d.id === id) ?? null
}

export async function updateDraft(
  id: string,
  patch: Partial<PosterDraft>,
): Promise<PosterDraft | null> {
  return withWrite((db) => {
    const draft = db.drafts.find((d) => d.id === id)
    if (!draft) return null
    Object.assign(draft, patch)
    return draft
  })
}

// ============================================
// Events (for live activity stream)
// ============================================
export async function appendEvent(
  event: Omit<AgentEvent, "id" | "timestamp">,
): Promise<AgentEvent> {
  return withWrite((db) => {
    const e: AgentEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    db.events.push(e)
    return e
  })
}

export async function listEventsByProject(projectId: string): Promise<AgentEvent[]> {
  const db = await load()
  return db.events
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

// ============================================
// Reset (for tests / dev)
// ============================================
export async function resetDb(): Promise<void> {
  await withWrite((db) => {
    db.users = []
    db.projects = []
    db.drafts = []
    db.events = []
    db.sessions = []
  })
}
