#!/usr/bin/env bash
# Install PortAudio for sounddevice (mic in therapy session). Debian/Ubuntu.
# Usage: sudo bash scripts/install_portaudio_apt.sh

set -euo pipefail
if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with: sudo bash $(basename "$0")" >&2
  exit 1
fi
apt-get update -qq
apt-get install -y libportaudio2 portaudio19-dev
echo "PortAudio installed. Re-run: .venv/bin/python run_gui.py"
