#!/usr/bin/env bash
# Setup script for AI Poster Studio
# Run once after cloning: ./scripts/setup.sh

set -euo pipefail

echo "→ AI Poster Studio setup"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js not found. Install Node 20+ first."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "→ Enabling pnpm via Corepack"
  corepack enable
  corepack prepare pnpm@9.12.0 --activate
fi

echo "→ Installing dependencies"
pnpm install

if [ ! -f .env.local ]; then
  echo "→ Creating .env.local from example"
  cp .env.example .env.local
  echo "  Fill in your API keys in .env.local before running"
fi

echo ""
echo "✓ Setup complete"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your API keys"
echo "  2. Run 'pnpm dev' to start the web app"
echo "  3. (Optional) Run 'cd apps/worker && uvicorn main:app --reload' for the worker"
echo ""
echo "See README.md and docs/DEPLOYMENT.md for details."