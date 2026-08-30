"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Task, TaskListResponse, TaskStats } from "@/types/task";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Navbar } from "@/components/header/Navbar";
import { Logo } from "@/components/common/Logo";
import { useRouter } from "next/navigation";
import {
  ListChecks, Activity, CheckCircle2, XCircle, Ban, Timer,
  TrendingUp, RefreshCw, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { key: null, label: "All", icon: ListChecks },
  { key: "running", label: "Running", icon: Activity },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "failed", label: "Failed", icon: XCircle },
  { key: "cancelled", label: "Cancelled", icon: Ban },
] as const;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    try {
      const url = statusFilter
        ? `http://localhost:8000/api/tasks?status=${statusFilter}&limit=100`
        : `http://localhost:8000/api/tasks?limit=100`;
      const res = await fetch(url);
      const data: TaskListResponse = await res.json();
      setTasks(data.tasks);
      setStats(data.stats);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
    // Poll every 3s while there are running tasks
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCancel = async (taskId: string) => {
    try {
      await fetch(`http://localhost:8000/api/tasks/${taskId}/cancel`, { method: "POST" });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleRetry = async (taskId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/tasks/${taskId}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.new_task_id) fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`http://localhost:8000/api/tasks/${taskId}`, { method: "DELETE" });
      fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleViewResults = (taskId: string) => {
    // Navigate to homepage with landscape loaded
    router.push(`/?landscape=${taskId}`);
  };

  const runningTasks = tasks.filter((t) => t.status === "running" || t.status === "queued");
  const historyTasks = tasks.filter((t) => t.status !== "running" && t.status !== "queued");

  return (
    <div className="min-h-screen bg-slate-50 dot-grid-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-extrabold text-slate-900 flex items-center gap-2.5">
            <ListChecks className="w-6 h-6 text-blue-600" />
            Task Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor, stop, restart, and replay all research synthesis jobs.
          </p>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total_tasks, icon: ListChecks, color: "text-slate-700" },
              { label: "Running", value: stats.running, icon: Activity, color: "text-blue-600" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Failed", value: stats.failed, icon: XCircle, color: "text-rose-600" },
              { label: "Cancelled", value: stats.cancelled, icon: Ban, color: "text-amber-600" },
              { label: "Avg Time", value: `${Math.round(stats.avg_duration_seconds)}s`, icon: Timer, color: "text-violet-600" },
              { label: "Success", value: `${stats.success_rate_pct}%`, icon: TrendingUp, color: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{s.label}</span>
                </div>
                <span className={cn("text-lg font-display font-extrabold", s.color)}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active Tasks */}
        {runningTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Active Tasks ({runningTasks.length})
            </h2>
            <div className="space-y-3">
              {runningTasks.map((t) => (
                <TaskCard
                  key={t.task_id}
                  task={t}
                  onCancel={handleCancel}
                  onRetry={handleRetry}
                  onDelete={handleDelete}
                  onViewResults={handleViewResults}
                />
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs + Refresh */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition border",
                  statusFilter === f.key
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={fetchTasks} className="p-2 rounded-lg bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Task History */}
        {loading ? (
          <div className="text-center py-16 text-sm text-slate-400 font-mono animate-pulse">
            Loading tasks...
          </div>
        ) : historyTasks.length === 0 && runningTasks.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No tasks yet.</p>
            <p className="text-xs text-slate-400 mt-1">Search a research topic on the homepage to create your first task.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyTasks.map((t) => (
              <TaskCard
                key={t.task_id}
                task={t}
                onCancel={handleCancel}
                onRetry={handleRetry}
                onDelete={handleDelete}
                onViewResults={handleViewResults}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-400">
          <Logo size={22} textSize="sm" />
          <span className="ml-2">Task Manager • Powered by TinyDB NoSQL</span>
        </div>
      </footer>
    </div>
  );
}
