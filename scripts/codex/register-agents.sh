#!/usr/bin/env bash
# Register Grant-Master Codex worker roles in the user's Codex config.
#
# Desktop/plugin installs load skills from the plugin cache, but proposal work
# usually runs from another project directory. User-level registration keeps the
# worker roles visible regardless of the current proposal workspace.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
CODEX_CONFIG="${CODEX_CONFIG:-${CODEX_HOME}/config.toml}"
AGENT_DIR="${CODEX_HOME}/agents/grant-master"
WORKER_MODEL="${GRANT_MASTER_CODEX_WORKER_MODEL:-gpt-5.5}"

mkdir -p "${AGENT_DIR}"
touch "${CODEX_CONFIG}"

write_agent() {
  local role="$1"
  local contract="$2"
  local boundary="$3"
  local target="${AGENT_DIR}/${role}.toml"

  cat > "${target}" <<EOF
model = "${WORKER_MODEL}"
sandbox_mode = "workspace-write"

developer_instructions = """
You are the Grant-Master ${role} worker for Codex.

Before acting, read ${ROOT_DIR}/agents/${contract}.md completely and treat it as your canonical worker contract.
Only process the instruction or batch sheet path assigned by the parent coordinator.
${boundary}
Return a concise structured summary to the parent coordinator.
"""
EOF
}

write_agent "grant-searcher" "searcher" "Do not modify workflow/proposal_state.yaml. Do not bypass paywalls, search for Sci-Hub/LibGen-like sources, or download non-open-access PDFs."
write_agent "grant-digester" "digester" "Do not update proposal_state.yaml. Do not move PDFs or modify papers/ directories; the coordinator owns file moves."
write_agent "grant-writer" "writer" "Do not update proposal_state.yaml or workflow/07_outline/outline_state.yaml; the coordinator owns state updates."

tmp_config="$(mktemp "${CODEX_CONFIG}.tmp.XXXXXX")"

awk '
  BEGIN {
    in_features = 0
    in_agents = 0
    saw_features = 0
    saw_agents = 0
    wrote_multi_agent = 0
    wrote_max_threads = 0
    wrote_max_depth = 0
  }

  function finish_features() {
    if (in_features && !wrote_multi_agent) {
      print "multi_agent = true"
      wrote_multi_agent = 1
    }
    in_features = 0
  }

  function finish_agents() {
    if (in_agents) {
      if (!wrote_max_threads) print "max_threads = 6"
      if (!wrote_max_depth) print "max_depth = 1"
    }
    in_agents = 0
  }

  /^\[/ {
    finish_features()
    finish_agents()
    in_features = ($0 == "[features]")
    in_agents = ($0 == "[agents]")
    if (in_features) saw_features = 1
    if (in_agents) saw_agents = 1
  }

  in_features && /^[[:space:]]*multi_agent[[:space:]]*=/ {
    print "multi_agent = true"
    wrote_multi_agent = 1
    next
  }

  in_agents && /^[[:space:]]*max_threads[[:space:]]*=/ {
    print "max_threads = 6"
    wrote_max_threads = 1
    next
  }

  in_agents && /^[[:space:]]*max_depth[[:space:]]*=/ {
    print "max_depth = 1"
    wrote_max_depth = 1
    next
  }

  /^\[agents\.grant_searcher\]/ { skip = 1; next }
  /^\[agents\.grant_digester\]/ { skip = 1; next }
  /^\[agents\.grant_writer\]/ { skip = 1; next }
  /^\[/ && skip { skip = 0 }
  skip { next }

  { print }

  END {
    finish_features()
    finish_agents()
    if (!saw_features) {
      print ""
      print "[features]"
      print "multi_agent = true"
    }
    if (!saw_agents) {
      print ""
      print "[agents]"
      print "max_threads = 6"
      print "max_depth = 1"
    }
  }
' "${CODEX_CONFIG}" > "${tmp_config}"

cat >> "${tmp_config}" <<EOF

[agents.grant_searcher]
description = "Grant-Master academic search worker. Executes one search instruction sheet and writes local reports/manifests."
config_file = "agents/grant-master/grant-searcher.toml"

[agents.grant_digester]
description = "Grant-Master paper digest worker. Digests one batch instruction sheet and writes paper/batch reports."
config_file = "agents/grant-master/grant-digester.toml"

[agents.grant_writer]
description = "Grant-Master writing worker. Expands one section-writing batch instruction sheet into unit markdown files."
config_file = "agents/grant-master/grant-writer.toml"
EOF

mv "${tmp_config}" "${CODEX_CONFIG}"

echo "grant-master agents registered in ${CODEX_CONFIG}"
echo "generated worker configs in ${AGENT_DIR}"
