"use client";

import React from "react";
import { ScientificTension } from "@/types/landscape";
import { Scale, HelpCircle, ArrowRightLeft } from "lucide-react";

interface TensionsMatrixProps {
  tensions: ScientificTension[];
}

export const TensionsMatrix: React.FC<TensionsMatrixProps> = ({ tensions }) => {
  if (!tensions || tensions.length === 0) return null;

  return (
    <div className="editorial-card p-5 border border-border-light shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display font-bold text-text-primary flex items-center space-x-2">
          <Scale className="w-4 h-4 text-brand-amber" />
          <span>Scientific Tensions & Trade-offs</span>
        </h3>
        <span className="text-[10px] font-mono font-semibold text-text-muted bg-surface-100 px-2 py-0.5 rounded border border-border-light">
          {tensions.length} Debates
        </span>
      </div>

      <div className="space-y-3">
        {tensions.map((t) => (
          <div
            key={t.id}
            className="editorial-card p-4 bg-surface-50/50 border border-border-light rounded-xl"
          >
            <h4 className="text-xs font-bold text-text-primary mb-2.5 flex items-center space-x-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-brand-amber" />
              <span>{t.topic}</span>
            </h4>

            {/* Approach A vs B Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-blue block mb-1">
                  Approach A
                </span>
                <span className="text-xs font-semibold text-blue-950 leading-snug block">{t.approach_a}</span>
              </div>
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-violet block mb-1">
                  Approach B
                </span>
                <span className="text-xs font-semibold text-purple-950 leading-snug block">{t.approach_b}</span>
              </div>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed mb-2.5 font-normal">
              {t.trade_off_summary}
            </p>

            {/* Open Question */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 flex items-start space-x-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <span className="font-bold text-amber-900">Unanswered Question: </span>
                <span className="text-amber-800 italic">{t.open_question}</span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
