"use client";

import React, { useState } from "react";
import { ClusterTaxonomy, ExtractedPaperDossier } from "@/types/landscape";
import { Layers, ChevronRight, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxonomyClustersProps {
  clusters: ClusterTaxonomy[];
  papers?: ExtractedPaperDossier[];
  activeCluster: string | null;
  onClusterClick: (clusterName: string | null) => void;
  onPaperClick?: (paperId: string) => void;
}

export const TaxonomyClusters: React.FC<TaxonomyClustersProps> = ({
  clusters,
  papers = [],
  activeCluster,
  onClusterClick,
  onPaperClick,
}) => {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  if (!clusters || clusters.length === 0) return null;

  return (
    <div className="clean-card p-6 border border-slate-200 shadow-sm bg-white rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Research Taxonomy & Schools of Thought</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Methodological families and architectural sub-paradigms
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          {clusters.length} Clusters
        </span>
      </div>

      <div className="space-y-3">
        {clusters.map((c) => {
          const isActive = activeCluster === c.name;
          const isExpanded = expandedCluster === c.id;
          const color = c.color || "#2563EB";

          // Match papers in this cluster
          const matchingPapers = papers.filter(
            (p) =>
              c.paper_ids.includes(p.id) ||
              p.cluster_category?.toLowerCase() === c.name?.toLowerCase()
          );
          const paperCount = Math.max(c.paper_ids.length, matchingPapers.length);

          return (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border transition-all text-xs overflow-hidden",
                isActive
                  ? "border-blue-500 bg-blue-50/40 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div
                onClick={() => {
                  onClusterClick(isActive ? null : c.name);
                  setExpandedCluster(isExpanded ? null : c.id);
                }}
                className="p-3.5 cursor-pointer select-none"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: color }}
                    />
                    <h4 className="font-bold text-slate-900">{c.name}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {paperCount} papers
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                  {c.description}
                </p>

                {c.key_characteristics && c.key_characteristics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-5 mt-2.5">
                    {c.key_characteristics.map((char, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded Paper List */}
              {isExpanded && matchingPapers.length > 0 && (
                <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-1.5 animate-in fade-in duration-200">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Papers in this School ({matchingPapers.length}):
                  </span>
                  {matchingPapers.map((p) => (
                    <div
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPaperClick) onPaperClick(p.id);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition text-[11px]"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{p.title}</span>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">({p.published_year})</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-blue-600 shrink-0">
                        {p.citation_count} cites
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
