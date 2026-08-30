"use client";

import React, { useState, useEffect } from "react";
import { Task, TaskStatus } from "@/types/task";
import { cn } from "@/lib/utils";
import { Square, RotateCcw, Trash2, ChevronDown, ChevronUp, Clock, FileText, GitBranch, Zap, AlertTriangle } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onCancel: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onViewResults: (taskId: string) => void;
}

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string; borderColor: string; dot: string }> = {
  queued: { label: "Queued", color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200", dot: "bg-slate-400" },
  running: { label: "Running", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200", dot: "bg-blue-500 animate-pulse" },
  completed: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", dot: "bg-emerald-500" },
  failed: { label: "Failed", color: "text-rose-700", bgColor: "bg-rose-50", borderColor: "border-rose-200", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", dot: "bg-amber-500" },
};

const stageLabels: Record<string, string> = {
  QUEUED: "Waiting...",
  RETRIEVAL: "arXiv Retrieval",
  RERANKING: "Cross-Encoder Scoring",
  EXTRACTION: "Paper Extraction",
  SYNTHESIS: "Landscape Synthesis",
  COMPLETE: "Done",
  CANCELLED: "Cancelled",
  ERROR: "Error",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onCancel, onRetry, onDelete, onViewResults }) => {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const cfg = statusConfig[task.status] || statusConfig.queued;

  // Live elapsed timer for running tasks
  useEffect(() => {
    if (task.status !== "running" || !task.started_at) return;
    const start = new Date(task.started_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [task.status, task.started_at]);

  return (
    <div className={cn("rounded-2xl border p-4 transition-all shadow-xs bg-white", cfg.borderColor)}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", cfg.dot)} />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">{task.query}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn("text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", cfg.bgColor, cfg.color, cfg.borderColor)}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{stageLabels[task.current_stage] || task.current_stage}</span>
              {task.status === "running" && (
                <span className="text-[10px] text-blue-600 font-mono font-bold">{elapsed}s</span>
              )}
              {task.duration_seconds && task.status !== "running" && (
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {formatDuration(task.duration_seconds)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === "running" && (
            <button onClick={() => onCancel(task.task_id)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition border border-rose-200" title="Stop">
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
          {(task.status === "failed" || task.status === "cancelled") && (
            <button onClick={() => onRetry(task.task_id)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition border border-blue-200" title="Retry">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {task.status === "completed" && (
            <>
              <button onClick={() => onViewResults(task.task_id)} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200 text-[10px] font-bold">
                View Results
              </button>
              <button onClick={() => onRetry(task.task_id)} className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition border border-slate-200" title="Re-run Search">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={() => onDelete(task.task_id)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition border border-slate-200" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 transition border border-slate-200">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress bar for running */}
      {task.status === "running" && (
        <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${task.progress}%` }} />
        </div>
      )}

      {/* Quick stats row */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" /> {task.papers_retrieved} papers</span>
        <span className="flex items-center gap-0.5"><GitBranch className="w-3 h-3" /> {task.clusters_count} clusters</span>
        <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" /> {task.tensions_count} tensions</span>
        <span className="flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> {task.frontiers_count} frontiers</span>
        <span className="ml-auto">{formatDate(task.created_at)}</span>
      </div>

      {/* Error message */}
      {task.error_message && (
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-mono">
          ❌ {task.error_message}
        </div>
      )}

      {/* Expanded SSE Log */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-[10px] font-bold text-slate-600 mb-2 flex items-center gap-1">
            <span>📋 Agent Execution Log</span>
            <span className="text-slate-400 font-normal">({task.sse_log?.length || task.sse_log_count || 0} events)</span>
          </div>
          <SSELogViewer taskId={task.task_id} initialLog={task.sse_log} />
        </div>
      )}
    </div>
  );
};


// SSE Log Viewer (loads full log on demand)
const SSELogViewer: React.FC<{ taskId: string; initialLog?: Array<{ ts: string; stage: string; progress: number; msg: string }> }> = ({ taskId, initialLog }) => {
  const [log, setLog] = useState(initialLog || []);
  const [loading, setLoading] = useState(!initialLog);

  useEffect(() => {
    if (initialLog) return;
    const fetchLog = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/tasks/${taskId}`);
        const data = await res.json();
        setLog(data.sse_log || []);
      } catch { setLog([]); }
      setLoading(false);
    };
    fetchLog();
  }, [taskId, initialLog]);

  if (loading) return <div className="text-[10px] text-slate-400 font-mono animate-pulse">Loading log...</div>;
  if (!log.length) return <div className="text-[10px] text-slate-400 font-mono">No log entries.</div>;

  return (
    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
      {log.map((entry, i) => (
        <div key={i} className="flex items-start gap-2 text-[10px] font-mono leading-relaxed">
          <span className="text-slate-300 shrink-0 w-12 text-right tabular-nums">
            {entry.progress}%
          </span>
          <span className={cn(
            "shrink-0 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
            entry.stage === "COMPLETE" ? "bg-emerald-100 text-emerald-700" :
            entry.stage === "ERROR" ? "bg-rose-100 text-rose-700" :
            "bg-slate-100 text-slate-600"
          )}>
            {entry.stage.slice(0, 4)}
          </span>
          <span className="text-slate-700 break-all">{entry.msg}</span>
        </div>
      ))}
    </div>
  );
};
