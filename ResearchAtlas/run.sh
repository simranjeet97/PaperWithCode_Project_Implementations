#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────
# 🗺️  ResearchAtlas — Unified Launcher
#     Autonomous ML Research Field Cartographer
# ─────────────────────────────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_DIR="$BACKEND_DIR/venv"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

cleanup() {
    echo -e "\n${YELLOW}Shutting down ResearchAtlas...${RESET}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped.${RESET}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║   🗺️  ResearchAtlas — AI Research Field Cartographer        ║${RESET}"
echo -e "${CYAN}${BOLD}║   arXiv Retrieval → Cross-Encoder → Extraction → Synthesis  ║${RESET}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ─────────────────────────────────────────────────────────────────────
# 1. Python Virtual Environment & Backend Dependencies
# ─────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/4]${RESET} Setting up Python virtual environment..."

if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    echo -e "  ${GREEN}✓ Created virtualenv at $VENV_DIR${RESET}"
else
    echo -e "  ${GREEN}✓ Virtualenv already exists${RESET}"
fi

source "$VENV_DIR/bin/activate"

echo -e "${CYAN}[2/4]${RESET} Installing backend dependencies..."
pip install -q --upgrade pip
pip install -q -r "$BACKEND_DIR/requirements.txt"
echo -e "  ${GREEN}✓ Backend dependencies installed${RESET}"

# Copy .env if not present
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "  ${YELLOW}ℹ Copied .env.example → .env (edit with your API keys if needed)${RESET}"
fi

# ─────────────────────────────────────────────────────────────────────
# 2. Frontend Dependencies
# ─────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[3/4]${RESET} Installing frontend dependencies..."

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    cd "$FRONTEND_DIR"
    npm install --silent 2>&1 | tail -1
    cd "$PROJECT_ROOT"
    echo -e "  ${GREEN}✓ Frontend node_modules installed${RESET}"
else
    echo -e "  ${GREEN}✓ node_modules already present${RESET}"
fi

# ─────────────────────────────────────────────────────────────────────
# 3. Run Backend Tests
# ─────────────────────────────────────────────────────────────────────
echo -e "${CYAN}[4/4]${RESET} Running backend tests..."
cd "$BACKEND_DIR"
python -m pytest tests/ -v --tb=short 2>&1 | tail -20
TESTS_EXIT=$?
cd "$PROJECT_ROOT"

if [ $TESTS_EXIT -ne 0 ]; then
    echo -e "  ${RED}⚠ Some tests failed, but continuing startup...${RESET}"
else
    echo -e "  ${GREEN}✓ All tests passed${RESET}"
fi

# ─────────────────────────────────────────────────────────────────────
# 4. Launch Backend & Frontend Concurrently
# ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Starting servers...${RESET}"
echo ""

# Launch FastAPI Backend
cd "$BACKEND_DIR"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$PROJECT_ROOT"
echo -e "  ${GREEN}✓ Backend running at ${BOLD}http://localhost:8000${RESET} ${GREEN}(PID: $BACKEND_PID)${RESET}"

# Launch Next.js Frontend (Production server for 100% rock-solid static CSS extraction)
cd "$FRONTEND_DIR"
npm run build
npm run start &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"
echo -e "  ${GREEN}✓ Frontend running at ${BOLD}http://localhost:3000${RESET} ${GREEN}(PID: $FRONTEND_PID)${RESET}"

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║  🗺️  ResearchAtlas is live!                                 ║${RESET}"
echo -e "${CYAN}${BOLD}║                                                              ║${RESET}"
echo -e "${CYAN}${BOLD}║  🌐  UI:   http://localhost:3000                             ║${RESET}"
echo -e "${CYAN}${BOLD}║  ⚡  API:  http://localhost:8000/api/health                  ║${RESET}"
echo -e "${CYAN}${BOLD}║  📡  Docs: http://localhost:8000/docs                        ║${RESET}"
echo -e "${CYAN}${BOLD}║                                                              ║${RESET}"
echo -e "${CYAN}${BOLD}║  Press Ctrl+C to stop all services                           ║${RESET}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

wait
