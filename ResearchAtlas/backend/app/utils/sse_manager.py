import asyncio
import json
from typing import Dict, List, Any
from .logger import logger


class SSEManager:
    """Manages active Server-Sent Events (SSE) streaming connections per task/landscape ID."""

    def __init__(self):
        self._queues: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, task_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        if task_id not in self._queues:
            self._queues[task_id] = []
        self._queues[task_id].append(queue)
        logger.info(f"[SSE] Subscriber connected for task: {task_id} (total listeners: {len(self._queues[task_id])})")
        return queue

    def unsubscribe(self, task_id: str, queue: asyncio.Queue):
        if task_id in self._queues:
            if queue in self._queues[task_id]:
                self._queues[task_id].remove(queue)
            if not self._queues[task_id]:
                del self._queues[task_id]
        logger.info(f"[SSE] Subscriber removed for task: {task_id}")

    async def broadcast(self, task_id: str, stage: str, progress: int, message: str, payload: Any = None):
        """Broadcast a pipeline status update to all connected subscribers."""
        event_data = {
            "task_id": task_id,
            "stage": stage,
            "progress": progress,
            "message": message,
            "payload": payload
        }
        json_str = json.dumps(event_data)
        if task_id in self._queues:
            for q in list(self._queues[task_id]):
                await q.put(json_str)
        logger.info(f"[PIPELINE][{task_id}] [{progress}%] {stage}: {message}")


sse_manager = SSEManager()
