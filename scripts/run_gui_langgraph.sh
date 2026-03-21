#!/usr/bin/env bash
# Run Kivy GUI with LangGraph therapy session support.
# Ensures repo root is cwd and .env is discoverable (run_gui.py also loads ../.env).
#
# Usage (from repo root):
#   chmod +x scripts/run_gui_langgraph.sh
#   ./scripts/run_gui_langgraph.sh
#
# Optional: start FastAPI bridge on :8000 first (for future HTTP testing):
#   START_BACKEND=1 ./scripts/run_gui_langgraph.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EA="${ROOT}/hardware/execution_agent"
if [[ ! -f "${EA}/run_gui.py" ]]; then
  EA="${ROOT}/execution_agent"
fi

pick_python() {
  for p in "${ROOT}/.venv/bin/python" "${EA}/.venv/bin/python"; do
    if [[ -x "$p" ]]; then echo "$p"; return 0; fi
  done
  echo "ERROR: No venv found. Run: .venv/bin/pip install -r hardware/execution_agent/requirements.txt" >&2
  exit 1
}

PY="$(pick_python)"
export PYTHONPATH="${ROOT}${PYTHONPATH:+:${PYTHONPATH}}"

if [[ "${START_BACKEND:-0}" == "1" ]]; then
  if [[ -f "${ROOT}/backend/main.py" ]]; then
    BACKEND_PORT="${BACKEND_PORT:-8000}"
    echo "Starting FastAPI (uvicorn) on 0.0.0.0:${BACKEND_PORT} ..."
    (cd "${ROOT}/backend" && PYTHONPATH="${ROOT}:${PYTHONPATH:-}" "${PY}" -m uvicorn main:app --host 0.0.0.0 --port "${BACKEND_PORT}") &
    UV_PID=$!
    trap 'kill ${UV_PID} 2>/dev/null || true' EXIT
    sleep 2
  else
    echo "WARN: backend/main.py not found; skipping START_BACKEND." >&2
  fi
fi

cd "${EA}"
exec "${PY}" run_gui.py "$@"
