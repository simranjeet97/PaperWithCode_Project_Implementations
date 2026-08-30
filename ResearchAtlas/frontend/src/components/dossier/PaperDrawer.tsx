"use client";

import React, { useState } from "react";
import { ExtractedPaperDossier } from "@/types/landscape";
import { formatAuthors, getScoreBadgeColor, cn } from "@/lib/utils";
import {
  X,
  ExternalLink,
  FileCode2,
  BookOpen,
  Copy,
  Check,
  Layers,
  Sparkles,
  AlertTriangle,
  Target,
  Cpu,
  Trophy,
} from "lucide-react";

interface PaperDrawerProps {
  paper: ExtractedPaperDossier | null;
  onClose: () => void;
}

export const PaperDrawer: React.FC<PaperDrawerProps> = ({ paper, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!paper) return null;

  const copyBibtex = () => {
    const firstAuthor = (paper.authors[0] || "author").split(" ").pop()?.toLowerCase() || "author";
    const firstWord = paper.title.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    const key = `${firstAuthor}${paper.published_year}${firstWord}`;
    const bib = `@article{${key},\n  title = {${paper.title}},\n  author = {${paper.authors.join(" and ")}},\n  journal = {arXiv preprint arXiv:${paper.id}},\n  year = {${paper.published_year}},\n  url = {${paper.arxiv_url}}\n}`;
    navigator.clipboard.writeText(bib);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xl bg-white border-l border-border-light overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-border-light p-5 flex items-start justify-between z-10">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md bg-blue-50 text-brand-blue border border-blue-200">
                {paper.primary_category}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-surface-100 text-text-secondary border border-border-light">
                Year {paper.published_year}
              </span>
            </div>
            <h2 className="text-base font-display font-bold text-text-primary leading-snug">
              {paper.title}
            </h2>
            <p className="text-xs text-text-muted mt-1 font-medium">{formatAuthors(paper.authors)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 text-text-muted hover:text-text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-medium text-emerald-800 block">Cross-Encoder</span>
              <span className="text-sm font-mono font-bold text-emerald-900">{(paper.cross_encoder_score * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-medium text-amber-800 block">Citations</span>
              <span className="text-sm font-mono font-bold text-amber-900">{paper.citation_count}</span>
            </div>
            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-medium text-purple-800 block">School</span>
              <span className="text-xs font-semibold text-purple-950 truncate block mt-0.5">{paper.cluster_category}</span>
            </div>
          </div>

          {/* Structured Intelligence Sections */}
          <Section icon={<Target className="w-4 h-4 text-rose-600" />} title="Core Bottleneck & Problem" bg="bg-rose-50/40 border-rose-200">
            {paper.problem_statement}
          </Section>

          <Section icon={<Cpu className="w-4 h-4 text-brand-blue" />} title="Proposed Mechanism & Architecture" bg="bg-blue-50/40 border-blue-200">
            {paper.proposed_method}
          </Section>

          <Section icon={<Trophy className="w-4 h-4 text-emerald-600" />} title="Empirical Benchmarks & Results" bg="bg-emerald-50/40 border-emerald-200">
            {paper.key_results}
          </Section>

          <Section icon={<Sparkles className="w-4 h-4 text-amber-600" />} title="Long-Term Paradigm Contribution" bg="bg-amber-50/40 border-amber-200">
            {paper.main_contribution}
          </Section>

          {paper.limitations && (
            <Section icon={<AlertTriangle className="w-4 h-4 text-orange-600" />} title="Known Constraints & Limitations" bg="bg-orange-50/40 border-orange-200">
              {paper.limitations}
            </Section>
          )}

          {paper.influences && paper.influences.length > 0 && (
            <div className="editorial-card p-3.5 bg-surface-50 border border-border-light rounded-xl">
              <h4 className="text-xs font-bold text-text-primary mb-2 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-violet" />
                <span>Foundational Precursors</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {paper.influences.map((inf, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 bg-white border border-purple-200 text-brand-violet font-medium rounded-lg shadow-2xs">
                    {inf}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Hub */}
          <div className="flex items-center space-x-2 pt-2">
            <a
              href={paper.arxiv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-xl bg-brand-blue text-white hover:bg-blue-700 transition shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View arXiv</span>
            </a>
            {paper.pdf_url && (
              <a
                href={paper.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-xl bg-surface-100 border border-border-light text-text-primary hover:bg-surface-200 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Read PDF</span>
              </a>
            )}
            {paper.code_url && (
              <a
                href={paper.code_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-surface-100 border border-border-light text-text-primary hover:bg-surface-200 transition"
              >
                <FileCode2 className="w-3.5 h-3.5 text-brand-violet" />
                <span>Code</span>
              </a>
            )}
            <button
              onClick={copyBibtex}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-surface-100 border border-border-light text-text-primary hover:bg-surface-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-brand-emerald" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
              <span>{copied ? "Copied" : "BibTeX"}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

function Section({ icon, title, children, bg }: { icon: React.ReactNode; title: string; children: React.ReactNode; bg: string }) {
  return (
    <div className={cn("p-3.5 rounded-xl border", bg)}>
      <h4 className="text-xs font-bold text-text-primary mb-1 flex items-center space-x-1.5">
        {icon}
        <span>{title}</span>
      </h4>
      <p className="text-xs text-text-secondary leading-relaxed font-normal">{children}</p>
    </div>
  );
}
