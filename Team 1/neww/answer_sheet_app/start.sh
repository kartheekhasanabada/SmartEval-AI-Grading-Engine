#!/usr/bin/env bash
# AnswerScan AI — One-shot startup script
# Usage: bash start.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   AnswerScan AI — Starting Services      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Optional: train CRNN if weights are missing ────────────────────────────────
if [ ! -f "$ROOT/models/crnn_weights.pth" ]; then
  echo "ℹ  No trained weights found at models/crnn_weights.pth"
  echo "   To train on EMNIST and get real OCR accuracy, run:"
  echo "      python train_crnn.py --epochs 15"
  echo "   (first run downloads EMNIST ~500 MB automatically)"
  echo "   Continuing in demo mode — Gemini is the active fallback."
  echo ""
fi

# ── Check GEMINI_API_KEY ───────────────────────────────────────────────────────
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠  GEMINI_API_KEY is not set."
  echo "   The backend will run but Gemini fallback will be disabled."
  echo "   Set it with: export GEMINI_API_KEY=your_key"
  echo ""
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo "▶ Starting FastAPI backend on :8000 ..."
cd "$ROOT/backend"

if ! command -v uvicorn &>/dev/null; then
  echo "  Installing backend dependencies..."
  pip install -r requirements.txt -q
fi

uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
sleep 2

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "▶ Starting React frontend on :3000 ..."
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "  Running npm install..."
  npm install --silent
fi

npm start &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅  Both servers running                ║"
echo "║  Frontend : http://localhost:3000        ║"
echo "║  Backend  : http://localhost:8000        ║"
echo "║  API docs : http://localhost:8000/docs   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait and clean up
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
