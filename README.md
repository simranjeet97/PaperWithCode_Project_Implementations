# 🔬 Papers With Code: Advanced AI Research Implementations

A curated collection of production-grade, interactive implementations of state-of-the-art AI and Agentic research papers. Every project is built **100% locally with zero Docker requirements**, featuring rich visual user interfaces, automated verification test suites, and local LLM integrations (Ollama / Qwen / Gemma).

---

## 📂 Projects Catalog

| # | Project Name | Paper Title & Reference | Key Innovations | Tech Stack | Status |
|---|--------------|-------------------------|-----------------|------------|--------|
| **01** | [**⏳ Agent Time Machine**](agent-time-machine/) | *"Agentic Transaction: Towards ACID-Compliant Agent Systems"* (Sun et al., Tsinghua / arXiv:2608.13900) | **ACID Guarantees for AI Agents**: Write-Ahead Logging (WAL), LIFO Saga Rollback, Point-in-Time Checkpointing, Semantic Invariant Guards | FastAPI, Vue 3, Local Ollama (`qwen2.5:7b`), Cyber-Obsidian UI | ✅ Complete (12/12 Tests Passing) |

---

## 🌟 Featured Project: [01. Agent Time Machine](agent-time-machine/)

An interactive visual platform demonstrating **ACID transactions and automatic visual rollback** for autonomous AI agents.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ 💬 CLIENT ASSISTANT & PLANNER ]   [ ⏳ TIME MACHINE INSPECTOR ]    [● WS STREAMING] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ USER CHAT                                       │ CLIENT WALLET / LEDGER STATE         │
│ "Book my Hawaii vacation with $1,000 budget"    │ Initial: $1,000 → Charged: $0 → $1,000│
│                                                 ├──────────────────────────────────────┤
│ 🤖 DYNAMIC OLLAMA QWEN PLAN:                    │ TRANSACTION EXECUTION PROGRESS       │
│ 1. Verify Travel Budget            (Undo: None) │ ✓ 1. Verify Wallet ($1,000)          │
│ 2. Reserve Beachfront Hotel -$400  (Undo: ref)  │ ↺ 2. Reserve Hotel (-$400) [COMPENS] │
│ 3. Book Roundtrip Flights -$500    (Undo: ref)  │ ↺ 3. Book Flight HA-402 (-$500)     │
│ 4. Rent Convertible Car -$100      (Undo: canc) │ ✕ 4. Rent Island Car [FAILED: 504]   │
│                                                 ├──────────────────────────────────────┤
│ [x] Simulate Step 4 Failure (Test Rollback)     │ [✓ 100% REFUNDED: Hotel + Flight]   │
│ [ APPROVE & EXECUTE TRANSACTION ]               │ Balance Restored: $1,000.00          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Quick Run:
```bash
cd agent-time-machine
./run.sh
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

---

## 🛠️ Repository Guidelines

Each subfolder in this repository represents an independent implementation of an AI research paper with:
- Dedicated runnable startup script (`./run.sh`).
- Independent virtual environment and test suite (`pytest`).
- Standalone documentation (`README.md`) with mathematical foundations, architecture diagrams, and paper citations.
- Modern visual frontend adhering to [`VoltAgent/awesome-design-md`](https://github.com/voltagent/awesome-design-md) design guidelines.

---

## 📜 License
MIT License. Created by [Simranjeet Singh](https://github.com/simranjeet97).
