"use client";

import React, { useState } from "react";
import { ReadingRoadmapItem } from "@/types/landscape";
import { BookOpen, Clock, Lightbulb, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadingRoadmapProps {
  items: ReadingRoadmapItem[];
  onPaperClick: (paperId: string) => void;
}

const difficultyClasses: Record<string, { badge: string; dot: string }> = {
  Foundational: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Intermediate: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  Advanced: {
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  Frontier: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
};

export const ReadingRoadmap: React.FC<ReadingRoadmapProps> = ({ items, onPaperClick }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  if (!items || items.length === 0) return null;

  return (
    <div className="clean-card p-6 border border-slate-200 shadow-sm bg-white rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Curated Pedagogical Reading Roadmap</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step curriculum ordered by prerequisite dependency & conceptual complexity
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          {items.length} Sequential Steps
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {items.map((item) => {
          const style = difficultyClasses[item.difficulty] || difficultyClasses.Intermediate;
          const isExpanded = expandedStep === item.step;

          return (
            <div key={item.step} className="relative">
              {/* Step indicator circle */}
              <div className="absolute -left-6 top-2 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-700 shadow-xs z-10">
                {item.step}
              </div>

              <div
                className={cn(
                  "p-4 rounded-xl border transition-all text-xs bg-white",
                  isExpanded ? "border-emerald-300 shadow-xs" : "border-slate-200 hover:border-slate-300"
                )}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedStep(isExpanded ? null : item.step)}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={cn(
                          "text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          style.badge
                        )}
                      >
                        {item.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>~{item.estimated_read_time_mins} min</span>
                      </span>
                    </div>

                    <h4
                      onClick={(e) => {
                        e.stopPropagation();
                        onPaperClick(item.paper_id);
                      }}
                      className="font-bold text-slate-900 hover:text-blue-600 transition leading-snug cursor-pointer flex items-center space-x-1"
                    >
                      <span>{item.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-60 inline shrink-0" />
                    </h4>
                  </div>

                  <button className="text-slate-400 p-1 shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-200 text-xs">
                    
                    {/* Recommended Focus */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Recommended Reading Focus:
                      </span>
                      <p className="text-slate-700 leading-relaxed font-normal">
                        {item.recommended_focus}
                      </p>
                    </div>

                    {/* Key Takeaway */}
                    {item.key_takeaway && (
                      <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-lg p-2.5">
                        <div className="flex items-center space-x-1 text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider mb-1">
                          <Lightbulb className="w-3 h-3 text-emerald-600" />
                          <span>Pivotal Takeaway / Mathematical Intuition:</span>
                        </div>
                        <p className="text-emerald-900 leading-relaxed font-normal">
                          {item.key_takeaway}
                        </p>
                      </div>
                    )}

                    {/* Action */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => onPaperClick(item.paper_id)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <span>Open Structured Paper Dossier</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
