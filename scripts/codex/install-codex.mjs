#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const home = os.homedir();
const pluginName = 'grant-master';
const installRoot = path.join(home, 'plugins');
const installDir = path.join(installRoot, pluginName);
const agentsMarketplacePath = path.join(home, '.agents', 'plugins', 'marketplace.json');
const codexHome = process.env.CODEX_HOME || path.join(home, '.codex');
const codexConfigPath = process.env.CODEX_CONFIG || path.join(codexHome, 'config.toml');
const codexAgentsDir = path.join(codexHome, 'agents', pluginName);
const allowPartialInstall = process.argv.includes('--allow-partial');
const workerModel = process.env.GRANT_MASTER_CODEX_WORKER_MODEL || 'gpt-5.5';

function log(message) {
  process.stdout.write(`${message}\n`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyPlugin() {
  if (path.resolve(repoRoot) === path.resolve(installDir)) {
    log(`Source already matches install directory: ${installDir}`);
    return;
  }

  ensureDir(installRoot);
  fs.rmSync(installDir, { recursive: true, force: true });
  fs.cpSync(repoRoot, installDir, {
    recursive: true,
    dereference: true,
    filter(source) {
      const rel = path.relative(repoRoot, source);
      if (!rel) return true;
      const parts = rel.split(path.sep);
      return !['.git', 'node_modules', 'papers', 'workflow', 'demo', 'tests'].includes(parts[0]);
    },
  });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function installMarketplaceEntry() {
  const marketplace = readJson(agentsMarketplacePath, {
    name: 'personal',
    interface: { displayName: 'Personal' },
    plugins: [],
  });

  marketplace.name = marketplace.name || 'personal';
  marketplace.interface = marketplace.interface || { displayName: 'Personal' };
  marketplace.interface.displayName = marketplace.interface.displayName || 'Personal';
  marketplace.plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];

  const entry = {
    name: pluginName,
    source: {
      source: 'local',
      path: './plugins/grant-master',
    },
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
      products: ['CODEX'],
    },
    category: 'Productivity',
  };

  const index = marketplace.plugins.findIndex((plugin) => plugin?.name === pluginName);
  if (index >= 0) marketplace.plugins[index] = entry;
  else marketplace.plugins.push(entry);

  writeJson(agentsMarketplacePath, marketplace);
}

function writeWorkerConfig(role, contract, boundary) {
  const target = path.join(codexAgentsDir, `${role}.toml`);
  const contractPath = path.join(installDir, 'agents', `${contract}.md`).replaceAll('\\', '\\\\');
  const content = `model = ${JSON.stringify(workerModel)}
sandbox_mode = "workspace-write"

developer_instructions = """
You are the Grant-Master ${role} worker for Codex.

Before acting, read ${contractPath} completely and treat it as your canonical worker contract.
Only process the instruction or batch sheet path assigned by the parent coordinator.
${boundary}
Return a concise structured summary to the parent coordinator.
"""
`;
  fs.writeFileSync(target, content);
}

function removeManagedAgentSections(config) {
  return config
    .replace(/\n?\[agents\.grant_searcher\]\n(?:[^\n]*\n)*?(?=\n\[|$)/g, '\n')
    .replace(/\n?\[agents\.grant_digester\]\n(?:[^\n]*\n)*?(?=\n\[|$)/g, '\n')
    .replace(/\n?\[agents\.grant_writer\]\n(?:[^\n]*\n)*?(?=\n\[|$)/g, '\n');
}

function upsertSimpleKey(config, section, key, value) {
  const escapedSection = section.replaceAll('.', '\\.');
  const sectionRegex = new RegExp(`(^|\\n)(\\[${escapedSection}\\]\\n)([\\s\\S]*?)(?=\\n\\[|$)`);
  const match = config.match(sectionRegex);
  if (!match) return `${config.trimEnd()}\n\n[${section}]\n${key} = ${value}\n`;

  const body = match[3];
  const keyRegex = new RegExp(`^${key}\\s*=.*$`, 'm');
  const nextBody = keyRegex.test(body)
    ? body.replace(keyRegex, `${key} = ${value}`)
    : `${body.trimEnd()}\n${key} = ${value}\n`;
  return config.replace(sectionRegex, `${match[1]}${match[2]}${nextBody}`);
}

function installCodexWorkers() {
  ensureDir(codexAgentsDir);
  ensureDir(path.dirname(codexConfigPath));

  writeWorkerConfig(
    'grant-searcher',
    'searcher',
    'Do not modify workflow/proposal_state.yaml. Do not bypass paywalls, search for Sci-Hub/LibGen-like sources, or download non-open-access PDFs.',
  );
  writeWorkerConfig(
    'grant-digester',
    'digester',
    'Do not update proposal_state.yaml. Do not move PDFs or modify papers/ directories; the coordinator owns file moves.',
  );
  writeWorkerConfig(
    'grant-writer',
    'writer',
    'Do not update proposal_state.yaml or workflow/07_outline/outline_state.yaml; the coordinator owns state updates.',
  );

  let config = fs.existsSync(codexConfigPath) ? fs.readFileSync(codexConfigPath, 'utf8') : '';
  config = removeManagedAgentSections(config);
  config = upsertSimpleKey(config, 'features', 'multi_agent', 'true');
  config = upsertSimpleKey(config, 'agents', 'max_threads', '6');
  config = upsertSimpleKey(config, 'agents', 'max_depth', '1');

  const agentConfig = `
[agents.grant_searcher]
description = "Grant-Master academic search worker. Executes one search instruction sheet and writes local reports/manifests."
config_file = "agents/grant-master/grant-searcher.toml"

[agents.grant_digester]
description = "Grant-Master paper digest worker. Digests one batch instruction sheet and writes paper/batch reports."
config_file = "agents/grant-master/grant-digester.toml"

[agents.grant_writer]
description = "Grant-Master writing worker. Expands one section-writing batch instruction sheet into unit markdown files."
config_file = "agents/grant-master/grant-writer.toml"
`;

  fs.writeFileSync(codexConfigPath, `${config.trimEnd()}\n${agentConfig}`);
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function describeFailure(label, result) {
  const status = result.status === null ? 'not started' : `exit ${result.status}`;
  const error = result.error ? `${result.error.name}: ${result.error.message}` : '';
  const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
  return [`${label}: ${status}`, error, output].filter(Boolean).join('\n');
}

function codexCandidates() {
  const pluginAddArgs = ['plugin', 'add', 'grant-master@personal', '--json'];
  const shellCommand = 'codex plugin add grant-master@personal --json';
  const candidates = [];
  if (process.env.CODEX_CLI_PATH) {
    candidates.push({
      label: `${process.env.CODEX_CLI_PATH} ${pluginAddArgs.join(' ')}`,
      command: process.env.CODEX_CLI_PATH,
      args: pluginAddArgs,
    });
  }

  candidates.push({
    label: `codex ${pluginAddArgs.join(' ')}`,
    command: 'codex',
    args: pluginAddArgs,
  });

  if (process.platform === 'win32') {
    candidates.push({
      label: `codex.cmd ${pluginAddArgs.join(' ')}`,
      command: 'codex.cmd',
      args: pluginAddArgs,
    });
    candidates.push({
      label: `codex.exe ${pluginAddArgs.join(' ')}`,
      command: 'codex.exe',
      args: pluginAddArgs,
    });
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      candidates.push({
        label: `${shell} -Command ${shellCommand}`,
        command: shell,
        args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', shellCommand],
      });
    }
  }

  return candidates;
}

function runCodexPluginAdd() {
  const failures = [];

  for (const candidate of codexCandidates()) {
    const result = runCommand(candidate.command, candidate.args);
    if (result.status === 0) {
      log(result.stdout.trim());
      return true;
    }

    failures.push(describeFailure(candidate.label, result));
  }

  const message = failures.join('\n\n');
  if (allowPartialInstall) {
    log(`codex plugin add failed, but --allow-partial was set. Complete the final step manually:\n\ncodex plugin add grant-master@personal --json\n\n${message}`);
    return false;
  }

  throw new Error(`Grant-Master files were copied and registered, but Codex CLI activation failed. Re-run the installer after Codex CLI is available, or run:\n\ncodex plugin add grant-master@personal --json\n\n${message}`);
}

function main() {
  copyPlugin();
  installMarketplaceEntry();
  installCodexWorkers();
  const cliInstalled = runCodexPluginAdd();

  log('');
  log('Grant-Master Codex install complete.');
  log(`Plugin files: ${installDir}`);
  log(`Personal marketplace: ${agentsMarketplacePath}`);
  log(`Worker roles: ${codexAgentsDir}`);
  log(cliInstalled
    ? 'Restart Codex Desktop or open a new session if Grant Master is not visible yet.'
    : 'Open Codex Desktop -> Plugins -> Personal -> Grant Master -> Install.');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
