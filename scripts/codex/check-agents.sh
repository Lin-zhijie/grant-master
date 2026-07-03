#!/usr/bin/env bash
# Verify Grant-Master worker agents are registered for BOTH hosts:
#   - Codex multi-agent : .codex/config.toml + .codex/agents/*.toml
#   - Claude Code plugin: .claude-plugin/plugin.json `agents` array + agents/*.md
# A coordinator skill (auto/03/04/08) that cannot confirm a worker is registered
# must generate a blocked result and point the user here.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_CONFIG="${ROOT_DIR}/.codex/config.toml"
CLAUDE_PLUGIN="${ROOT_DIR}/.claude-plugin/plugin.json"
ERRORS=0

err() { echo "  ✗ $1" >&2; ERRORS=$((ERRORS + 1)); }
ok()  { echo "  ✓ $1"; }

check_file() {
  if [ -f "$1" ]; then ok "$2: ${1#${ROOT_DIR}/}"; else err "missing $2: ${1#${ROOT_DIR}/}"; fi
}
check_pattern() {
  if grep -Eq "$2" "$1" 2>/dev/null; then ok "$3"; else err "${1#${ROOT_DIR}/}: $3"; fi
}

echo "=== Codex multi-agent ==="
check_file     "${CODEX_CONFIG}"                                              "config.toml"
check_pattern  "${CODEX_CONFIG}" 'multi_agent[[:space:]]*=[[:space:]]*true'   "multi_agent=true"
check_pattern  "${CODEX_CONFIG}" '\[agents\.grant_searcher\]'                 "role grant_searcher"
check_pattern  "${CODEX_CONFIG}" '\[agents\.grant_digester\]'                 "role grant_digester"
check_pattern  "${CODEX_CONFIG}" '\[agents\.grant_writer\]'                   "role grant_writer"
check_file     "${ROOT_DIR}/.codex/agents/grant-searcher.toml"  "searcher toml"
check_file     "${ROOT_DIR}/.codex/agents/grant-digester.toml"  "digester toml"
check_file     "${ROOT_DIR}/.codex/agents/grant-writer.toml"    "writer toml"
check_pattern  "${ROOT_DIR}/.codex/agents/grant-searcher.toml" 'agents/searcher\.md' "searcher.toml → searcher.md"
check_pattern  "${ROOT_DIR}/.codex/agents/grant-digester.toml" 'agents/digester\.md' "digester.toml → digester.md"
check_pattern  "${ROOT_DIR}/.codex/agents/grant-writer.toml"   'agents/writer\.md'   "writer.toml → writer.md"

echo "=== Claude Code plugin ==="
check_file     "${CLAUDE_PLUGIN}"                                  "plugin.json"
check_pattern  "${CLAUDE_PLUGIN}" '"agents"'                       "plugin.json declares agents array"
check_pattern  "${CLAUDE_PLUGIN}" 'agents/searcher\.md'            "agents/searcher.md listed"
check_pattern  "${CLAUDE_PLUGIN}" 'agents/digester\.md'            "agents/digester.md listed"
check_pattern  "${CLAUDE_PLUGIN}" 'agents/writer\.md'              "agents/writer.md listed"
check_file     "${ROOT_DIR}/agents/searcher.md"  "searcher agent"
check_file     "${ROOT_DIR}/agents/digester.md"  "digester agent"
check_file     "${ROOT_DIR}/agents/writer.md"    "writer agent"
check_pattern  "${ROOT_DIR}/agents/searcher.md" '^name:[[:space:]]*grant-searcher' "searcher.md name=grant-searcher"
check_pattern  "${ROOT_DIR}/agents/digester.md" '^name:[[:space:]]*grant-digester' "digester.md name=grant-digester"
check_pattern  "${ROOT_DIR}/agents/writer.md"   '^name:[[:space:]]*grant-writer'   "writer.md name=grant-writer"

echo ""
if [ "${ERRORS}" -gt 0 ]; then
  echo "FAILED: ${ERRORS} problem(s) above. Fix before dispatching workers." >&2
  exit 1
fi
echo "grant-master agents: ok (codex + claude)"
