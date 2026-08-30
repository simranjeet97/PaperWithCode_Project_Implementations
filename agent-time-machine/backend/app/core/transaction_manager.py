import copy
import json
import time
import uuid
import asyncio
from typing import Dict, Any, List, Optional, Callable, Awaitable
from app.core.models import (
    TxStatus, StepStatus, ActionType, WALRecord, StateSnapshot,
    CompensationRecord, TransactionEvent, InvariantResult
)
from app.core.wal import WriteAheadLog
from app.core.isolation_sandbox import IsolationSandbox
from app.core.consistency_validator import ConsistencyValidator
from app.core.ollama_client import OllamaClient

class TransactionManager:
    """
    Agentic Transaction Manager implementing Semantic Atomicity,
    Consistency, Isolation, and Durability.
    """
    def __init__(
        self,
        tx_id: Optional[str] = None,
        task_name: str = "Customer Refund Protocol",
        event_callback: Optional[Callable[[TransactionEvent], Awaitable[None]]] = None,
        ollama_model: str = "qwen2.5:7b"
    ):
        self.tx_id = tx_id or f"tx_{uuid.uuid4().hex[:8]}"
        self.task_name = task_name
        self.status = TxStatus.INITIALIZED
        self.wal = WriteAheadLog(self.tx_id)
        self.sandbox = IsolationSandbox(name=f"sandbox_{self.tx_id}")
        self.validator = ConsistencyValidator()
        self.ollama = OllamaClient(default_model=ollama_model)
        self.event_callback = event_callback
        self.compensation_handlers: Dict[str, Callable[[IsolationSandbox, Dict[str, Any]], Awaitable[Dict[str, Any]]]] = {}
        self.initial_snapshot: Optional[StateSnapshot] = None
        self.step_counter = 0

        # Register Step 0 (Initial State)
        self._record_initial_state()

    def _record_initial_state(self):
        snapshot = self.sandbox.capture_snapshot(
            step_index=0,
            step_name="Initial System State",
            description="Baseline environment state prior to transaction execution."
        )
        self.initial_snapshot = snapshot
        self.wal.save_snapshot(0, snapshot)

    def register_compensation_handler(
        self,
        handler_name: str,
        fn: Callable[[IsolationSandbox, Dict[str, Any]], Awaitable[Dict[str, Any]]]
    ):
        self.compensation_handlers[handler_name] = fn

    async def emit_event(self, event_type: str, step_index: Optional[int], step_name: Optional[str], message: str, payload: Optional[Dict[str, Any]] = None):
        event = TransactionEvent(
            event_id=f"evt_{uuid.uuid4().hex[:8]}",
            tx_id=self.tx_id,
            event_type=event_type,
            step_index=step_index,
            step_name=step_name,
            message=message,
            payload=payload or {},
            timestamp=time.time()
        )
        if self.event_callback:
            try:
                await self.event_callback(event)
            except Exception as e:
                print(f"Error in event callback: {e}")

    async def execute_step(
        self,
        step_name: str,
        action_type: ActionType,
        action_fn: Callable[[IsolationSandbox, OllamaClient], Awaitable[Dict[str, Any]]],
        compensation_fn_name: Optional[str] = None,
        compensation_params: Optional[Dict[str, Any]] = None,
        fault_injection: bool = False,
        fault_message: str = "Injected Step Failure"
    ) -> Dict[str, Any]:
        """
        Executes a staged transaction unit.
        1. Logs intention in WAL (Write-Ahead)
        2. Clones sandbox for isolation
        3. Executes action logic
        4. Validates invariants & confidence divergence
        5. Commits to staged sandbox & WAL, or triggers rollback
        """
        self.step_counter += 1
        current_step = self.step_counter
        self.status = TxStatus.RUNNING

        pre_state = copy.deepcopy(self.sandbox.database)
        
        await self.emit_event(
            event_type="STEP_STARTED",
            step_index=current_step,
            step_name=step_name,
            message=f"Executing step {current_step}: {step_name}",
            payload={"action_type": action_type.value, "step_index": current_step}
        )

        # 1. Write Ahead Log Record
        wal_record = self.wal.append_record(
            step_index=current_step,
            step_name=step_name,
            action_type=action_type,
            inputs={"step": current_step, "name": step_name},
            pre_state_snapshot=pre_state,
            confidence_score=0.95,
            divergence_score=0.88
        )

        # 2. Check for Fault Injection
        if fault_injection:
            await asyncio.sleep(0.3)
            error_msg = f"CRITICAL FAULT: {fault_message}"
            self.wal.update_record_failure(wal_record.record_id, error_msg)
            await self.emit_event(
                event_type="STEP_FAILED",
                step_index=current_step,
                step_name=step_name,
                message=error_msg,
                payload={"error": error_msg, "step_index": current_step}
            )
            # Automatic Rollback Trigger
            await self.rollback_transaction(reason=error_msg)
            return {"success": False, "error": error_msg, "step_index": current_step}

        # 3. Staged Execution in Sandbox
        try:
            action_output = await action_fn(self.sandbox, self.ollama)
            post_state = copy.deepcopy(self.sandbox.database)

            # 4. Consistency & Invariant Validation
            div_score = action_output.get("divergence_score", 0.88)
            invariants = self.validator.validate_step_invariants(
                action_name=step_name,
                pre_state=pre_state,
                post_state=post_state,
                divergence_score=div_score
            )

            failed_inv = [inv for inv in invariants if not inv.passed]
            if failed_inv:
                inv_err = f"Invariant Violation: {failed_inv[0].message}"
                self.wal.update_record_failure(wal_record.record_id, inv_err)
                await self.emit_event(
                    event_type="STEP_FAILED",
                    step_index=current_step,
                    step_name=step_name,
                    message=inv_err,
                    payload={"error": inv_err, "step_index": current_step, "invariants": [i.model_dump() for i in invariants]}
                )
                await self.rollback_transaction(reason=inv_err)
                return {"success": False, "error": inv_err, "step_index": current_step}

            # 5. Extract LLM Trace
            llm_trace = action_output.get("llm_trace")
            if not llm_trace and "thought" in action_output:
                llm_trace = {
                    "model_used": self.ollama.default_model,
                    "thought": action_output.get("thought"),
                    "decision": action_output.get("decision", "proceed"),
                    "confidence_score": action_output.get("confidence", 0.95),
                    "prompt_sent": f"Task: {step_name}\nContext: {json.dumps(action_output.get('context', {}))}",
                    "raw_response": json.dumps(action_output, indent=2)
                }

            # 6. Compensation Registration
            comp_rec = None
            if compensation_fn_name:
                comp_rec = CompensationRecord(
                    action_name=f"Compensate: {step_name}",
                    inverse_fn_name=compensation_fn_name,
                    parameters=compensation_params or action_output.get("compensation_params", {})
                )

            # 7. Mark Step Committed in WAL & Save Snapshot
            self.wal.update_record_success(
                record_id=wal_record.record_id,
                outputs=action_output,
                post_state_snapshot=post_state,
                compensation_action=comp_rec
            )
            # Attach trace to wal record
            for r in self.wal.records:
                if r.record_id == wal_record.record_id:
                    r.llm_trace = llm_trace
                    break

            snapshot = self.sandbox.capture_snapshot(
                step_index=current_step,
                step_name=step_name,
                description=f"State after step {current_step}: {step_name}",
                llm_trace=llm_trace
            )
            self.wal.save_snapshot(current_step, snapshot)

            await self.emit_event(
                event_type="STEP_COMMITTED",
                step_index=current_step,
                step_name=step_name,
                message=f"Step {current_step} validated and committed successfully.",
                payload={
                    "step_index": current_step,
                    "output": action_output,
                    "snapshot": snapshot.model_dump(),
                    "llm_trace": llm_trace,
                    "invariants": [i.model_dump() for i in invariants]
                }
            )

            return {"success": True, "step_index": current_step, "output": action_output, "llm_trace": llm_trace}

        except Exception as e:
            err = f"Execution Exception: {str(e)}"
            self.wal.update_record_failure(wal_record.record_id, err)
            await self.emit_event(
                event_type="STEP_FAILED",
                step_index=current_step,
                step_name=step_name,
                message=err,
                payload={"error": err, "step_index": current_step}
            )
            await self.rollback_transaction(reason=err)
            return {"success": False, "error": err, "step_index": current_step}

    async def rollback_transaction(self, reason: str):
        """
        LIFO Saga Rollback:
        Iterates backward through committed records and executes inverse compensation functions.
        Restores the sandbox to initial state.
        """
        self.status = TxStatus.COMPENSATING
        await self.emit_event(
            event_type="TX_ROLLBACK_STARTED",
            step_index=None,
            step_name=None,
            message=f"Initiating LIFO Transaction Rollback. Reason: {reason}",
            payload={"reason": reason}
        )

        compensable_records = self.wal.get_compensable_records()
        for rec in compensable_records:
            comp = rec.compensation
            if not comp:
                continue

            await self.emit_event(
                event_type="COMPENSATION_STEP",
                step_index=rec.step_index,
                step_name=comp.action_name,
                message=f"Compensating Step {rec.step_index}: {comp.action_name}",
                payload={"step_index": rec.step_index, "inverse_fn": comp.inverse_fn_name, "params": comp.parameters}
            )
            
            # Execute compensation handler if registered
            if comp.inverse_fn_name in self.compensation_handlers:
                handler = self.compensation_handlers[comp.inverse_fn_name]
                try:
                    await handler(self.sandbox, comp.parameters)
                    comp.executed = True
                    comp.execution_result = "SUCCESS"
                    comp.timestamp = time.time()
                except Exception as comp_err:
                    comp.executed = False
                    comp.execution_result = f"FAILED: {comp_err}"
            
            await asyncio.sleep(0.4) # Visual rewind pacing

        # Restore initial sandbox state
        if self.initial_snapshot:
            self.sandbox.database = copy.deepcopy(self.initial_snapshot.database_state)
            self.sandbox.workspace_files = copy.deepcopy(self.initial_snapshot.workspace_files)
            self.sandbox.memory_graph = copy.deepcopy(self.initial_snapshot.agent_memory_nodes)
            
        self.status = TxStatus.ROLLED_BACK
        
        final_snapshot = self.sandbox.capture_snapshot(
            step_index=999,
            step_name="Rollback Complete - State Restored",
            description=f"Transaction rolled back due to: {reason}. All side-effects compensated."
        )
        self.wal.save_snapshot(999, final_snapshot)

        await self.emit_event(
            event_type="TX_ROLLED_BACK",
            step_index=None,
            step_name=None,
            message="Transaction successfully rolled back. State restored to original baseline.",
            payload={"reason": reason, "restored_snapshot": final_snapshot.model_dump()}
        )

    async def commit_transaction(self):
        """Finalizes transaction and commits all mutations."""
        self.status = TxStatus.COMMITTED
        final_snapshot = self.sandbox.capture_snapshot(
            step_index=self.step_counter + 1,
            step_name="Transaction Committed",
            description="All semantic transaction steps validated and committed."
        )
        await self.emit_event(
            event_type="TX_COMMITTED",
            step_index=self.step_counter + 1,
            step_name="Commit Success",
            message="All transaction units validated. State durably committed.",
            payload={"final_snapshot": final_snapshot.model_dump()}
        )

    def get_time_travel_snapshot(self, step_index: int) -> Optional[StateSnapshot]:
        """Time Machine Scrubber state query."""
        return self.wal.get_snapshot(step_index)
