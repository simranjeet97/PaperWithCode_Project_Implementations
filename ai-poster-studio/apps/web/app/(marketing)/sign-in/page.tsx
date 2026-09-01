"use client"

import { Logo } from "@/app/(marketing)/layout"
import { ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function SignInPage() {
  const router = useRouter()
  const params = useSearchParams()
  const mode = params.get("mode") === "signup" ? "signup" : "signin"
  const redirectTo = params.get("redirect") ?? "/app"

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Sign in failed")
      }
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface-warm px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-elevated">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-semibold text-fg">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-center text-sm text-fg-2">
          {mode === "signup"
            ? "Just an email — no password. We'll save your posters locally."
            : "Enter your email to sign in. No password needed."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-fg">
                Name <span className="text-muted">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="Your name"
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-fg">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="you@university.edu"
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "signup" ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-2">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/sign-in?mode=signup" className="font-medium text-accent hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>

        <p className="mt-6 text-center text-xs text-muted">
          100% local — your email is only stored in your browser's session cookie.
        </p>
      </div>
    </div>
  )
}
