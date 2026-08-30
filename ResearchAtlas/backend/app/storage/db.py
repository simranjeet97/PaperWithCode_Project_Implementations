"""Database storage wrapper delegating to TinyDB NoSQL task_store for backward compatibility."""

from typing import Optional, List, Dict, Any
from .task_store import task_store
from ..schemas.landscape import ResearchLandscape


class Database:
    """Backward compatibility wrapper delegating to task_store (TinyDB)."""

    def save_landscape(self, landscape: ResearchLandscape) -> None:
        task_store.save_landscape(landscape)

    def get_landscape_by_id(self, landscape_id: str) -> Optional[ResearchLandscape]:
        return task_store.get_landscape_by_id(landscape_id)

    def get_landscape_by_query(self, query: str) -> Optional[ResearchLandscape]:
        return task_store.get_landscape_by_query(query)

    def list_recent_landscapes(self, limit: int = 15) -> List[Dict[str, Any]]:
        return task_store.list_recent_landscapes(limit=limit)


db = Database()
