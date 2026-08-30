"use client";

import React from "react";
import { FieldMaturityMetrics } from "@/types/landscape";
import { Gauge, TrendingUp, Sparkles, Clock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldMaturityCardProps {
  metrics?: FieldMaturityMetrics;
  query: string;
}

export const FieldMaturityCard: React.FC<FieldMaturityCardProps> = ({ metrics, query }) => {
  if (!metrics) return null;

  return (
    <div className="clean-card p-6 border border-slate-200 shadow-sm bg-white rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-display font-bold text-slate-900 flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span>Field Saturation, Research Velocity & Horizon Potential</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantitative diagnostic of market maturity, publication momentum, and unharvested research white space
          </p>
        </div>

        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
          {metrics.trl_label}
        </span>
      </div>

      {/* 4 Diagnostic Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        
        {/* 1. Saturation Gauge */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              <span>Saturation Score</span>
              <span className="font-bold text-slate-900">{metrics.saturation_score_pct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  metrics.saturation_score_pct > 75
                    ? "bg-rose-500"
                    : metrics.saturation_score_pct > 50
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
                style={{ width: `${metrics.saturation_score_pct}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-700 leading-tight">
            {metrics.saturation_verdict}
          </span>
        </div>

        {/* 2. Research Velocity Multiplier */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              <span>Publication Velocity</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-display font-extrabold text-blue-700 mb-0.5">
              {metrics.research_velocity_multiplier}x YoY
            </div>
          </div>
          <span className="text-[10px] font-medium text-slate-600">
            High preprint submission volume
          </span>
        </div>

        {/* 3. White-Space Opportunity Index */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              <span>White-Space Index</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-display font-extrabold text-purple-700 mb-0.5">
              {metrics.white_space_opportunity_index} / 10
            </div>
          </div>
          <span className="text-[10px] font-medium text-slate-600">
            High breakthrough potential
          </span>
        </div>

        {/* 4. Estimated Horizon Timeline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1">
              <span>Next Paradigm Shift</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-display font-extrabold text-amber-700 mb-0.5">
              {metrics.time_to_next_breakthrough}
            </div>
          </div>
          <span className="text-[10px] font-medium text-slate-600">
            Estimated time to major disruption
          </span>
        </div>

      </div>

      {/* Sub-area Saturation Breakdown & Catalysts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
        
        {/* Saturation Breakdown */}
        {metrics.saturation_breakdown && Object.keys(metrics.saturation_breakdown).length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Sub-Field Saturation Breakdown:
            </span>
            <div className="space-y-2">
              {Object.entries(metrics.saturation_breakdown).map(([area, status]) => (
                <div key={area} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-800 font-medium">{area}</span>
                  <span className={cn(
                    "font-mono font-semibold px-2 py-0.5 rounded-md text-[9px] border",
                    status.toLowerCase().includes("high") ? "bg-rose-50 text-rose-700 border-rose-200" :
                    status.toLowerCase().includes("moderate") ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Breakthrough Catalysts */}
        {metrics.key_breakthrough_catalysts && metrics.key_breakthrough_catalysts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Key Catalysts Required for Next Leap:
            </span>
            <div className="space-y-1.5">
              {metrics.key_breakthrough_catalysts.map((cat, i) => (
                <div key={i} className="flex items-start space-x-2 text-[11px] text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{cat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
