# ⏳ Agent Time Machine (ACID-Compliant Agent Rollback Platform)

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.0_Standalone-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org)
[![Ollama](https://img.shields.io/badge/Ollama-Local_Qwen_/_Gemma-black?style=flat&logo=ollama&logoColor=white)](https://ollama.com)
[![Tests](https://img.shields.io/badge/Tests-12_Passed_100%25-brightgreen?style=flat)](backend/tests)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Inspired by the Research Paper:**  
> *"Agentic Transaction: Towards ACID-Compliant Agent Systems"*  
> **Authors:** Sun et al., Tsinghua University (*arXiv:2608.13900*)

---

## 📌 Problem Statement: Why Do AI Agents Need ACID Guarantees?

In conventional LLM-based autonomous agent workflows:
```
Step 1: Read Database ──► Step 2: Charge Credit Card ($500) ──► Step 3: Mutate Inventory ──► Step 4: Dispatch Notification [💥 CRASH: 504 TIMEOUT]
```

When **Step 4 fails**, standard agents leave the system in a **corrupted, half-mutated dirty state**:
- ❌ The user was charged $500.
- ❌ Inventory was decremented.
- ❌ No receipt or confirmation was created.
- ❌ The agent has no memory of how to safely undo prior actions.

---

## 💡 The Solution: Agent Time Machine

**Agent Time Machine** brings database-grade **ACID guarantees** to long-running, multi-step AI agent workflows:

1. **⚛️ Atomicity (All-or-Nothing Execution)**: Managed via an append-only **Write-Ahead Log (WAL)**. Every mutation registers an inverse compensation recipe. If any step fails, the engine executes a **Last-In, First-Out (LIFO) Saga Rollback** to cleanly restore the system to its baseline state.
2. **🛡️ Consistency (Semantic Invariants & Confidence Divergence)**: Evaluates pre-commit semantic rules (e.g. Account Solvency: $\text{Balance} \ge \$0.00$) and verifies $P_{\text{LLM}}(\text{Decision} \mid \text{Evidence})$ confidence divergence ($\Delta_{\text{div}} \ge 0.25$) to prevent hallucinations.
3. **🧊 Isolation (Copy-on-Write Sandbox)**: Uncommitted mutations execute in a virtualized sandbox. Failed retry branches and speculative state are pruned from agent memory, preventing cascading dirty reads.
4. **💾 Durability (Point-in-Time Checkpointing)**: Snapshot checkpoints at every step enable **Time-Travel Scrubbing** to inspect and restore past states at $t_0, t_1, t_2, t_3$.

---

## 🖥️ Dual-Interface System Architecture

Agent Time Machine features two synchronized views served directly from FastAPI:

### View 1: 💬 Client Assistant & Planner (End-User View)
- **Natural Language Planning**: Users type high-level requests (e.g., *"Book my vacation to Hawaii for $1,000"* or *"Refund order #882"*).
- **Dynamic Plan Breakdown**: Local Ollama model (`qwen2.5:7b` / `gemma:2b`) parses the budget and generates a 4-step transactional plan with explicit **undo recipes**.
- **Live Client Ledger**: Displays real-time financial transitions ($\$1,000 \rightarrow \$600 \rightarrow \$100 \rightarrow \text{Rollback} \rightarrow \$1,000.00$).
- **One-Click Fault Simulation**: Toggle failure injection to witness automatic LIFO rollback in real-time.
- **Ollama Verification Drawer**: Expandable raw JSON prompt and response viewer for 100% LLM inference transparency.

### View 2: ⏳ Time Machine Inspector (Developer / Engine View)
- **Live Execution DAG**: Interactive nodes showing `COMMITTED`, `COMPENSATED`, and `FAILED` status rings.
- **Reverse Laser Rollback Animation**: Visual rewind laser tracing backward during compensations.
- **Interactive Timeline Scrubber**: Drag backward through time to view exact point-in-time database tables, API payloads, memory graphs, and virtual filesystem states.
- **🤖 Ollama LLM Trace Tab**: Inspect system prompts, latency ($ms$), token counts, confidence scores, and raw model outputs for every step.

---

## 🏗️ System Flowchart (Mermaid)

```mermaid
flowchart TD
    User([💬 User Chat / API Request]) --> Planner[🤖 Ollama Planner (qwen2.5:7b)]
    Planner --> PlanCard[📋 Structured Plan with Undo Recipes]
    PlanCard --> UserApproval{User Approval}
    
    UserApproval -->|Approved| TXEngine[⚙️ Transaction Manager]
    
    subgraph Execution Loop [ACID Execution Loop]
        TXEngine --> WAL[📝 Write-Ahead Log (WAL)]
        WAL --> Sandbox[🧊 Virtual Copy-on-Write Sandbox]
        Sandbox --> ActionFn[⚡ Execute Step Action]
        ActionFn --> Validator[🛡️ Invariant & Confidence Gate]
        
        Validator -->|Passed| Commit[✓ Mark Step Committed & Save Snapshot]
        Validator -->|Failed / Timeout| Rollback[↺ Trigger LIFO Saga Rollback]
        
        Rollback --> Comp3[↺ Step 3 Compensation (Void Ticket)]
        Comp3 --> Comp2[↺ Step 2 Compensation (Refund Hotel)]
        Comp2 --> Restored[✓ State Cleanly Restored to Baseline]
    end
    
    Commit --> Broadcast[📡 WebSocket Broadcast (ws/transaction/id)]
    Restored --> Broadcast
    Broadcast --> UI[🖥️ Dual-View Vue 3 Interface]
```

---

## 🚀 Quickstart (100% Local, Zero Docker)

### 1. Prerequisites
- Python 3.9+
- [Ollama](https://ollama.com) installed and running locally:
  ```bash
  ollama run qwen2.5:7b
  # or: ollama run gemma:2b
  ```

### 2. Launch the Application
Run the startup script:
```bash
./run.sh
```

The script will automatically create a local virtual environment, install dependencies, and start the server at:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🧪 Automated Test Suite

Run the full pytest suite across all ACID properties:

```bash
PYTHONPATH=backend ./backend/venv/bin/pytest backend/tests/ -v
```

### Test Coverage (12/12 Passing):
- `test_api.py`: Health, Model Discovery, Scenario Execution, Live Chat Planning.
- `test_atomicity.py`: Commit verification and LIFO Saga rollback restoration.
- `test_consistency.py`: Solvency invariant ($\text{Balance} \ge 0$) and Confidence Divergence gate ($\Delta_{\text{div}} \ge 0.25$).
- `test_durability.py`: Snapshot checkpointing and time-travel reconstruction.
- `test_isolation.py`: Virtual sandbox cloning and memory graph pruning.

---

## 📁 Repository Structure

```
agent-time-machine/
├── 2608.13900v1.pdf            # Original Tsinghua Research Paper
├── DESIGN.md                   # UI Specification (VoltAgent awesome-design-md)
├── README.md                   # Project Documentation
├── run.sh                      # Single-command executable launcher
└── backend/
    ├── app/
    │   ├── main.py             # FastAPI REST & WebSocket server
    │   ├── core/
    │   │   ├── models.py       # Pydantic schemas (WAL, Snapshot, Event)
    │   │   ├── wal.py          # Write-Ahead Log engine
    │   │   ├── isolation_sandbox.py # Copy-on-Write sandbox
    │   │   ├── consistency_validator.py # Semantic invariant guard
    │   │   ├── ollama_client.py     # Local Ollama LLM client
    │   │   └── transaction_manager.py # ACID orchestrator
    │   ├── scenarios/
    │   │   ├── ecommerce_refund.py  # E-commerce refund workflow
    │   │   ├── vacation_booking.py  # Vacation booking ($1k budget) workflow
    │   │   ├── wollaston_lakehouse.py # Paper benchmark scenario
    │   │   └── custom_runner.py     # Dynamic transaction runner
    │   └── static/
    │       ├── index.html      # Vue 3 Dual-View SPA
    │       ├── styles.css      # Cyber-obsidian design system
    │       └── app.js          # Reactive state & time-travel logic
    └── tests/                  # 12 automated unit tests
```

---

## 📚 Citation

```bibtex
@article{sun2026agentic,
  title={Agentic Transaction: Towards ACID-Compliant Agent Systems},
  author={Sun, et al.},
  journal={arXiv preprint arXiv:2608.13900},
  year={2026}
}
```
