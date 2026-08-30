import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchAtlas – AI Research Field Cartographer & Intelligence",
  description:
    "Autonomous AI agent that maps entire ML research fields from a single search. Synthesis of 250M+ preprints into interactive evolutionary landscapes, scientific tensions, and Obsidian vaults.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">{children}</body>
    </html>
  );
}
