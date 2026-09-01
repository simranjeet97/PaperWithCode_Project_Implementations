import { CTABanner } from "@/components/marketing/cta-banner"

export const metadata = {
  title: "Blog",
  description: "Updates, research notes, and changelog.",
}

const POSTS = [
  {
    slug: "building-ai-poster-studio",
    title: "Why I built AI Poster Studio",
    excerpt:
      "The story behind the tool, the AutoDesign inspiration, and what we cut to ship in 4 weeks.",
    date: "2026-08-30",
    readingTime: "5 min",
    tag: "Essay",
  },
  {
    slug: "designing-the-3-panel-workspace",
    title: "Designing the 3-panel workspace",
    excerpt:
      "How we landed on PDF viewer | Agent activity | Poster render. The trade-offs and what we stole from Linear and Cursor.",
    date: "2026-08-28",
    readingTime: "8 min",
    tag: "Design",
  },
  {
    slug: "agent-loop-explained",
    title: "The agent loop, explained",
    excerpt:
      "Ingestion → Planning → Drafting → Critique → Revision → Finalize. With code snippets and timing breakdowns.",
    date: "2026-08-25",
    readingTime: "12 min",
    tag: "Engineering",
  },
] as const

export default function BlogIndex() {
  return (
    <>
      <section className="section-rhythm">
        <div className="mx-auto max-w-marketing px-6">
          <p className="text-caption-uppercase text-accent">Blog</p>
          <h1 className="mt-3 text-hero text-fg">Updates and research notes.</h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-marketing px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post) => (
              <article key={post.slug} className="rounded-lg border border-border bg-surface p-6">
                <div className="flex items-center justify-between text-caption-uppercase text-muted">
                  <span className="text-accent">{post.tag}</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-fg">{post.title}</h2>
                <p className="mt-2 text-fg-2">{post.excerpt}</p>
                <p className="mt-6 font-mono text-xs text-muted">{post.date}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
