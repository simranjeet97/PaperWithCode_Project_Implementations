#!/usr/bin/env bash
set -e

echo "========================================================="
echo "   🚀 LAUNCHING AGENT TIME MACHINE (100% Local, No Docker)"
echo "========================================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Check virtualenv
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtualenv..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install --upgrade pip
    ./backend/venv/bin/pip install fastapi uvicorn pydantic pytest pytest-asyncio httpx websockets
fi

export PYTHONPATH="$DIR/backend"

echo "Starting FastAPI Server + Vue 3 Frontend at http://localhost:8000 ..."
./backend/venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
