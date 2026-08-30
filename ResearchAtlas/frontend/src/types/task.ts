export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface TaskSSELogEntry {
  ts: string;
  stage: string;
  progress: number;
  msg: string;
}

export interface Task {
  task_id: string;
  query: string;
  status: TaskStatus;
  progress: number;
  current_stage: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  llm_provider: string;
  llm_model: string;
  max_candidates: number;
  top_papers: number;
  papers_retrieved: number;
  papers_synthesized: number;
  clusters_count: number;
  tensions_count: number;
  frontiers_count: number;
  landscape_id: string | null;
  sse_log?: TaskSSELogEntry[];
  sse_log_count?: number;
}

export interface TaskStats {
  total_tasks: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  avg_duration_seconds: number;
  success_rate_pct: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  stats: TaskStats;
}
