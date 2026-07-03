# Grant-Master

把中文项目申请书从一次性写作，拆成可审计、可恢复、可迭代的研究与写作流水线。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Codex Plugin](https://img.shields.io/badge/Codex-Plugin-111827.svg)](.codex-plugin/plugin.json)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-5B5FC7.svg)](.claude-plugin/plugin.json)

## Why

申请书不是一个 prompt 能稳定解决的问题。

它需要先理解课题，再做文献调研、论文精读、证据综合、方案收敛、大纲规划、逐段写作、全局审阅，最后再输出 Word 文档。直接让模型“写一份申请书”，很容易得到看起来完整但证据链薄、结构漂移、引用不可追踪的草稿。

Grant-Master 做的是约束这条链路：每一步都有明确输入、输出、质量门禁和磁盘状态。上下文断了可以继续，方向偏了可以回滚，写作前能先看到 evidence ledger、scheme blueprint、writing units，而不是等最终草稿才发现问题。

适合：

- 中文项目申请书初稿：NSFC、校内基金、科研计划书等长文档；
- 新方向调研：从 `topic.md` 生成搜索计划、论文精读报告和领域综合理解；
- 申请书架构设计：把方案拆成章节预算、writing units、图表计划和引用计划。

不适合：

- 无人工审校直接提交；
- 自动生成真实个人基础、团队条件、预算或政策承诺；
- 绕过付费墙下载论文全文。

## See It

仓库内置一个完整 demo，展示从课题到 Word 初稿的运行结果。PDF 原文不随仓库分发，demo 展示的是流程产物和最终草稿。

- [Topic card](demo/workflow/01_topic/01_topic_card.md)：课题初始理解和调研入口；
- [Current view](demo/workflow/05_synthesis/current_view.md)：领域综合理解；
- [Scheme blueprint](demo/workflow/06_helm/scheme_blueprint.yaml)：项目主线和方案收敛；
- [Writing units](demo/workflow/07_outline/writing_units.yaml)：可执行的正文写作单元；
- [Proposal draft](demo/workflow/09_assemble/proposal_draft.md)：组装后的 Markdown 草稿；
- [Review report](demo/workflow/10_review/review_report.md)：全局审阅结果；
- [Final DOCX](demo/workflow/11_output/proposal.docx)：Word 初稿输出。

## Usage

### Install

Grant-Master 是一个 plugin / skill collection。仓库根目录保留了 Codex 和 Claude Code 的 plugin manifest：

- [.codex-plugin/plugin.json](.codex-plugin/plugin.json)
- [.claude-plugin/plugin.json](.claude-plugin/plugin.json)

Codex 中安装时，把仓库作为 Codex plugin 导入即可。安装后在任意申请书项目目录测试：

```text
/grant-master:auto 状态
```

Codex 自动编排依赖本仓库的项目级 multi-agent 配置：

```bash
bash scripts/codex/check-agents.sh
```

该检查会确认 `.codex/config.toml` 已注册 `grant_searcher`、`grant_digester`、`grant_writer` 三个 worker role。若你把 Grant-Master 复制到其他项目或只安装了 skill 文件，需同时保留 `.codex/` 目录；否则 03/04/08 阶段会阻塞，而不会回退到通用 agent。

Claude Code 本地安装可以克隆后复制到本地 skill/plugin 目录：

```bash
git clone <repo-url> grant-master
PLUGIN_DIR="$HOME/.claude/skills/grant-master"
mkdir -p "$PLUGIN_DIR"
cp -a grant-master/. "$PLUGIN_DIR"/
```

基础依赖：

```bash
sudo apt install pandoc curl
```

可选依赖：

```bash
pip install weasyprint python-docx
```

浏览器型学术搜索，如 Google Scholar / CNKI，需要 Node.js 22+、Chrome remote debugging 和本地 CDP Proxy：

```bash
bash scripts/academic-search/check-deps.sh
```

### Start

在你的申请书项目目录中创建 `topic.md`：

```markdown
# 面向高性能分布式训练的网络资源智能调度方法研究

请围绕以下方向生成中文项目申请书：

- 项目类型：青年项目 / 面上项目 / 校内基金
- 研究对象：高性能网络、RDMA、分布式训练
- 希望解决的问题：多租户训练场景下的网络性能隔离与资源调度
- 预期成果：算法、系统原型、实验验证
```

可选补充：

```text
requirements.md          # 申报要求、模板栏目、页数/字数限制、评审偏好
applicant_profile.md     # 申请人基础、论文、项目、平台、团队条件
references/Template.docx # 官方模板或希望沿用的 docx 样式
```

启动协作模式：

```text
/grant-master:auto
```

启动自动模式：

```text
/grant-master:auto --auto
```

第一次使用建议协作模式。关键节点会停下来让你确认：是否继续调研、是否进入方案收敛、是否开始写作、是否输出 docx。

## Workflow

```text
01_topic
  ↓
02_literature_plan → 03_academic_search → 04_paper_digest → 05_synthesis
  ↑                                                              │
  └──────── 调研循环 ────────────────────────────────────────────┘
                                                                  ↓
06_helm
  ↓
07_outline
  ↓
08_section_write  ←──── 10_review 发现 P0 问题后回写
  ↓
09_assemble
  ↓
10_review
  ↓
11_output
```

常用命令：

```text
/grant-master:auto              # 从当前状态推进
/grant-master:auto --auto       # 自动推进直到完成或阻塞
/grant-master:auto 状态         # 查看进度
/grant-master:auto 继续         # 从中断处续跑
/grant-master:auto 继续调研     # 强制进入下一轮调研
/grant-master:auto 进入方案     # 从 synthesis 进入 helm
/grant-master:auto 审阅         # 触发 assemble + review
/grant-master:auto 输出         # 审阅通过后生成 docx
```

也可以手动调用单阶段：

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

Grant-Master 在你执行命令的项目目录中写入 `workflow/`：

```text
workflow/
├── proposal_state.yaml
├── 03_academic_search/     # 搜索报告、候选论文、下载状态
├── 04_paper_digest/        # 精读报告、paper index
├── 05_synthesis/           # current view、evidence ledger
├── 06_helm/                # scheme blueprint、decision log
├── 07_outline/             # outline、volume budget、writing units
├── 08_section_write/       # unit 正文
├── 09_assemble/            # proposal_draft.md / pdf
├── 10_review/              # P0/P1/P2 审阅结果
└── 11_output/              # proposal.docx
```

`auto` 只在验证阶段产物存在且非空后更新状态。完整契约见 [docs/workflow-contract.md](docs/workflow-contract.md)。

## Safety

Grant-Master 只允许自动下载合法开放全文，包括 arXiv、PubMed Central、Semantic Scholar `openAccessPdf`、OpenAlex、Unpaywall、出版商明确开放的 PDF，以及用户手动放入 `papers/inbox/` 的本地文件。

对需要机构权限或无公开开放全文的论文，系统只记录 DOI、论文链接、开放获取状态和合法获取建议，不自动下载，也不搜索、访问、推荐或使用 Sci-Hub、LibGen 等绕过付费墙的来源。

浏览器型搜索会通过 CDP Proxy 控制本机 Chrome，可能继承浏览器登录态。不要暴露 `127.0.0.1` 本地代理端口，不要在不可信环境运行浏览器自动化，也不要提交 cookie、session、截图、日志、未授权 PDF 或其他敏感文件。

更完整的合规规则见 [docs/compliance.md](docs/compliance.md) 和 [references/academic-search/search-protocol.md](references/academic-search/search-protocol.md)。

## Development

轻量检查：

```bash
git diff --check
bash -n scripts/academic-search/check-deps.sh
bash -n scripts/academic-search/self-test.sh
node --check scripts/academic-search/cdp-proxy.mjs
node --check scripts/academic-search/oa-pdf-download.mjs
node --test tests/**/*.test.mjs
```

学术搜索模块参考并改造自 [ustc-ai4science/academic-search](https://github.com/ustc-ai4science/academic-search)。第三方声明见 [docs/third-party-notices.md](docs/third-party-notices.md)。

## License

MIT License. See [LICENSE](LICENSE).
