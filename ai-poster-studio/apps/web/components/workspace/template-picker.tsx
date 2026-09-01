"use client"

import { useState } from "react"
import { POSTER_TEMPLATES } from "@/lib/agents/templates"

export function TemplatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="mt-6">
      <p className="text-caption-uppercase text-muted">Choose a template</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POSTER_TEMPLATES.map((t) => {
          const selected = t.id === value
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`group rounded-lg border p-4 text-left transition-colors ${
                selected
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:border-accent"
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-fg">{t.name}</p>
                {t.popular && (
                  <span className="rounded-pill bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {t.pageSize.width}×{t.pageSize.height}px · {t.aspectRatio}
              </p>
              <p className="mt-2 text-xs text-fg-2">{t.description}</p>
              <div className="mt-3 flex h-12 items-center justify-center rounded-md border border-ws-hairline bg-ws-panel-2">
                <TemplatePreview layout={t.layout} accent={selected ? "#4f46e5" : "#9ca3af"} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TemplatePreview({ layout, accent }: { layout: string; accent: string }) {
  // Mini wireframe preview of each layout
  if (layout === "2col") {
    return (
      <div className="flex h-10 w-full gap-1">
        <div className="flex-1 space-y-0.5">
          <div className="h-1 w-full rounded" style={{ backgroundColor: accent }} />
          <div className="h-1 w-3/4 rounded bg-fg/10" />
          <div className="h-1 w-full rounded bg-fg/10" />
          <div className="h-1 w-5/6 rounded bg-fg/10" />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="h-3 w-full rounded" style={{ backgroundColor: accent, opacity: 0.4 }} />
          <div className="h-1 w-full rounded bg-fg/10" />
          <div className="h-1 w-2/3 rounded bg-fg/10" />
        </div>
      </div>
    )
  }
  if (layout === "landscape-flow") {
    return (
      <div className="flex h-10 w-full gap-1">
        <div className="flex-1 space-y-0.5">
          <div className="h-1 w-full rounded bg-fg/10" />
          <div className="h-1 w-3/4 rounded bg-fg/10" />
        </div>
        <div className="flex-1">
          <div className="h-full w-full rounded" style={{ backgroundColor: accent, opacity: 0.5 }} />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="h-1 w-full rounded bg-fg/10" />
          <div className="h-1 w-2/3 rounded bg-fg/10" />
        </div>
      </div>
    )
  }
  if (layout === "stack") {
    return (
      <div className="flex h-10 w-full flex-col gap-0.5">
        <div className="h-1 w-full rounded" style={{ backgroundColor: accent }} />
        <div className="h-1 w-full rounded bg-fg/10" />
        <div className="h-1 w-5/6 rounded bg-fg/10" />
        <div className="h-1 w-full rounded bg-fg/10" />
      </div>
    )
  }
  // neurips + nature
  return (
    <div className="flex h-10 w-full flex-col gap-0.5">
      <div className="h-2 w-full rounded" style={{ backgroundColor: accent }} />
      <div className="h-1 w-full rounded bg-fg/10" />
      <div className="h-1 w-4/5 rounded bg-fg/10" />
    </div>
  )
}