import json
import uuid
import time
from typing import List, Optional, Dict, Any
from app.core.models import WALRecord, StateSnapshot, StepStatus, ActionType

class WriteAheadLog:
    def __init__(self, tx_id: str):
        self.tx_id = tx_id
        self.records: List[WALRecord] = []
        self.snapshots: Dict[int, StateSnapshot] = {} # keyed by step_index (0 = initial)
        self.created_at = time.time()

    def append_record(
        self,
        step_index: int,
        step_name: str,
        action_type: ActionType,
        inputs: Dict[str, Any],
        pre_state_snapshot: Dict[str, Any],
        confidence_score: float = 1.0,
        divergence_score: float = 0.0,
    ) -> WALRecord:
        record = WALRecord(
            record_id=f"wal_{uuid.uuid4().hex[:8]}",
            tx_id=self.tx_id,
            step_index=step_index,
            step_name=step_name,
            action_type=action_type,
            inputs=inputs,
            pre_state_snapshot=pre_state_snapshot,
            confidence_score=confidence_score,
            divergence_score=divergence_score,
            status=StepStatus.RUNNING,
            timestamp=time.time()
        )
        self.records.append(record)
        return record

    def save_snapshot(self, step_index: int, snapshot: StateSnapshot):
        self.snapshots[step_index] = snapshot

    def get_snapshot(self, step_index: int) -> Optional[StateSnapshot]:
        return self.snapshots.get(step_index)

    def get_all_snapshots(self) -> List[StateSnapshot]:
        return [self.snapshots[k] for k in sorted(self.snapshots.keys())]

    def update_record_success(
        self,
        record_id: str,
        outputs: Dict[str, Any],
        post_state_snapshot: Dict[str, Any],
        compensation_action: Optional[Any] = None
    ):
        for rec in self.records:
            if rec.record_id == record_id:
                rec.outputs = outputs
                rec.post_state_snapshot = post_state_snapshot
                rec.status = StepStatus.COMMITTED
                rec.compensation = compensation_action
                break

    def update_record_failure(self, record_id: str, error_message: str):
        for rec in self.records:
            if rec.record_id == record_id:
                rec.status = StepStatus.FAILED
                rec.error_message = error_message
                break

    def get_compensable_records(self) -> List[WALRecord]:
        """Returns committed records with compensation actions in reverse chronological order (LIFO)."""
        committed = [r for r in self.records if r.status in (StepStatus.COMMITTED, StepStatus.RUNNING) and r.compensation is not None]
        return list(reversed(committed))

    def export_summary(self) -> Dict[str, Any]:
        return {
            "tx_id": self.tx_id,
            "record_count": len(self.records),
            "snapshots_count": len(self.snapshots),
            "records": [r.model_dump() for r in self.records],
            "timeline": [s.model_dump() for s in self.get_all_snapshots()]
        }
