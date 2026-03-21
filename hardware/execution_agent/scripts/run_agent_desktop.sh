#!/usr/bin/env bash
# Launch the execution agent with the Kivy 7" UI enabled (Pi Desktop / HDMI).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$AGENT_ROOT"

export EXECUTION_AGENT_START_UI="${EXECUTION_AGENT_START_UI:-1}"
export KIVY_WINDOW="${KIVY_WINDOW:-sdl2}"
export KIVY_GL_BACKEND="${KIVY_GL_BACKEND:-sdl2}"

VENV_PY="${AGENT_ROOT}/.venv/bin/python"
if [[ ! -x "$VENV_PY" ]]; then
  echo "Missing venv at ${AGENT_ROOT}/.venv — run: bash scripts/setup.sh" >&2
  exit 1
fi

exec "$VENV_PY" "${AGENT_ROOT}/main.py"
