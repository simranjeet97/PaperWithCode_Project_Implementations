"use client";

import React from "react";
import { Download, FileText, BookMarked, FileJson, FileCode2, ArrowUpRight } from "lucide-react";
import { getExportUrl } from "@/lib/api";

interface ExportPanelProps {
  landscapeId: string;
  query: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ landscapeId, query }) => {
  const formats = [
    { key: "markdown", label: "Markdown Atlas", icon: FileText, desc: "Structured report with tables", color: "text-brand-blue bg-blue-50 border-blue-200" },
    { key: "obsidian", label: "Obsidian Vault", icon: BookMarked, desc: "With [[wikilinks]] for PKM", color: "text-brand-violet bg-purple-50 border-purple-200" },
    { key: "bibtex", label: "BibTeX Citations", icon: FileCode2, desc: "All papers in .bib bibliography", color: "text-brand-emerald bg-emerald-50 border-emerald-200" },
    { key: "json", label: "Raw JSON Data", icon: FileJson, desc: "Complete nodes, edges & dossiers", color: "text-brand-amber bg-amber-50 border-amber-200" },
  ];

  return (
    <div className="editorial-card p-5 border border-border-light shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-bold text-text-primary flex items-center space-x-2">
          <Download className="w-4 h-4 text-brand-blue" />
          <span>Export & Citation Hub</span>
        </h3>
        <span className="text-[10px] font-mono text-text-muted">1-Click Downloads</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {formats.map((f) => {
          const Icon = f.icon;
          return (
            <a
              key={f.key}
              href={getExportUrl(landscapeId, f.key)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-border-light hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${f.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-primary group-hover:text-brand-blue transition block">
                    {f.label}
                  </span>
                  <span className="text-[10px] text-text-muted block leading-tight">{f.desc}</span>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-subtle group-hover:text-brand-blue transition shrink-0 ml-2" />
            </a>
          );
        })}
      </div>
    </div>
  );
};
