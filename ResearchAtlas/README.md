# 🗺️ ResearchAtlas — Autonomous ML Research Field Cartographer

An AI agent that maps an entire ML research field from a single search query. Enter a topic → arXiv pulls candidate papers → Cross-Encoder reranks by semantic relevance → LLM extracts structured dossiers per paper → Cross-paper synthesis generates a complete research landscape with clusters, tensions, open frontiers, and a curated reading roadmap.

---

## 📸 Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          USER QUERY (e.g. "RAG")                             │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Stage 1: ADAPTIVE RETRIEVAL ENGINE                                           │
│ • LLM query expansion → 3-5 academic sub-queries                             │
│ • arXiv API + Semantic Scholar citation overlay                              │
│ • 30-50 candidate preprints retrieved                                        │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Stage 2: CROSS-ENCODER SEMANTIC RERANKING                                    │
│ • cross-encoder/ms-marco-MiniLM-L-6-v2 (local CPU/MPS)                      │
│ • Deep query↔abstract token interaction scoring                              │
│ • Top 10-15 most seminal papers selected                                     │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Stage 3: STRUCTURED PAPER EXTRACTION                                         │
│ • Parallel LLM extraction per paper                                          │
│ • Schema: problem, method, results, contribution, limitations, code link     │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Stage 4: CROSS-PAPER LANDSCAPE SYNTHESIS                                     │
│ • Taxonomy clusters & hierarchical grouping                                  │
│ • Evolutionary citation DAG (extends, inspired_by, combines)                 │
│ • Scientific tensions & methodological trade-offs                            │
│ • Open research frontiers                                                    │
│ • Curated step-by-step reading roadmap                                       │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ INTERACTIVE CARTOGRAPHY UI (Next.js + Tailwind)                              │
│ • Force-directed Research Landscape Graph (Canvas)                           │
│ • Live 4-Stage SSE Pipeline Tracker                                          │
│ • Paper Dossier Slide-Out Drawer                                             │
│ • Tension Matrix, Taxonomy Inspector, Reading Roadmap                        │
│ • Export: Markdown, BibTeX, Obsidian, JSON                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
cd ResearchAtlas
./run.sh
```

Open **[http://localhost:3000](http://localhost:3000)** and search any ML topic.

### Manual Setup

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Edit with your API keys
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## ⚙️ Configuration

Edit `backend/.env`:

| Variable | Default | Description |
|:---|:---|:---|
| `LLM_PROVIDER` | `ollama` | `ollama`, `gemini`, `openai`, or `mock` |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Local Ollama model |
| `GEMINI_API_KEY` | — | Google Gemini API key (free tier) |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `MAX_CANDIDATE_PAPERS` | `30` | arXiv candidates per search |
| `TOP_SYNTHESIS_PAPERS` | `10` | Papers for deep synthesis |

---

## 🧪 Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

---

## 📦 Stack

| Layer | Technology |
|:---|:---|
| Backend API | FastAPI, Uvicorn, Pydantic v2 |
| Paper Retrieval | `arxiv` Python SDK, Semantic Scholar Open API |
| Semantic Reranking | SentenceTransformers Cross-Encoder (local CPU/MPS) |
| LLM Extraction | Ollama (qwen2.5) / Gemini API / OpenAI / Mock |
| Database | SQLite (WAL mode) |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Streaming | Server-Sent Events (SSE) |
| Exports | Markdown, BibTeX, Obsidian Vault, JSON |

---

## 📜 License

MIT License. Created by [Simranjeet Singh](https://github.com/simranjeet97).
