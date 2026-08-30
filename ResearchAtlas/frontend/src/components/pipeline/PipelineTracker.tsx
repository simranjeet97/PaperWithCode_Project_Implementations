"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, AlertCircle, Terminal, Radio, Square, ListChecks } from "lucide-react";
import Link from "next/link";

interface PipelineTrackerProps {
  stage: string;
  progress: number;
  message: string;
  logs: { stage: string; message: string; timestamp: string }[];
  isStreaming: boolean;
  taskId?: string | null;
  onCancel?: (taskId: string) => void;
}

const STAGES = [
  { key: "RETRIEVAL", label: "arXiv Retrieval", desc: "Multi-query expansion & citations", icon: "📡" },
  { key: "RERANKING", label: "Cross-Encoder", desc: "Deep token-interaction scoring", icon: "🎯" },
  { key: "EXTRACTION", label: "Paper Dossiers", desc: "Parallel structured extraction", icon: "🔬" },
  { key: "SYNTHESIS", label: "Landscape Synthesis", desc: "Taxonomies, DAG & Reading Map", icon: "🗺️" },
];

function stageIndex(stage: string): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : -1;
}

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  stage,
  progress,
  message,
  logs,
  isStreaming,
  taskId,
  onCancel,
}) => {
  const activeIdx = stageIndex(stage);
  const isComplete = stage === "COMPLETE";
  const isError = stage === "ERROR";
  const isCancelled = stage === "CANCELLED";

  return (
    <div className="editorial-card p-5 border border-border-light shadow-sm bg-white rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            isStreaming ? "bg-blue-600 animate-ping" : isComplete ? "bg-emerald-500" : isError || isCancelled ? "bg-rose-500" : "bg-slate-300"
          )} />
          <h3 className="text-sm font-display font-bold text-slate-900 flex items-center space-x-2">
            <span>Autonomous Pipeline Telemetry</span>
          </h3>
          {isStreaming && (
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Live Streaming</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isStreaming && taskId && onCancel && (
            <button
              onClick={() => onCancel(taskId)}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center space-x-1 transition"
              title="Stop current task"
            >
              <Square className="w-3 h-3" />
              <span>Stop Task</span>
            </button>
          )}

          <Link
            href="/tasks"
            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center space-x-1 transition"
          >
            <ListChecks className="w-3 h-3 text-blue-600" />
            <span>Task Manager</span>
          </Link>

          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full mb-5 overflow-hidden p-0.5 border border-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isError || isCancelled ? "bg-rose-500" : "bg-gradient-to-r from-blue-600 to-emerald-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {STAGES.map((s, idx) => {
          const isDone = isComplete || activeIdx > idx;
          const isCurrent = activeIdx === idx && isStreaming;
          return (
            <div
              key={s.key}
              className={cn(
                "p-3 rounded-xl border transition-all text-xs flex flex-col justify-between",
                isDone
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : isCurrent
                  ? "bg-blue-50/80 border-blue-300 text-blue-950 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-xl">{s.icon}</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isCurrent && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
              </div>
              <div>
                <span className="font-semibold block leading-tight text-slate-900">{s.label}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">{s.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Log Terminal */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-1.5 shadow-inner custom-scrollbar">
        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1 mb-1 text-[10px]">
          <div className="flex items-center space-x-1.5">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold">REALTIME SSE STREAM LOG</span>
          </div>
          {taskId && <span className="text-slate-500 text-[9px]">ID: {taskId}</span>}
        </div>
        {logs.length === 0 && (
          <span className="text-slate-500 italic">Awaiting pipeline execution...</span>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex items-start space-x-2">
            <span className="text-slate-500 shrink-0 text-[10px]">{log.timestamp}</span>
            <span className={cn(
              "shrink-0 font-semibold px-1.5 py-0.2 rounded text-[9px] border",
              log.stage === "COMPLETE" ? "bg-emerald-950 border-emerald-800 text-emerald-300" :
              log.stage === "ERROR" || log.stage === "CANCELLED" ? "bg-rose-950 border-rose-800 text-rose-300" :
              "bg-blue-950 border-blue-800 text-blue-300"
            )}>
              {log.stage}
            </span>
            <span className="text-slate-200 leading-snug">{log.message}</span>
          </div>
        ))}
      </div>

      {/* Current status message bar */}
      {message && (
        <div className={cn(
          "mt-3 text-xs px-3.5 py-2 rounded-xl flex items-center space-x-2 font-medium",
          isError || isCancelled ? "bg-rose-50 border border-rose-200 text-rose-700" : "bg-blue-50 border border-blue-200 text-blue-800"
        )}>
          {isError || isCancelled ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          )}
          <span className="truncate">{message}</span>
        </div>
      )}
    </div>
  );
};
