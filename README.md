# Grant-Master

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-5B5FC7.svg)](.claude-plugin/plugin.json)

Grant-Master 是一个中文项目申请书全流程写作工具链。它将“课题理解、文献调研、论文精读、领域综合、方案收敛、大纲规划、正文写作、组装审阅、docx 输出”拆成 11 个阶段，并用 `auto` 进行状态管理和断点续跑。

> [!IMPORTANT]
> 本工具仅用于项目申请前期的调研整理、方案推演和初版申请书生成，不能作为可直接提交的最终申请书生成器。正式提交前，使用者必须自行进行严格审查，包括但不限于事实核验、引用核验、政策合规、格式要求、个人/团队基础真实性和学术伦理审查。因使用本工具生成内容而产生的任何错误、遗漏、争议、合规风险或申报后果，均由使用者自行承担。

## 目录

- [项目亮点](#项目亮点)
- [适合做什么](#适合做什么)
- [安装](#安装)
- [快速开始](#快速开始)
- [Demo](#demo)
- [工作流总览](#工作流总览)
- [常用命令](#常用命令)
- [项目目录结构](#项目目录结构)
- [关键产物](#关键产物)
- [配置建议](#配置建议)
- [常见问题](#常见问题)
- [合规边界](#合规边界)
- [安全声明](#安全声明)
- [后续优化](#后续优化)
- [致谢](#致谢)
- [贡献与许可证](#贡献与许可证)

## 项目亮点

### 一句话启动一套申请书流水线

Grant-Master 不是单次“帮我写一份申请书”的 prompt，而是一套可审计、可回滚、可继续的工作流。它会先理解课题，再做多轮文献调研和论文精读，随后收敛技术路线、规划大纲、拆分 writing units，最后逐单元写作并组装成完整草稿。

### 任意时刻断点恢复

所有阶段产物都会写入项目根目录下的 `workflow/`。当上下文过长、模型切换或会话中断时，只要在同一个项目目录重新调用：

```text
/grant-master:auto 继续
```

`auto` 会读取 `workflow/proposal_state.yaml` 和各阶段 result 文件，从最近的可信状态继续推进。

### 适合作为科研助手

Grant-Master 的前 6 个阶段本质上是一套领域调研流程：从课题种子出发，规划搜索、下载候选论文、精读论文、积累证据账本，并形成领域理解。即使你暂时不写申请书，也可以把它当作“进入新领域的研究助理”。

## 适合做什么

| 场景 | 推荐程度 | 说明 |
|---|---:|---|
| 中文项目申请书初稿 | 高 | 尤其适合 NSFC、校内项目、科研计划书等长文档 |
| 新方向快速调研 | 高 | 03-05 阶段会保留论文、精读报告和 evidence ledger |
| 申请书大纲与体量规划 | 高 | 07 会生成章节预算、writing units、图表和引用规划 |
| 最终无审校直接提交 | 不推荐 | 需要人工核对政策、预算、团队基础、引用真实性 |
| 英文 grant proposal | 可尝试 | 当前写作风格和模板主要面向中文申请书 |

## 安装

### 环境依赖

基础依赖：

```bash
sudo apt install pandoc curl
```

可选依赖：

```bash
pip install weasyprint        # 用于 09-assemble 的 PDF 预览输出
pip install python-docx       # 用于 docx 样式检查或后处理
```

文献搜索增强依赖：

```bash
# Google Scholar / CNKI 等浏览器型搜索需要 Node.js 22+ 和 Chrome remote debugging
bash scripts/academic-search/check-deps.sh
```

### Codex 安装

如果你使用 Codex，最简单的方式是把本仓库链接直接发给 Codex，并说明：

```text
请把这个仓库作为 Codex plugin 安装：<repo-url>
```

Codex 会读取仓库中的 `.codex-plugin/plugin.json`，并按 plugin 结构安装 Grant-Master。安装完成后，在任意申请书项目目录中测试：

```text
/grant-master:auto 状态
```

如果可以触发 `grant-master:auto`，说明安装成功。

### Claude Code 本地安装

Grant-Master 目前以 Claude Code plugin/skill 组的形式组织，暂时尚未发布到 Marketplace，可以手动安装：

```bash
# 1. 克隆本仓库
git clone <repo-url> grant-master

# 2. 初始化 Claude Code plugin 目录
claude plugin init grant-master

# 3. 将本仓库内容复制到 plugin 目录
#    如果该目录已有重要内容，请先手动备份；下面命令不会删除额外文件
PLUGIN_DIR="$HOME/.claude/skills/grant-master"
cp -a grant-master/. "$PLUGIN_DIR"/
```

安装后，在 Claude Code 中测试：

```text
/grant-master:auto 状态
```

如果可以触发 `auto`，说明安装成功。

## 快速开始

### 1. 创建一个申请书项目目录

```bash
mkdir my-proposal
cd my-proposal
```

### 2. 写入课题描述

创建 `topic.md`：

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
references/Template.docx # 官方申请书模板或你希望沿用的 docx 样式
```

### 3. 启动自动流程

协作模式：

```text
/grant-master:auto
```

自动模式：

```text
/grant-master:auto --auto
```

推荐第一次使用协作模式。它会在关键节点向你汇报状态，适合人工调整方向、确认是否继续调研、是否进入方案收敛。

## Demo

仓库内置 [demo/](demo/) 示例，展示了一次完整自动模式 workflow 的运行结果。该 demo 使用最小调研轮数 1 轮、目标约 10000 字的设置，`workflow/` 中所有内容均由一轮自动模式对话直接生成，全程大约 1 小时，没有追加任何额外指令。出于版权和体积考虑，论文 PDF 未随仓库分发；demo 展示的是流程记录和最终 docx，不是可重新精读 PDF 的完整归档。

建议优先查看：

- [demo/workflow/05_synthesis/current_view.md](demo/workflow/05_synthesis/current_view.md)：领域综合理解，适合快速学习新方向；
- [demo/workflow/07_outline/outline_blueprint.yaml](demo/workflow/07_outline/outline_blueprint.yaml)：申请书大纲蓝图和后续人工迭代入口；更细的正文拆解可看 [demo/workflow/07_outline/writing_units.yaml](demo/workflow/07_outline/writing_units.yaml)；
- `demo/workflow/11_output/proposal.docx`：最终 Word 初稿。

如果只是学习方向，可以跑到 `06-helm` 就停止；如果用于申请书写作，请把 demo 输出理解为初稿，后续仍应多轮修改大纲和正文内容。

## 工作流总览

```text
01_topic          课题初始理解
  ↓
02_literature_plan → 03_academic_search → 04_paper_digest → 05_synthesis
  ↑                                                              │
  └──────── 调研循环（可回环多轮）───────────────────────────────┘
                                                                  ↓
06_helm           整体方案规划与主线收敛
  ↓
07_outline        内容架构 + 体量预算 + 图/表/引用规划
  ↓
08_section_write  逐 unit 写作（并行 writer agents）←──────────┐
  ↓                                                            │
09_assemble       合并组装 + 引用编号 + PDF 预览                 │
  ↓                                                            │
10_review         全局审阅 ──── P0 > 0 ────────────────────────┘
  ↓
11_output         md → docx 输出
```

| 阶段 | 名称 | 做什么 | 主要输出 |
|---|---|---|---|
| 01 | topic | 理解课题、生成调研种子 | `01_topic_card.md` |
| 02 | literature-plan | 规划一轮文献搜索任务 | `search_queries.yaml` |
| 03 | academic-search | 并行搜索、下载、去重候选论文 | `candidate_papers.md`, `search_results.yaml` |
| 04 | paper-digest | 精读论文并生成论文索引 | `digest_report.md`, `paper_index.yaml` |
| 05 | synthesis | 综合领域问题、证据和 gap | `current_view.md`, `evidence_ledger.yaml` |
| 06 | helm | 收敛申请书主问题和技术路线 | `scheme_blueprint.yaml`, `helm_report.md` |
| 07 | outline | 生成大纲、体量、writing units | `outline_report.md`, `writing_units.yaml` |
| 08 | section-write | 按 unit 并行写正文 | `workflow/08_section_write/units/*.md` |
| 09 | assemble | 合并正文、统一标题和引用 | `proposal_draft.md`, `assemble_report.md` |
| 10 | review | 全局审阅，标记 P0/P1/P2 问题 | `review_report.md` |
| 11 | output | 使用 reference docx 输出最终文档 | `proposal.docx` |

## 常用命令

作为插件整体使用时，推荐显式带上插件名：

```text
/grant-master:auto              # 协作模式，从当前状态推进
/grant-master:auto --auto       # 自动模式，连续推进直到完成或阻塞
/grant-master:auto 状态         # 查看进度
/grant-master:auto 继续         # 从中断处续跑
/grant-master:auto 继续调研     # 强制进入下一轮 02-05 调研循环
/grant-master:auto 进入方案     # 在已有 synthesis 基础上进入 06-helm
/grant-master:auto 审阅         # 触发 09-assemble → 10-review
/grant-master:auto 输出         # 10-review 通过后生成 docx
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

> 如果你是以裸 skill 目录方式安装，而不是 plugin 方式安装，命令前缀可能是 `/auto`、`/01-topic` 这类短名称。以本地 Claude Code 实际提示为准。

## 项目目录结构

Grant-Master 在你执行命令的项目目录中读写文件。最小输入只需要 `topic.md`：

```text
./
├── topic.md                         # 必需：课题描述
├── requirements.md                  # 可选：申报指南、页数、字数、格式要求
├── applicant_profile.md             # 可选：申请人/团队基础、论文、平台条件
├── references/
│   └── Template.docx                # 可选：官方模板或目标 docx 样式
├── papers/
│   ├── inbox/                       # 03 下载、04 待精读论文
│   └── proceeded/                   # 04 已精读论文
└── workflow/
    ├── proposal_state.yaml          # auto 状态文件
    ├── 01_topic/
    ├── 02_literature_plan/
    ├── 03_academic_search/
    ├── 04_paper_digest/
    ├── 05_synthesis/
    ├── 06_helm/
    ├── 07_outline/
    ├── 08_section_write/
    ├── 09_assemble/
    ├── 10_review/
    └── 11_output/
```

## 关键产物

### 调研与证据

```text
workflow/03_academic_search/round_XX/
├── search_summary.md
├── candidate_papers.md
└── search_results.yaml

workflow/04_paper_digest/
├── round_XX/digest_report.md
└── paper_index.yaml

workflow/05_synthesis/
├── current_view.md
├── evidence_ledger.yaml
└── latest_result.yaml
```

### 方案、大纲与写作计划

```text
workflow/06_helm/
├── helm_report.md
├── scheme_blueprint.yaml
└── decision_log.md

workflow/07_outline/
├── outline_report.md
├── volume_budget.yaml
├── writing_units.yaml
├── source_allocation.yaml
├── figure_plan.yaml
├── table_plan.yaml
├── citation_plan.yaml
├── outline_state.yaml
└── context_bundle.yaml
```

### 草稿与输出

```text
workflow/08_section_write/units/      # 每个 writing unit 一个正文文件
workflow/09_assemble/proposal_draft.md
workflow/09_assemble/proposal_draft.pdf
workflow/10_review/review_report.md
workflow/11_output/proposal.docx
```

## 配置建议

### 指定目标字数或页数

最稳妥的方式是在启动前写入 `requirements.md`：

```markdown
# 申报要求

- 项目类型：青年项目
- 正文字数：约 25000 字
- 页数：不超过 35 页
- 章节：立项依据、研究内容、研究方案、创新点、可行性、年度计划、预期成果
- 格式：以 references/Template.docx 为准
```

也可以在启动指令里直接说明：

```text
/grant-master:auto 本次申请书目标 25000 字，至少调研 3 轮，最多 5 轮，先用协作模式推进
```

07-outline 会把目标体量转成 `volume_budget.yaml` 和各 writing unit 的 `target_words`。

### 指定最少调研轮数

`auto` 默认支持 `min_rounds` / `max_rounds` 约束。建议在第一次启动时说清楚：

```text
/grant-master:auto --auto 至少完成 2 轮文献调研，若证据不足最多调研 5 轮
```

如果中途觉得证据不够，可以随时说：

```text
/grant-master:auto 继续调研
```

### 使用自己的 docx 模板

把模板放到：

```text
references/Template.docx
```

11-output 会检查 `Normal`、`Heading1`、`Heading2`、`Heading3`、`Heading4` 等 pandoc 所需样式。模板缺失或样式不完整时，会使用插件内置 `skills/11-output/references/default_reference.docx` 作为 fallback，避免落入 pandoc 默认样式。

### 标题编号策略

如果你的 `Template.docx` 标题样式已经自带自动编号，需要在工作流配置中启用：

```yaml
document_format:
  template_heading_numbering: true
```

否则保持默认 `false`，09-assemble 会向 Markdown 标题注入编号，避免最终 docx 缺少章节号。

## 常见问题

### 它会不会跳过审阅直接输出？

不会。`workflow_contract.md` 规定 10-review 是必经阶段。11-output 会检查 `workflow/10_review/review_result.yaml`，只有 `P0_count == 0` 且审阅通过时才生成 docx。

### 文献 API 限流怎么办？

03-academic-search 会优先使用多来源搜索和开放获取下载。若某些 API 限流，可以继续用 arXiv、出版社页面、PubMed、CNKI、Google Scholar 等路径补充；必要时把你手动下载的 PDF 放进 `papers/inbox/` 后重新执行 04-paper-digest。

### 能不能只用来调研，不生成申请书？

可以。运行到 05-synthesis 后，重点查看：

```text
workflow/03_academic_search/
workflow/04_paper_digest/
workflow/05_synthesis/current_view.md
workflow/05_synthesis/evidence_ledger.yaml
```

这些文件已经足够支撑一次领域综述式调研。

### 自动模式和协作模式怎么选？

第一次跑新课题建议用协作模式 `/grant-master:auto`。当你已经确认方向、模板和申请要求都比较清楚时，再使用 `/grant-master:auto --auto` 连续推进。

### 生成的内容可以直接提交吗？

不建议。你至少需要核对三类内容：真实个人基础和团队条件、引用和论文事实、申报指南中的格式与政策要求。Grant-Master 负责提高初稿生产和材料组织效率，不替代申请人判断。

## 合规边界

Grant-Master 的学术搜索模块只允许使用合法公开来源获取论文全文，包括 arXiv、PubMed Central、Semantic Scholar `openAccessPdf`、OpenAlex、Unpaywall、出版商明确开放的 PDF，以及用户手动提供到 `papers/inbox/` 的本地文件。

对需要机构权限或无公开开放全文的论文，系统只记录 DOI、论文链接、开放获取状态和获取建议，不自动下载，也不搜索、访问、推荐或使用 Sci-Hub、LibGen 等绕过付费墙的来源。

相关执行规则写在 [references/academic-search/search-protocol.md](references/academic-search/search-protocol.md) 和 [COMPLIANCE.md](COMPLIANCE.md) 中。

## 安全声明

学术搜索模块可能通过 CDP Proxy 控制本机 Chrome，并继承浏览器登录态。请不要暴露 `127.0.0.1` 本地代理端口，不要在不可信环境运行浏览器自动化，也不要提交 cookie、session、截图、日志、未授权 PDF 或其他敏感文件。详细安全边界和漏洞上报方式见 [SECURITY.md](SECURITY.md)。

## 后续优化

当前版本仍有一些明确限制，后续会继续优化：

- **图片生成**：目前 Grant-Master 不会直接生成申请书图片，只会在 `workflow/07_outline/figure_plan.yaml` 和正文中生成图片规划与生图 prompt。使用者需要手动把这些 prompt 复制到 ChatGPT 等工具中生成图片，再放回申请书材料中。后续可以考虑集成图片生成能力，自动完成图表草图、技术路线图和概念图的生成。
- **Word 模板填充**：目前最终版 Word 主要通过 pandoc/reference docx 继承样式生成，还不能直接向官方申请书模板中的固定位置、复杂表格或表单控件里填内容。因此一些格式问题，例如申请书内置表格填写、封面信息、固定栏位排版等，仍需要人工处理。后续可以探索基于 `python-docx` 或模板映射规则的结构化填充能力。

## 致谢

本项目的学术搜索相关模块主要参考并改造自 [ustc-ai4science/academic-search](https://github.com/ustc-ai4science/academic-search)，包括 `references/academic-search/`、`scripts/academic-search/` 以及 03-academic-search 的多源检索、开放获取 PDF 判定、元数据整理和 CDP 浏览器检索等流程设计。

Academic-Search 由 Chengmingyue 开源，采用 MIT License。Grant-Master 在其学术检索能力基础上，将搜索、论文精读、证据综合和中文项目申请书写作流程进行了集成。第三方版权和许可声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 贡献与许可证

欢迎提交 issue、PR 或直接 fork 改造。比较需要改进的方向包括：

- 更稳定的多源文献检索与 PDF 获取；
- 面向不同项目类型的模板和章节策略；
- 更强的审阅规则、查重规则和事实核验；
- 更好的 Codex / Claude Code 双端适配；
- 示例项目和端到端测试。

提交 PR 前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，其中包含贡献流程、轻量测试方式、合规要求和第三方来源改造规则。

本项目使用 [MIT License](LICENSE) 开源。
