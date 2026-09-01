import { TryArxivButton } from "@/components/workspace/try-arxiv-button"
import { UploadZoneClient } from "@/components/workspace/upload-zone-client"

export const metadata = {
  title: "New poster",
}

const SAMPLE_PAPERS = [
  { title: "Attention Is All You Need", id: "1706.03762", authors: "Vaswani et al." },
  { title: "BERT", id: "1810.04805", authors: "Devlin et al." },
  { title: "ResNet", id: "1512.03385", authors: "He et al." },
] as const

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-section text-fg">Upload a research paper</h1>
      <p className="mt-3 text-lead text-fg-2">
        PDF up to 50MB. We&apos;ll extract text, figures, tables, and equations — then an agent will
        draft a poster in 2–5 minutes.
      </p>

      <UploadZoneClient />

      <div className="mt-12">
        <p className="text-caption-uppercase text-muted">Or try one of these</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SAMPLE_PAPERS.map((paper) => (
            <TryArxivButton
              key={paper.id}
              arxivId={paper.id}
              title={paper.title}
              authors={paper.authors}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Downloads from arxiv.org and runs through the same pipeline.
        </p>
      </div>
    </div>
  )
}
