$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required to run the Grant-Master installer. Ask Codex to install Node.js first, then rerun scripts/install-codex.ps1."
}

node (Join-Path $RootDir "scripts/codex/install-codex.mjs")
