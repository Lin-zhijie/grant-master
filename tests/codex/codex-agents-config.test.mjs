import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Codex plugin manifest includes desktop install metadata', () => {
  const manifest = JSON.parse(readProjectFile('.codex-plugin/plugin.json'));

  assert.equal(manifest.name, 'grant-master');
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.homepage, 'https://github.com/Lin-zhijie/grant-master');
  assert.equal(manifest.repository, 'https://github.com/Lin-zhijie/grant-master');
  assert.equal(manifest.interface.websiteURL, 'https://github.com/Lin-zhijie/grant-master');
  assert.equal(manifest.interface.privacyPolicyURL, 'https://github.com/Lin-zhijie/grant-master/blob/main/SECURITY.md');
  assert.equal(manifest.interface.termsOfServiceURL, 'https://github.com/Lin-zhijie/grant-master/blob/main/LICENSE');
  assert.equal(manifest.interface.composerIcon, './assets/grant-master.svg');
  assert.equal(manifest.interface.logo, './assets/app-icon.png');
  assert.deepEqual(manifest.interface.screenshots, []);
  assert.ok(fs.existsSync(path.join(repoRoot, 'assets/grant-master.svg')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'assets/app-icon.png')));
});

test('Codex installer performs complete one-step desktop setup', () => {
  const installer = readProjectFile('scripts/codex/install-codex.mjs');

  assert.match(installer, /plugins['"]?\)/);
  assert.match(installer, /marketplace\.json/);
  assert.match(installer, /grant-master@personal/);
  assert.match(installer, /agents\.grant_searcher/);
  assert.match(installer, /agents\.grant_digester/);
  assert.match(installer, /agents\.grant_writer/);
  assert.match(installer, /CODEX_CLI_PATH/);
  assert.match(installer, /codex\.cmd/);
  assert.match(installer, /codex\.exe/);
  assert.match(installer, /powershell\.exe/);
  assert.match(installer, /pwsh\.exe/);
  assert.match(installer, /--allow-partial/);
  assert.match(installer, /throw new Error/);
  assert.match(installer, /process\.exitCode = 1/);
});

test('Codex installer accepts BOM-prefixed marketplace JSON', () => {
  const installer = readProjectFile('scripts/codex/install-codex.mjs');

  assert.match(installer, /replace\(\s*\/\^\\uFEFF\//);
});

test('Codex multi-agent config registers all Grant-Master workers', () => {
  const config = readProjectFile('.codex/config.toml');

  assert.match(config, /\[features\][\s\S]*multi_agent\s*=\s*true/);
  assert.match(config, /\[agents\.grant_searcher\][\s\S]*config_file\s*=\s*"agents\/grant-searcher\.toml"/);
  assert.match(config, /\[agents\.grant_digester\][\s\S]*config_file\s*=\s*"agents\/grant-digester\.toml"/);
  assert.match(config, /\[agents\.grant_writer\][\s\S]*config_file\s*=\s*"agents\/grant-writer\.toml"/);
});

test('Codex Grant-Master worker roles point back to canonical worker contracts', () => {
  const roles = [
    ['.codex/agents/grant-searcher.toml', 'agents/searcher.md', 'Do not bypass paywalls'],
    ['.codex/agents/grant-digester.toml', 'agents/digester.md', 'Do not update proposal_state.yaml'],
    ['.codex/agents/grant-writer.toml', 'agents/writer.md', 'Do not update proposal_state.yaml'],
  ];

  for (const [rolePath, contractPath, requiredBoundary] of roles) {
    const role = readProjectFile(rolePath);

    assert.match(role, /sandbox_mode\s*=\s*"workspace-write"/, rolePath);
    assert.match(role, new RegExp(contractPath.replaceAll('/', '\\/')), rolePath);
    assert.match(role, new RegExp(requiredBoundary, 'i'), rolePath);
  }
});

test('Codex worker roles declare an explicit child model', () => {
  const rolePaths = [
    '.codex/agents/grant-searcher.toml',
    '.codex/agents/grant-digester.toml',
    '.codex/agents/grant-writer.toml',
  ];

  for (const rolePath of rolePaths) {
    const role = readProjectFile(rolePath);

    assert.match(role, /^model\s*=\s*"gpt-5\.5"/m, rolePath);
    assert.doesNotMatch(role, /^model_reasoning_effort\s*=/m, rolePath);
  }
});

test('Codex agent check script documents the required worker role files', () => {
  const script = readProjectFile('scripts/codex/check-agents.sh');

  assert.match(script, /grant_searcher/);
  assert.match(script, /grant_digester/);
  assert.match(script, /grant_writer/);
  assert.match(script, /\.codex\/agents\/grant-searcher\.toml/);
  assert.match(script, /\.codex\/agents\/grant-digester\.toml/);
  assert.match(script, /\.codex\/agents\/grant-writer\.toml/);
  assert.match(script, /register-agents\.sh/);
});

test('Codex agent registration script installs all user-level worker roles', () => {
  const script = readProjectFile('scripts/codex/register-agents.sh');

  assert.match(script, /CODEX_CONFIG/);
  assert.match(script, /CODEX_HOME/);
  assert.match(script, /agents\.grant_searcher/);
  assert.match(script, /agents\.grant_digester/);
  assert.match(script, /agents\.grant_writer/);
  assert.match(script, /grant-searcher\.toml/);
  assert.match(script, /grant-digester\.toml/);
  assert.match(script, /grant-writer\.toml/);
  assert.match(script, /GRANT_MASTER_CODEX_WORKER_MODEL/);
  assert.match(script, /multi_agent = true/);
});
