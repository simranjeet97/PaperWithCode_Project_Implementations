"""TinyDB-powered NoSQL document store for task lifecycle management and landscape persistence."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from tinydb import TinyDB, Query, where
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware

from ..config import settings
from ..schemas.landscape import ResearchLandscape
from ..utils.logger import logger


class TaskStore:
    """Manages task documents and landscape documents in TinyDB."""

    def __init__(self, store_path: Optional[str] = None):
        self.store_path = store_path or settings.TASK_STORE_PATH
        self._db = TinyDB(
            self.store_path,
            storage=CachingMiddleware(JSONStorage),
            indent=2
        )
        self.tasks = self._db.table("tasks")
        self.landscapes = self._db.table("landscapes")
        logger.info(f"[TaskStore] TinyDB initialized at: {self.store_path}")

        # Auto-migrate from SQLite if it exists
        self._migrate_from_sqlite()

    # ------------------------------------------------------------------
    # Task Lifecycle CRUD
    # ------------------------------------------------------------------

    def create_task(
        self,
        task_id: str,
        query: str,
        llm_provider: str = "ollama",
        llm_model: str = "qwen2.5:7b",
        max_candidates: int = 25,
        top_papers: int = 10,
    ) -> Dict[str, Any]:
        """Create a new task document in 'queued' state."""
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "task_id": task_id,
            "query": query,
            "status": "queued",
            "progress": 0,
            "current_stage": "QUEUED",
            "created_at": now,
            "started_at": None,
            "completed_at": None,
            "duration_seconds": None,
            "error_message": None,
            "llm_provider": llm_provider,
            "llm_model": llm_model,
            "max_candidates": max_candidates,
            "top_papers": top_papers,
            "papers_retrieved": 0,
            "papers_synthesized": 0,
            "clusters_count": 0,
            "tensions_count": 0,
            "frontiers_count": 0,
            "landscape_id": None,
            "sse_log": [],
        }
        self.tasks.insert(doc)
        logger.info(f"[TaskStore] Created task {task_id} for query '{query}'")
        return doc

    def update_task(self, task_id: str, **fields) -> None:
        """Update arbitrary fields on a task document."""
        Task = Query()
        self.tasks.update(fields, Task.task_id == task_id)

    def mark_running(self, task_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.update_task(task_id, status="running", started_at=now, current_stage="RETRIEVAL")

    def mark_completed(self, task_id: str, landscape_id: str) -> None:
        now = datetime.now(timezone.utc)
        Task = Query()
        docs = self.tasks.search(Task.task_id == task_id)
        started = docs[0].get("started_at") if docs else None
        duration = None
        if started:
            try:
                start_dt = datetime.fromisoformat(started)
                duration = round((now - start_dt).total_seconds(), 2)
            except Exception:
                pass
        self.update_task(
            task_id,
            status="completed",
            progress=100,
            current_stage="COMPLETE",
            completed_at=now.isoformat(),
            duration_seconds=duration,
            landscape_id=landscape_id,
        )

    def mark_failed(self, task_id: str, error_message: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.update_task(
            task_id,
            status="failed",
            current_stage="ERROR",
            completed_at=now,
            error_message=error_message,
        )

    def mark_cancelled(self, task_id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.update_task(
            task_id,
            status="cancelled",
            current_stage="CANCELLED",
            completed_at=now,
        )

    def append_sse_log(self, task_id: str, stage: str, progress: int, message: str) -> None:
        """Append an SSE event to the task's log history."""
        Task = Query()
        docs = self.tasks.search(Task.task_id == task_id)
        if docs:
            log = docs[0].get("sse_log", [])
            log.append({
                "ts": datetime.now(timezone.utc).isoformat(),
                "stage": stage,
                "progress": progress,
                "msg": message,
            })
            self.tasks.update({"sse_log": log}, Task.task_id == task_id)

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        Task = Query()
        docs = self.tasks.search(Task.task_id == task_id)
        return docs[0] if docs else None

    def list_tasks(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        if status:
            Task = Query()
            results = self.tasks.search(Task.status == status)
        else:
            results = self.tasks.all()
        # Sort by created_at descending
        results.sort(key=lambda d: d.get("created_at", ""), reverse=True)
        return results[offset : offset + limit]

    def delete_task(self, task_id: str) -> bool:
        Task = Query()
        removed = self.tasks.remove(Task.task_id == task_id)
        # Also remove associated landscape
        self.landscapes.remove(Query().id == task_id)
        return len(removed) > 0

    def get_stats(self) -> Dict[str, Any]:
        """Return aggregate stats for the dashboard."""
        all_tasks = self.tasks.all()
        completed = [t for t in all_tasks if t.get("status") == "completed"]
        durations = [t["duration_seconds"] for t in completed if t.get("duration_seconds")]
        return {
            "total_tasks": len(all_tasks),
            "completed": len(completed),
            "failed": len([t for t in all_tasks if t.get("status") == "failed"]),
            "cancelled": len([t for t in all_tasks if t.get("status") == "cancelled"]),
            "running": len([t for t in all_tasks if t.get("status") == "running"]),
            "avg_duration_seconds": round(sum(durations) / len(durations), 1) if durations else 0,
            "success_rate_pct": round(len(completed) / len(all_tasks) * 100, 1) if all_tasks else 0,
        }

    # ------------------------------------------------------------------
    # Landscape CRUD (replaces SQLite)
    # ------------------------------------------------------------------

    def save_landscape(self, landscape: ResearchLandscape) -> None:
        L = Query()
        data = json.loads(landscape.model_dump_json())
        data["_normalized_query"] = " ".join(landscape.query.strip().lower().split())
        # Upsert
        if self.landscapes.search(L.id == landscape.id):
            self.landscapes.update(data, L.id == landscape.id)
        else:
            self.landscapes.insert(data)
        logger.info(f"[TaskStore] Saved landscape '{landscape.query}' (ID: {landscape.id})")

    def get_landscape_by_id(self, landscape_id: str) -> Optional[ResearchLandscape]:
        L = Query()
        docs = self.landscapes.search(L.id == landscape_id)
        if docs:
            doc = dict(docs[0])
            doc.pop("_normalized_query", None)
            return ResearchLandscape.model_validate(doc)
        return None

    def get_landscape_by_query(self, query: str) -> Optional[ResearchLandscape]:
        normalized = " ".join(query.strip().lower().split())
        L = Query()
        docs = self.landscapes.search(L._normalized_query == normalized)
        if docs:
            docs.sort(key=lambda d: d.get("generated_at", ""), reverse=True)
            doc = dict(docs[0])
            doc.pop("_normalized_query", None)
            return ResearchLandscape.model_validate(doc)
        return None

    def list_recent_landscapes(self, limit: int = 15) -> List[Dict[str, Any]]:
        all_docs = self.landscapes.all()
        all_docs.sort(key=lambda d: d.get("generated_at", ""), reverse=True)
        return [
            {
                "id": d.get("id"),
                "query": d.get("query"),
                "generated_at": d.get("generated_at"),
                "papers_count": len(d.get("papers", [])),
            }
            for d in all_docs[:limit]
        ]

    # ------------------------------------------------------------------
    # SQLite Migration
    # ------------------------------------------------------------------

    def _migrate_from_sqlite(self) -> None:
        """One-time migration: import existing SQLite landscapes into TinyDB."""
        sqlite_path = settings.DATABASE_PATH
        if not os.path.exists(sqlite_path):
            return
        # Skip if we already have landscapes (migration already done)
        if self.landscapes.all():
            return

        try:
            conn = sqlite3.connect(sqlite_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT landscape_json FROM landscapes")
            rows = cursor.fetchall()
            migrated = 0
            for row in rows:
                try:
                    data = json.loads(row["landscape_json"])
                    landscape = ResearchLandscape.model_validate(data)
                    self.save_landscape(landscape)
                    migrated += 1
                except Exception as e:
                    logger.warning(f"[TaskStore] Migration skip: {e}")
            conn.close()

            if migrated > 0:
                logger.info(f"[TaskStore] Migrated {migrated} landscapes from SQLite to TinyDB.")
                backup_path = sqlite_path + ".bak"
                os.rename(sqlite_path, backup_path)
                logger.info(f"[TaskStore] SQLite renamed to {backup_path}")
        except Exception as e:
            logger.warning(f"[TaskStore] SQLite migration skipped: {e}")

    def flush(self) -> None:
        """Flush the TinyDB cache to disk."""
        self._db.storage.flush()


# Singleton instance
task_store = TaskStore()
