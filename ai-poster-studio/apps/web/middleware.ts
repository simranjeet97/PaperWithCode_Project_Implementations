import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PATHS = ["/app", "/app/new", "/app/p"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!isProtected) return NextResponse.next()

  const sessionCookie = request.cookies.get("aips_session")
  if (sessionCookie) return NextResponse.next()

  const signInUrl = new URL("/sign-in", request.url)
  signInUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}