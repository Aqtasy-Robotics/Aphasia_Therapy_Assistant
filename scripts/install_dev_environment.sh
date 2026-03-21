#!/usr/bin/env bash
# Install system packages (Debian/Ubuntu) + Python venvs for execution_agent and backend.
# Usage from repo root:
#   chmod +x scripts/install_dev_environment.sh
#   sudo bash scripts/install_dev_environment.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EA_DIR="${REPO_ROOT}/execution_agent"

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "System packages require root. Run: sudo bash scripts/install_dev_environment.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y \
  python3-venv \
  python3-dev \
  build-essential \
  libportaudio2 \
  portaudio19-dev \
  libatlas-base-dev \
  libjpeg-dev \
  libpng-dev \
  libsdl2-dev \
  libsdl2-image-dev \
  libsdl2-mixer-dev \
  libsdl2-ttf-dev \
  libportaudio2 \
  libsndfile1 \
  ffmpeg \
  wget \
  curl \
  git

echo "System packages OK."

TARGET_USER="${SUDO_USER:-${USER:-root}}"
if [[ -n "${SUDO_USER:-}" ]] && id "${SUDO_USER}" &>/dev/null; then
  echo "Installing Python deps as ${TARGET_USER}…"
  sudo -u "${SUDO_USER}" bash <<SETUP
set -euo pipefail
cd "${EA_DIR}"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt
.venv/bin/pip install -q -r "${REPO_ROOT}/backend/requirements.txt"
echo "execution_agent venv: ${EA_DIR}/.venv"
SETUP
else
  cd "${EA_DIR}"
  python3 -m venv .venv || true
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -q -r requirements.txt
  .venv/bin/pip install -q -r "${REPO_ROOT}/backend/requirements.txt"
fi

echo "Done. Activate: source ${EA_DIR}/.venv/bin/activate"
echo "Run backend: cd ${REPO_ROOT}/backend && ../execution_agent/.venv/bin/uvicorn main:app --reload"
echo "Run agent UI: cd ${EA_DIR} && .venv/bin/python run_gui.py"
