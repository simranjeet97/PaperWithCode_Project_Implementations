"use client"

import type { User } from "@aips/types"
import { type ReactNode, createContext, useContext } from "react"

type SessionContext = { user: User | null }

const Ctx = createContext<SessionContext>({ user: null })

export function SessionProvider({ user, children }: { user: User | null; children: ReactNode }) {
  return <Ctx.Provider value={{ user }}>{children}</Ctx.Provider>
}

export function useSession() {
  return useContext(Ctx)
}
