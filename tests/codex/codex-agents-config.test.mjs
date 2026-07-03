import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

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

test('Codex worker roles inherit the user configured model', () => {
  const rolePaths = [
    '.codex/agents/grant-searcher.toml',
    '.codex/agents/grant-digester.toml',
    '.codex/agents/grant-writer.toml',
  ];

  for (const rolePath of rolePaths) {
    const role = readProjectFile(rolePath);

    assert.doesNotMatch(role, /^model\s*=/m, rolePath);
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
});
