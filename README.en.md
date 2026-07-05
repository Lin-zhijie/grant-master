# Grant-Master

Turn Chinese grant proposal writing into an auditable, recoverable, and iterative research-to-draft workflow.

English | [中文](README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Codex Plugin](https://img.shields.io/badge/Codex-Plugin-111827.svg)](.codex-plugin/plugin.json)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-5B5FC7.svg)](.claude-plugin/plugin.json)

## Why

A grant proposal is not something a single prompt can solve reliably.

It needs topic framing, literature planning, academic search, paper digestion, evidence synthesis, scheme convergence, outline planning, section writing, global review, and Word output. Asking a model to "write a proposal" often produces a fluent draft with weak evidence, drifting structure, and citations that are hard to audit.

Grant-Master constrains the whole chain. Every stage has explicit inputs, outputs, quality gates, and disk state. If context is lost, the workflow can resume. If direction is wrong, it can be corrected from intermediate artifacts. Before writing the final draft, you can inspect the evidence ledger, scheme blueprint, and writing units.

Best for:

- Chinese grant proposal drafts, including NSFC, university funds, and research plans;
- entering a new research area through structured literature search and synthesis;
- proposal architecture, including volume budgets, writing units, figure/table plans, and citation plans.

Not for:

- submitting generated text without human review;
- fabricating applicant background, team conditions, budgets, or policy commitments;
- bypassing paywalls to obtain papers.

## See It

The repository includes a complete demo run from topic to Word draft. Source PDFs are not distributed; the demo shows workflow artifacts and the final generated draft.

- [Topic card](demo/workflow/01_topic/01_topic_card.md): initial topic understanding and research entry point;
- [Current view](demo/workflow/05_synthesis/current_view.md): synthesized domain understanding;
- [Scheme blueprint](demo/workflow/06_helm/scheme_blueprint.yaml): converged proposal direction;
- [Writing units](demo/workflow/07_outline/writing_units.yaml): executable writing units;
- [Proposal draft](demo/workflow/09_assemble/proposal_draft.md): assembled Markdown draft;
- [Review report](demo/workflow/10_review/review_report.md): global review output;
- [Final DOCX](demo/workflow/11_output/proposal.docx): generated Word draft.

If you want a Kami-style preview gallery, add three screenshots: a `current_view.md` excerpt, an `outline_blueprint.yaml` / `writing_units.yaml` excerpt, and the first screen of the final `proposal.docx`.

## Usage

### Install

#### Codex

Let Codex install the plugin for you. Start a new Codex conversation and send this request:

```text
Please install the Grant-Master Codex plugin from https://github.com/Lin-zhijie/grant-master. Clone the repository, run scripts/install-codex.sh, or scripts/install-codex.ps1 on Windows, and tell me whether installation succeeded.
```

If you have already cloned the repository, run this from the repository root:

```bash
bash scripts/install-codex.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-codex.ps1
```

For detailed installation behavior and troubleshooting, see the Chinese [Codex Desktop install guide](docs/install-codex.md).

After installation, test it in any proposal workspace:

```text
/grant-master:auto 状态
```

#### Claude Code CLI

Download or clone the project:

```bash
git clone <repo-url> grant-master
```

Create an empty plugin at `~/.claude/skills/grant-master`:

```bash
claude plugin init grant-master
```

Then move all files from this project into the newly created plugin.

#### Dependencies

```bash
sudo apt install pandoc curl
```

Optional dependencies:

```bash
pip install weasyprint python-docx
```

Browser-based academic search, such as Google Scholar or CNKI, requires Node.js 22+, Chrome remote debugging, and the local CDP proxy:

```bash
bash scripts/academic-search/check-deps.sh
```

### Start

Create a `topic.md` file in your proposal workspace:

```markdown
# Research on Intelligent Network Resource Scheduling for High-Performance Distributed Training

Please generate a Chinese grant proposal around:

- Project type: youth project / general project / university fund
- Research object: high-performance networking, RDMA, distributed training
- Problem: network performance isolation and resource scheduling in multi-tenant training
- Expected output: algorithms, system prototype, experimental validation
```

Optional context:

```text
requirements.md          # call requirements, section rules, page/word limits
applicant_profile.md     # applicant background, papers, projects, platforms
references/Template.docx # official template or target Word style
```

Start collaborative mode:

```text
/grant-master:auto
```

Start automatic mode:

```text
/grant-master:auto --auto
```

Use collaborative mode for the first run. It pauses at key points so you can confirm whether to continue research, converge the scheme, start writing, or export DOCX.

## Workflow

```text
01_topic
  ↓
02_literature_plan → 03_academic_search → 04_paper_digest → 05_synthesis
  ↑                                                              │
  └──────── research loop ───────────────────────────────────────┘
                                                                  ↓
06_helm
  ↓
07_outline
  ↓
08_section_write  ←──── 10_review routes P0 issues back here
  ↓
09_assemble
  ↓
10_review
  ↓
11_output
```

Common commands:

```text
/grant-master:auto              # continue from current state
/grant-master:auto --auto       # run until completed or blocked
/grant-master:auto 状态         # show progress
/grant-master:auto 继续         # resume
/grant-master:auto 继续调研     # force another research round
/grant-master:auto 进入方案     # move from synthesis to scheme planning
/grant-master:auto 审阅         # assemble and review
/grant-master:auto 输出         # export DOCX after review passes
```

Manual stage commands:

```text
/grant-master:01-topic
/grant-master:02-literature-plan
/grant-master:03-academic-search
/grant-master:04-paper-digest
/grant-master:05-synthesis
/grant-master:06-helm
/grant-master:07-outline
/grant-master:08-section-write
/grant-master:09-assemble
/grant-master:10-review
/grant-master:11-output
```

## Output

Grant-Master writes outputs to `workflow/` in the workspace where you run it:

```text
workflow/
├── proposal_state.yaml
├── 03_academic_search/     # search reports, candidates, download state
├── 04_paper_digest/        # paper digests, paper index
├── 05_synthesis/           # current view, evidence ledger
├── 06_helm/                # scheme blueprint, decision log
├── 07_outline/             # outline, volume budget, writing units
├── 08_section_write/       # unit drafts
├── 09_assemble/            # proposal_draft.md / pdf
├── 10_review/              # P0/P1/P2 review output
└── 11_output/              # proposal.docx
```

`auto` updates state only after required stage outputs exist and are non-empty. See [docs/workflow-contract.md](docs/workflow-contract.md).

## Safety

Grant-Master only downloads legally accessible open full text, including arXiv, PubMed Central, Semantic Scholar `openAccessPdf`, OpenAlex, Unpaywall, publisher-marked open PDFs, and local PDFs manually placed in `papers/inbox/`.

For papers that require institutional access or have no confirmed open full text, the workflow records DOI, source URL, open-access status, and legal access suggestions. It does not download them, search for paywall bypasses, or use Sci-Hub, LibGen, or similar sources.

Browser-based search uses a local CDP proxy to control Chrome and may inherit browser login state. Do not expose the `127.0.0.1` proxy port, do not run browser automation in untrusted environments, and do not commit cookies, sessions, screenshots, logs, unauthorized PDFs, or sensitive files.

See [docs/compliance.md](docs/compliance.md) and [references/academic-search/search-protocol.md](references/academic-search/search-protocol.md).

## Development

Lightweight checks:

```bash
git diff --check
bash -n scripts/academic-search/check-deps.sh
bash -n scripts/academic-search/self-test.sh
node --check scripts/academic-search/cdp-proxy.mjs
node --check scripts/academic-search/oa-pdf-download.mjs
node --test tests/**/*.test.mjs
```

The academic search module adapts ideas from [ustc-ai4science/academic-search](https://github.com/ustc-ai4science/academic-search). See [docs/third-party-notices.md](docs/third-party-notices.md).

## License

MIT License. See [LICENSE](LICENSE).
