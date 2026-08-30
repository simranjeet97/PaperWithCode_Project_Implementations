"use client";

import React, { useState } from "react";
import { OpenFrontier } from "@/types/landscape";
import { Compass, AlertCircle, HelpCircle, XCircle, Lightbulb, ChevronDown, ChevronUp, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenProblemsProps {
  frontiers: OpenFrontier[];
}

const severityClasses: Record<string, { card: string; badge: string }> = {
  Critical: {
    card: "border-rose-200/90 bg-rose-50/30",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
  },
  High: {
    card: "border-amber-200/90 bg-amber-50/30",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
  },
  Medium: {
    card: "border-blue-200/90 bg-blue-50/30",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
  },
};

export const OpenProblems: React.FC<OpenProblemsProps> = ({ frontiers }) => {
  const [expandedId, setExpandedId] = useState<string | null>(frontiers?.[0]?.id || null);

  if (!frontiers || frontiers.length === 0) return null;

  return (
    <div className="clean-card p-6 border border-slate-200 shadow-sm bg-white rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-900 flex items-center space-x-2">
            <Compass className="w-4 h-4 text-rose-600" />
            <span>Unsolved Research Frontiers & Gaps</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Root cause bottlenecks, why existing SOTA fails, and concrete failure benchmarks
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          {frontiers.length} Frontiers
        </span>
      </div>

      <div className="space-y-4">
        {frontiers.map((f) => {
          const isExpanded = expandedId === f.id;
          const style = severityClasses[f.severity_or_importance] || severityClasses.High;

          return (
            <div
              key={f.id}
              className={cn(
                "p-5 rounded-2xl border transition-all shadow-xs bg-white",
                style.card
              )}
            >
              {/* Header Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : f.id)}
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {f.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                      {f.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={cn(
                      "text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                      style.badge
                    )}
                  >
                    {f.severity_or_importance}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Detailed Breakdown Sections */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200 text-xs">
                  
                  {/* 1. Why the Problem Exists */}
                  {f.why_problem_exists && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-800 mb-1">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>Why This Problem Exists (Root Algorithmic Cause)</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-normal pl-5">
                        {f.why_problem_exists}
                      </p>
                    </div>
                  )}

                  {/* 2. Why Existing Methods Fail */}
                  {f.why_existing_methods_fail && (
                    <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-3.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-rose-900 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Why Existing / Related Methods Fail to Solve It</span>
                      </div>
                      <p className="text-rose-800 leading-relaxed font-normal pl-5">
                        {f.why_existing_methods_fail}
                      </p>
                    </div>
                  )}

                  {/* 3. Concrete Failure Scenario & Benchmark Example */}
                  {f.concrete_failure_example && (
                    <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-900 mb-1">
                        <FileCode className="w-3.5 h-3.5 text-amber-600" />
                        <span>Concrete Benchmark Discrepancy & Failure Scenario</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed font-normal pl-5">
                        {f.concrete_failure_example}
                      </p>
                    </div>
                  )}

                  {/* 4. Promising Emerging Directions */}
                  {f.promising_directions && (
                    <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-900 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Promising Emerging Hypotheses & Solution Vectors</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed font-normal pl-5">
                        {f.promising_directions}
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
