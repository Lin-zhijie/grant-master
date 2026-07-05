#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run the Grant-Master installer." >&2
  echo "Ask Codex to install Node.js first, then rerun bash scripts/install-codex.sh." >&2
  exit 1
fi

node "${ROOT_DIR}/scripts/codex/install-codex.mjs"
