import { SessionProvider } from "@/components/providers"
import { getCurrentUser } from "@/lib/auth/session"
import { SITE } from "@/lib/data"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  authors: [{ name: SITE.author, url: "https://www.linkedin.com/in/simranjeet97/" }],
  openGraph: {
    type: "website",
    title: SITE.tagline,
    description: SITE.description,
    siteName: SITE.name,
    images: [{ url: SITE.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.tagline,
    description: SITE.description,
    images: [SITE.ogImage],
    creator: "@simranjeet97",
  },
  robots: { index: true, follow: true },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-bg text-fg font-body antialiased">
        <SessionProvider user={user}>{children}</SessionProvider>
      </body>
    </html>
  )
}
