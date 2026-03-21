#!/usr/bin/env bash
# setup.sh — Create Python virtual environment for execution_agent on Raspberry Pi 4
#
# Usage on the Pi:
#   cd /home/pi/execution_agent
#   bash scripts/setup.sh
#
# This script is intentionally simple; it is complemented by
# `scripts/install_dependencies.sh` which installs system packages.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${PROJECT_ROOT}/.venv"

python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"

pip install --upgrade pip
pip install -r "${PROJECT_ROOT}/requirements.txt"

echo "Virtual environment created at: ${VENV_DIR}"
echo "Activate with:"
echo "  source \"${VENV_DIR}/bin/activate\""
