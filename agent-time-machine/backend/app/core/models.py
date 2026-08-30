from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import time

class TxStatus(str, Enum):
    INITIALIZED = "INITIALIZED"
    RUNNING = "RUNNING"
    COMMITTED = "COMMITTED"
    FAILED = "FAILED"
    COMPENSATING = "COMPENSATING"
    ROLLED_BACK = "ROLLED_BACK"

class StepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMMITTED = "COMMITTED"
    FAILED = "FAILED"
    COMPENSATING = "COMPENSATING"
    COMPENSATED = "COMPENSATED"

class ActionType(str, Enum):
    READ = "READ"
    DB_MUTATION = "DB_MUTATION"
    API_CALL = "API_CALL"
    FILE_MUTATION = "FILE_MUTATION"
    REASONING = "REASONING"
    CONSISTENCY_GATE = "CONSISTENCY_GATE"

class InvariantResult(BaseModel):
    passed: bool
    name: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

class CompensationRecord(BaseModel):
    action_name: str
    inverse_fn_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    executed: bool = False
    execution_result: Optional[str] = None
    timestamp: Optional[float] = None

class WALRecord(BaseModel):
    record_id: str
    tx_id: str
    step_index: int
    step_name: str
    action_type: ActionType
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    pre_state_snapshot: Dict[str, Any] = Field(default_factory=dict)
    post_state_snapshot: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = 1.0  # P_LLM confidence
    divergence_score: float = 0.0  # Evidence confidence divergence
    status: StepStatus = StepStatus.PENDING
    error_message: Optional[str] = None
    compensation: Optional[CompensationRecord] = None
    llm_trace: Optional[Dict[str, Any]] = None
    timestamp: float = Field(default_factory=time.time)

class StateSnapshot(BaseModel):
    step_index: int
    step_name: str
    timestamp: float
    description: str
    database_state: Dict[str, Any]
    external_api_calls: List[Dict[str, Any]]
    workspace_files: Dict[str, str]
    agent_memory_nodes: List[Dict[str, Any]]
    summary_metrics: Dict[str, Any] = Field(default_factory=dict)
    llm_trace: Optional[Dict[str, Any]] = None

class TransactionEvent(BaseModel):
    event_id: str
    tx_id: str
    event_type: str  # e.g., "STEP_STARTED", "STEP_COMMITTED", "STEP_FAILED", "COMPENSATING", "TX_ROLLED_BACK", "TX_COMMITTED"
    step_index: Optional[int] = None
    step_name: Optional[str] = None
    message: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)
