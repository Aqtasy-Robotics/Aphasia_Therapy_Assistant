#!/usr/bin/env bash
# install_dependencies.sh — One-shot system setup for Raspberry Pi 4
#
# This script installs system-level dependencies required by the execution_agent
# and then (optionally) runs the Python virtualenv setup script.
#
# Usage on the Pi:
#   cd /home/pi/execution_agent
#   sudo bash scripts/install_dependencies.sh
#
# It is safe to run multiple times; `apt-get` will skip already-installed
# packages.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root (use: sudo bash scripts/install_dependencies.sh)" >&2
  exit 1
fi

echo "Updating apt package lists…"
apt-get update

echo "Installing system packages for audio, GPIO, OLED, and Kivy…"
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
  i2c-tools \
  python3-smbus \
  libgpiod2 \
  espeak-ng \
  wget

echo "System dependencies installed."

# Download Piper TTS model (Phase 3)
echo "Downloading Piper TTS model..."
MODELS_DIR="${PROJECT_ROOT}/models"
mkdir -p "${MODELS_DIR}"

MODEL_NAME="en_US-lessac-medium"
MODEL_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"
MODEL_ONNX="${MODELS_DIR}/${MODEL_NAME}.onnx"
MODEL_JSON="${MODELS_DIR}/${MODEL_NAME}.onnx.json"

if [[ ! -f "${MODEL_ONNX}" ]]; then
  echo "Downloading ${MODEL_NAME}.onnx..."
  wget -q --show-progress -O "${MODEL_ONNX}" \
    "${MODEL_BASE_URL}/${MODEL_NAME}.onnx" || {
    echo "Warning: Failed to download ${MODEL_NAME}.onnx" >&2
    exit 1
  }
else
  echo "${MODEL_NAME}.onnx already exists, skipping download."
fi

if [[ ! -f "${MODEL_JSON}" ]]; then
  echo "Downloading ${MODEL_NAME}.onnx.json..."
  wget -q --show-progress -O "${MODEL_JSON}" \
    "${MODEL_BASE_URL}/${MODEL_NAME}.onnx.json" || {
    echo "Warning: Failed to download ${MODEL_NAME}.onnx.json" >&2
    exit 1
  }
else
  echo "${MODEL_NAME}.onnx.json already exists, skipping download."
fi

# Set appropriate permissions (owned by TARGET_USER)
if id "${TARGET_USER}" >/dev/null 2>&1; then
  chown -R "${TARGET_USER}:${TARGET_USER}" "${MODELS_DIR}"
fi

echo "Piper TTS model downloaded successfully."


# Optionally set up the Python environment as the invoking user (default: pi).
TARGET_USER="${SUDO_USER:-pi}"

if id "${TARGET_USER}" >/dev/null 2>&1; then
  echo "Running Python virtualenv setup as user '${TARGET_USER}'…"
  sudo -u "${TARGET_USER}" bash -lc "cd '${PROJECT_ROOT}' && bash scripts/setup.sh"
else
  echo "User '${TARGET_USER}' not found; skipping virtualenv setup. Run scripts/setup.sh manually."
fi

echo "Done. Reboot is recommended after first install so kernel modules and I2C/GPIO are ready."

