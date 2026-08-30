import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.transaction_manager import TransactionManager
from app.core.ollama_client import OllamaClient
from app.core.models import TransactionEvent
from app.scenarios.ecommerce_refund import run_ecommerce_scenario
from app.scenarios.wollaston_lakehouse import run_wollaston_scenario
from app.scenarios.custom_runner import run_custom_user_scenario
from app.scenarios.vacation_booking import run_vacation_booking_scenario

app = FastAPI(title="Agent Time Machine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections: tx_id -> List[WebSocket]
active_connections: Dict[str, List[WebSocket]] = {}
active_transactions: Dict[str, TransactionManager] = {}

class ChatPlanRequest(BaseModel):
    user_message: str
    model_name: str = "qwen2.5:7b"

class ScenarioRequest(BaseModel):
    scenario_type: str = "ecommerce_refund"  # "ecommerce_refund" | "wollaston_lakehouse" | "vacation_booking" | "custom"
    fault_injection: bool = True
    model_name: str = "qwen2.5:7b"
    step_delay: float = 0.8

@app.post("/api/chat-plan")
async def generate_chat_plan(req: ChatPlanRequest):
    """
    Client-Facing AI Agent Planner:
    Takes a natural language request, generates a structured transaction plan with undo receipts,
    and returns a proposal for user approval before execution.
    """
    ollama = OllamaClient(default_model=req.model_name)
    result = await ollama.generate_transaction_plan(
        user_message=req.user_message,
        model=req.model_name
    )
    return {
        "scenario_type": result["scenario_type"],
        "plan": result["plan"],
        "model_used": req.model_name,
        "llm_trace": result.get("llm_trace", {})
    }

class ScenarioRequest(BaseModel):
    scenario_type: str = "ecommerce_refund"  # "ecommerce_refund" | "wollaston_lakehouse" | "custom"
    fault_injection: bool = True
    model_name: str = "qwen2.5:7b"
    step_delay: float = 0.8

class CustomStepInput(BaseModel):
    step_name: str
    action_type: str = "DB_MUTATION"
    should_fail: bool = False
    fail_message: str = "Custom Injected Step Failure"
    mutation_target: str = "balance"  # "balance" | "inventory" | "file" | "api"
    mutation_value: float = 50.0

class CustomTransactionRequest(BaseModel):
    task_name: str = "Custom User Workflow"
    customer_id: str = "cust_custom"
    customer_name: str = "My Custom User"
    initial_balance: float = 250.0
    initial_stock: int = 10
    model_name: str = "qwen2.5:7b"
    step_delay: float = 0.8
    steps: List[CustomStepInput] = []

async def broadcast_tx_event(event: TransactionEvent):
    tx_id = event.tx_id
    if tx_id in active_connections:
        data = event.model_dump()
        dead_sockets = []
        for ws in active_connections[tx_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead_sockets.append(ws)
        for dead in dead_sockets:
            active_connections[tx_id].remove(dead)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "Agent Time Machine", "mode": "100% Local (Zero Docker)"}

@app.get("/api/models")
async def get_models():
    ollama = OllamaClient()
    models = await ollama.list_models()
    return {"models": models, "recommended": "qwen2.5:7b"}

@app.post("/api/run-scenario")
async def start_scenario(req: ScenarioRequest):
    tx_id = f"tx_{req.scenario_type}_{int(asyncio.get_event_loop().time() * 1000)}"
    
    tx_manager = TransactionManager(
        tx_id=tx_id,
        task_name=f"Task: {req.scenario_type.replace('_', ' ').title()}",
        event_callback=broadcast_tx_event,
        ollama_model=req.model_name
    )
    active_transactions[tx_id] = tx_manager

    if req.scenario_type == "ecommerce_refund":
        asyncio.create_task(run_ecommerce_scenario(
            tx_manager,
            fault_on_step4=req.fault_injection,
            step_delay=req.step_delay
        ))
    elif req.scenario_type == "wollaston_lakehouse":
        asyncio.create_task(run_wollaston_scenario(
            tx_manager,
            simulate_initial_inconsistency=req.fault_injection,
            step_delay=req.step_delay
        ))
    elif req.scenario_type == "vacation_booking":
        asyncio.create_task(run_vacation_booking_scenario(
            tx_manager,
            fault_on_car_rental=req.fault_injection,
            step_delay=req.step_delay
        ))
    else:
        raise HTTPException(status_code=400, detail="Unknown scenario type")

    return {"tx_id": tx_id, "scenario": req.scenario_type, "status": "STARTED"}

@app.post("/api/run-custom-transaction")
async def start_custom_transaction(req: CustomTransactionRequest):
    tx_id = f"tx_custom_{int(asyncio.get_event_loop().time() * 1000)}"
    
    tx_manager = TransactionManager(
        tx_id=tx_id,
        task_name=req.task_name,
        event_callback=broadcast_tx_event,
        ollama_model=req.model_name
    )
    active_transactions[tx_id] = tx_manager

    steps_data = [s.model_dump() for s in req.steps] if req.steps else [
        {"step_name": "Validate Custom User Credentials", "action_type": "READ", "mutation_target": "balance", "mutation_value": 0.0, "should_fail": False},
        {"step_name": "Debit Custom Ledger Account", "action_type": "DB_MUTATION", "mutation_target": "balance", "mutation_value": 100.0, "should_fail": False},
        {"step_name": "Allocate Custom Warehouse Units", "action_type": "DB_MUTATION", "mutation_target": "inventory", "mutation_value": 2.0, "should_fail": False},
        {"step_name": "Dispatch External Webhook", "action_type": "API_CALL", "mutation_target": "api", "mutation_value": 0.0, "should_fail": True, "fail_message": "Remote Partner API Connection Dropped"}
    ]

    asyncio.create_task(run_custom_user_scenario(
        tx_manager=tx_manager,
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        initial_balance=req.initial_balance,
        initial_stock=req.initial_stock,
        steps_config=steps_data,
        step_delay=req.step_delay
    ))

    return {"tx_id": tx_id, "task": req.task_name, "status": "STARTED"}

@app.get("/api/transaction/{tx_id}/snapshots")
async def get_transaction_snapshots(tx_id: str):
    if tx_id not in active_transactions:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx = active_transactions[tx_id]
    return {
        "tx_id": tx_id,
        "status": tx.status.value,
        "snapshots": [s.model_dump() for s in tx.wal.get_all_snapshots()],
        "records": [r.model_dump() for r in tx.wal.records]
    }

@app.get("/api/transaction/{tx_id}/snapshot/{step_index}")
async def get_single_snapshot(tx_id: str, step_index: int):
    if tx_id not in active_transactions:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx = active_transactions[tx_id]
    snapshot = tx.get_time_travel_snapshot(step_index)
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot for step {step_index} not found")
    return snapshot.model_dump()

@app.post("/api/transaction/{tx_id}/rollback")
async def manual_rollback(tx_id: str, payload: Dict[str, Any] = Body(default={})):
    if tx_id not in active_transactions:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx = active_transactions[tx_id]
    reason = payload.get("reason", "Manual User Triggered Rollback")
    asyncio.create_task(tx.rollback_transaction(reason=reason))
    return {"status": "ROLLBACK_INITIATED", "tx_id": tx_id}

@app.websocket("/ws/transaction/{tx_id}")
async def websocket_endpoint(websocket: WebSocket, tx_id: str):
    await websocket.accept()
    if tx_id not in active_connections:
        active_connections[tx_id] = []
    active_connections[tx_id].append(websocket)

    if tx_id in active_transactions:
        tx = active_transactions[tx_id]
        history_event = {
            "event_type": "INITIAL_HISTORY",
            "tx_id": tx_id,
            "snapshots": [s.model_dump() for s in tx.wal.get_all_snapshots()],
            "records": [r.model_dump() for r in tx.wal.records],
            "status": tx.status.value
        }
        await websocket.send_json(history_event)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action")
            if action == "SCRUB_TIME_TRAVEL":
                step = msg.get("step_index", 0)
                if tx_id in active_transactions:
                    tx = active_transactions[tx_id]
                    snap = tx.get_time_travel_snapshot(step)
                    if snap:
                        await websocket.send_json({
                            "event_type": "TIME_TRAVEL_STATE",
                            "step_index": step,
                            "snapshot": snap.model_dump()
                        })
            elif action == "MANUAL_ROLLBACK":
                if tx_id in active_transactions:
                    tx = active_transactions[tx_id]
                    asyncio.create_task(tx.rollback_transaction(reason="User Triggered Rollback"))
    except WebSocketDisconnect:
        if tx_id in active_connections and websocket in active_connections[tx_id]:
            active_connections[tx_id].remove(websocket)

# Mount static files for Vue.js Frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/favicon.ico")
async def favicon():
    return FileResponse(os.path.join(static_dir, "favicon.svg"), media_type="image/svg+xml")

@app.get("/")
async def index():
    return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
