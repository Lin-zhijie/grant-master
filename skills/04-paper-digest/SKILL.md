---
name: 04-paper-digest
description: >
  中文项目申请书写作流程第 04 阶段工具：论文精读 Coordinator。
  读取 search_results.yaml，按 query_id 标签将论文分组，为每批写入 batch instruction sheet 文件，
  dispatch 给 grant-digester worker agent 并行精读（每 agent 处理一组同标签论文），
  收集批次报告后统一将 PDF 移至 papers/proceeded/，生成综合精读报告供 05-synthesis 使用。

  当用户输入 /grant-master:04-paper-digest，或在 grant 工作流中需要精读本轮候选论文时，使用本 Skill。

  本 Skill 是 03-academic-search 的下游、05-synthesis 的上游。
  它只负责编排精读流程和生成综合报告，单篇/批次精读由 grant-digester agent 执行。
---

# 04-paper-digest：论文精读

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 04 阶段：**论文精读**。

核心职责：

```text
03_academic_search（search_results.yaml）+ papers/inbox/（PDF）
  ↓
04_paper_digest（本 Skill / Coordinator）
  ├── 读取背景：本轮目标、长期计划
  ├── 按 query_id 标签将论文分组（同 query → 同批次）
  ├── 为每批写入 batch instruction sheet YAML 到 instructions/
  ├── 并行 dispatch grant-digester agents（每 agent 处理一批）
  ├── 收集所有批次报告（含跨论文发现）
  ├── 验证后逐篇移动 PDF 到 papers/proceeded/
  ├── 更新 paper_index.yaml
  └── 生成综合精读报告 digest_report.md（跨批次综合）
  ↓
05_synthesis
```

本 Skill 不执行精读——精读由 grant-digester worker agent 执行。本 Skill 负责分组、编排、PDF 移动和跨批次综合报告。

---

## 2. 输入文件规则

### 2.1 必须读取

**背景文件**（执行前必须读取，了解精读导向）：

```text
workflow/02_literature_plan/round_XX/round_goal.md       # 本轮调研目标与核心问题
workflow/02_literature_plan/long_plan.yaml               # 整体调研路线图与待验证假设
workflow/03_academic_search/round_XX/search_results.yaml # 本轮论文元数据（含优先级）
```

**论文 PDF**（精读对象）：

```text
papers/inbox/    # 所有 PDF 均需精读
```

从 `round_goal.md` 中提取：本轮核心问题、不查的内容边界——精读时以这些问题为导向，不泛读。

从 `long_plan.yaml` 中提取：当前待验证假设、已有 gap 线索——精读时关注论文能否验证或否定这些假设。

从 `search_results.yaml` 中提取：每篇论文的 `relevance`（core/general）、`digest_priority`（high/medium/low）、`abstract_summary`、元数据——用于确定精读顺序和深度。

### 2.2 建议读取

```text
workflow/03_academic_search/round_XX/search_summary.md  # 上阶段调研报告，了解初步评估
workflow/04_paper_digest/paper_index.yaml               # 全局索引，避免重复精读已处理论文
```

### 2.3 轮次判断

从 `workflow/02_literature_plan/latest_plan.yaml` 获取当前轮次，输出到 `workflow/04_paper_digest/round_XX/`，轮次编号与 02-literature-plan / 03-academic-search 保持一致。

---

## 3. 执行流程

### 第 1 步：读取背景

读取所有背景文件，明确：
- 本轮核心问题是什么（来自 `round_goal.md`）；
- 当前整体调研进展到哪里（来自 `long_plan.yaml`）；
- 哪些论文优先级最高（来自 `search_results.yaml` 的 `digest_priority`）。

### 第 2 步：扫描 inbox 并按 query_id 分组

1. 列出 `papers/inbox/` 中所有 PDF，与 `search_results.yaml` 的 `local_pdf` 匹配，补全元数据
2. **按 `query_id` 标签分组**：每篇论文在 search_results.yaml 中有 `query_id`（searcher 下载时标记的来源 query）。同一 `query_id` 的论文归入同一批次——主题相关，digester 可在批次内做跨论文发现
3. 无 `query_id` 的论文（手动放入的外部补充）归入 `”manual”` 批次

若 inbox 为空，生成 blocked 版 `digest_result.yaml`。

**分组策略**：

| 场景 | 处理 |
|------|------|
| N 个 query → N 组论文 | N 个批次，N 个 digester 并行 |
| 手动补充无 query_id | 合并为 `”manual”` 批次 |
| 某批次 > 8 篇 | 拆分为 `Q1_part1`、`Q1_part2`，每批 ≤ 8 篇 |

### 第 3 步：写入 Batch Instruction Sheet 文件并 dispatch

**关键：所有路径均相对于项目根目录（topic.md 所在目录）。digester agent 必须在项目根目录下解析 instruction sheet 中的所有路径。**

对每个批次，生成 batch instruction sheet **写入磁盘**（格式见 `agents/digester.md` §4）。

```bash
mkdir -p workflow/04_paper_digest/round_{XX}/instructions
mkdir -p workflow/04_paper_digest/round_{XX}/reports
```

为每批写入 `instructions/{batch_id}_batch.yaml`：

```yaml
batch_id: "{query_id}"
round_dir: "workflow/04_paper_digest/round_{XX}"

round_goal_excerpt:     # 从 round_goal.md
  goal: "..."
  core_question: "..."
  what_not_to_find: "..."

hypothesis_to_verify:   # 从 long_plan.yaml
  - "H1: ..."

papers:                  # 本批次所有论文（来自同一 query_id）
  - pdf_path: "papers/inbox/{filename}.pdf"
    metadata:
      title: "..."
      authors: [...]
      year: 2025
      venue: "..."
      citation_count: 120
      relevance: "core"
      digest_priority: "high"
      abstract_summary: "..."
      query_id: "{batch_id}"

output:
  batch_report: "workflow/04_paper_digest/round_{XX}/reports/{batch_id}/{batch_id}_batch_report.md"
  batch_manifest: "workflow/04_paper_digest/round_{XX}/reports/{batch_id}/{batch_id}_batch_manifest.yaml"
  paper_reports_dir: "workflow/04_paper_digest/round_{XX}/reports/{batch_id}/papers/"
```

文件写完后，所有批次并行 dispatch。

**宿主 agent 名称**：

| 宿主 | 必须使用的 worker |
|------|-------------------|
| Claude Code plugin | `grant-master:grant-digester` |
| Codex multi-agent | `grant_digester`（由 `.codex/config.toml` 注册，配置文件 `.codex/agents/grant-digester.toml`） |

如果当前运行环境无法确认上述 worker 已注册，**不得回退到 general-purpose / 通用 agent**；生成 blocked 版 `digest_result.yaml`，并提示用户先运行 `bash scripts/codex/check-agents.sh`。

**Dispatch prompt**（只传文件路径，不贴 YAML 正文）：

```
你是 grant-digester。按照 agents/digester.md 的流程执行。

batch_instruction_path: workflow/04_paper_digest/round_{XX}/instructions/{batch_id}_batch.yaml

流程：
1. Read batch_instruction_path（你的批次任务规格）
2. 逐篇精读 → 7 节报告 → 批次汇总 → manifest
3. 返回批次结构化摘要。不移动 PDF。
```

- `grant-digester` 并行 dispatch，每 agent 处理一批（1-8 篇）
- Coordinator 不传背景上下文——digester 从 instruction 文件读取

### 第 3.5 步：收集批次结果并验证

每个 digester 返回后，coordinator 验证：

1. 批次汇总报告 `output.batch_report` 是否写入且非空
2. 批次 manifest `output.batch_manifest` 是否写入且非空
3. `papers[]` 中每篇的 `report_path` 文件是否存在且非空
4. 返回的结构化摘要（`agents/digester.md` §7）是否完整

验证通过后，逐篇：
1. `mv papers/inbox/{filename}.pdf papers/proceeded/{filename}.pdf`
2. 在 `paper_index.yaml` 追加记录（使用 digester 返回的 `papers[]` 和 `digest_summary`）
3. 标记 `status: digested`

若某篇验证失败：标记 `status: unreadable`，PDF 不移动。
若整个批次失败：记录 error，继续处理其余批次。

### 第 4 步：生成综合精读报告

所有论文处理完后，汇总写入 `workflow/04_paper_digest/round_XX/digest_report.md`（结构见 §5.2）。

### 第 5 步：写阶段状态文件

写入 `workflow/04_paper_digest/round_XX/digest_result.yaml`，更新 `workflow/04_paper_digest/paper_index.yaml`。

### 第 6 步：产出物完整性自检

1. 检查以下文件是否存在且非空：
   - `workflow/04_paper_digest/round_XX/digest_report.md`
   - `workflow/04_paper_digest/round_XX/digest_result.yaml`
   - `workflow/04_paper_digest/paper_index.yaml`
2. 将验证结果写入 `digest_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. 若 `all_outputs_present: false` → 不声称阶段完成，在最终响应中说明缺失文件。

---

## 4. 单篇精读结构

> **权威定义**：7 节结构、精读深度规则和输出格式的权威定义在 `agents/digester.md` §6-§7。本节保留副本供 coordinator 参考，但执行精读的 digester agent 以自己的 agent 定义为准。

路径：`workflow/04_paper_digest/round_XX/reports/{batch_id}/papers/{filename_no_ext}.md`

严格使用以下 7 节结构（与 `agents/digester.md` §6 一致）：

```markdown
# 精读报告：[论文标题]

**基本信息**：[年份] | [Venue] | 引用数：[N] | [链接]()

---

## 1. 研究问题

这篇论文要解决什么问题？研究背景是什么？与哪些已有工作对比？

## 2. 核心方法 / 系统设计

主要方法、架构或算法的简明描述。关注设计选择和关键组件，而非逐段复述。

## 3. 关键实验与结论

主要实验设置（数据集、对比基线、评估指标）和核心结论数据。列出可量化的关键数字。

## 4. 与本课题的相关性

结合 round_goal.md 中的核心问题，分析这篇论文对当前申请书课题的价值：
- 它验证或否定了 long_plan.yaml 中的哪些假设？
- 它提供了哪些可借鉴的技术思路或系统设计？
- 它的场景约束与本课题是否相同？（约束不同不代表无参考价值）

## 5. 可引用的核心结论

列出可能在申请书立项依据中直接引用的数据、论点或结论。每条附简短的引用场景说明。

## 6. 局限与潜在 gap

该工作的局限性、未解决的问题、适用范围的边界。这些可能是本课题创新点的切入口。不要主观臆断，只从论文本身提取。

## 7. 精读者注记

关于这篇论文的其他评估，例如：是否需要追踪引用链、是否需要联系作者、PDF 质量问题、是否与另一篇高度相关等。
```

---

## 5. 输出文件结构

```text
workflow/04_paper_digest/
  paper_index.yaml                          # 全局论文索引（跨轮次追加）
  round_XX/
    instructions/
      Q1_batch.yaml                        # Coordinator → digester 批次说明书
      Q2_batch.yaml
    reports/
      Q1/
        Q1_batch_report.md                 # digester 批次汇总
        Q1_batch_manifest.yaml             # digester 批次 manifest
        papers/
          {filename_no_ext}.md             # 单篇精读报告
      Q2/
        ...
    digest_report.md                       # Coordinator 综合报告（→ 05-synthesis）
    digest_result.yaml                     # 阶段状态（→ auto）
```

### 5.1 `paper_index.yaml`（全局索引，持续追加）

```yaml
last_updated_round: 1
total_digested: 0

papers:
  - filename: "2310.12345.pdf"
    title: ""
    authors: []
    year: 0
    venue: ""
    arxiv_id: ""
    doi: ""
    url: ""
    relevance: "core"
    digest_priority: "high"
    batch_id: "Q1"
    digest_file: "workflow/04_paper_digest/round_01/reports/Q1/papers/2310.12345.md"
    digested_in_round: 1
    proceeded_path: "papers/proceeded/2310.12345.pdf"
    status: "digested"        # digested / unreadable
```

`paper_index.yaml` 只增不减，跨轮次持续追加。

### 5.2 `digest_report.md`（给 05-synthesis 读）

```markdown
# 第 XX 轮论文精读报告

## 本轮精读概览

- 精读论文总数：X 篇
- 核心论文（core）：X 篇 | 一般论文（general）：X 篇
- 来源轮次：round_XX

## 各论文摘要

每篇论文的结构化摘要（重点突出与课题相关性，比单篇报告更简洁）：

### [论文标题]（[年份] [Venue]，引用数 N）

- **研究问题**：一句话
- **核心方法**：一句话
- **关键结论**：核心数据或论断
- **与课题相关性**：最重要的关联点
- **潜在 gap**：最重要的局限或切入口
- 详细精读 → [reports/{batch_id}/papers/{filename_no_ext}.md](reports/{batch_id}/papers/{filename_no_ext}.md)

## 本轮跨论文发现

精读后观察到的共同主题、技术趋势、互相印证或互相矛盾的发现。

## 对课题假设的影响

本轮论文对 long_plan.yaml 中各待验证假设的支持（✓）或否定（✗）情况列表。

## 给 05-synthesis 的建议

基于本轮精读，建议 synthesis 重点关注哪些方向；哪些假设需要更新；是否需要补充调研。
```

### 5.3 `digest_result.yaml`（给 auto 读）

成功完成时：

```yaml
stage: "PAPER_DIGEST"
round: 1
status: "completed"
can_continue: true
recommended_next_stage: "SYNTHESIS"

paper_counts:
  total_digested: 0
  core_digested: 0
  general_digested: 0
  unreadable: 0

outputs:
  digest_report: "workflow/04_paper_digest/round_01/digest_report.md"
  paper_index: "workflow/04_paper_digest/paper_index.yaml"
  reports_dir: "workflow/04_paper_digest/round_01/reports/"

next_expected_outputs:
  synthesis_dir: "workflow/05_synthesis/round_01"

intervention:
  required: false
  reason: ""
  questions: []

notes:
  - ""
```

阻塞时（inbox 为空）：

```yaml
stage: "PAPER_DIGEST"
round: 1
status: "blocked"
can_continue: false
recommended_next_stage: ""

paper_counts:
  total_digested: 0

outputs:
  digest_report: ""
  paper_index: ""
  reports_dir: ""

next_expected_outputs:
  synthesis_dir: ""

intervention:
  required: true
  reason: "papers/inbox/ 为空，无论文可精读。"
  questions:
    - "请确认 03-academic-search 是否已完成下载，或手动将 PDF 放入 papers/inbox/。"

notes:
  - ""
```

---

## 6. 论文移动规则

**digester agent 不移动 PDF**。移动由 coordinator（本 Skill）在验证 digester 返回的精读报告后执行。

对每篇验证通过的论文，coordinator 执行：

```bash
mv papers/inbox/{filename}.pdf papers/proceeded/{filename}.pdf
```

- 若 `papers/proceeded/` 不存在，先创建：`mkdir -p papers/proceeded`；
- 移动后在 `paper_index.yaml` 中记录 `proceeded_path`；
- 若某篇验证未通过（`status: unreadable`），PDF **保留在 inbox**，不移动；
- 若 `mv` 失败（文件不存在或权限问题），标注跳过原因，继续处理下一篇。

---

## 7. 阻塞规则

| 情况 | 处理方式 |
|------|---------|
| `papers/inbox/` 为空 | 生成 blocked 版 `digest_result.yaml`，提示用户确认 03-academic-search 状态或手动放入 PDF |
| 某 PDF 无法读取 | 跳过，在 `paper_index.yaml` 中标注 `status: unreadable`，继续处理其余，最后告知用户 |
| 轮次无法判断 | 提示用户确认当前轮次 |
| 背景文件（round_goal.md）缺失 | 可降级执行：以 long_plan.yaml 为导向进行通用精读，但在报告中标注"缺少本轮目标文件，精读方向为通用调研" |

---

## 8. 最终响应格式

```text
已完成第 XX 轮论文精读：

精读论文：X 篇（核心 X 篇，一般 X 篇）
已移至 papers/proceeded/：X 篇
无法读取（跳过）：X 篇

输出文件：
- workflow/04_paper_digest/round_XX/digest_report.md        （综合精读报告）
- workflow/04_paper_digest/round_XX/reports/{batch_id}/...  （批次汇总 + 单篇报告）
- workflow/04_paper_digest/round_XX/digest_result.yaml
- workflow/04_paper_digest/paper_index.yaml

下一步建议：进入 05-synthesis，综合本轮精读结论，更新课题理解视角。
```

---

## 9. 质量要求

1. 所有正文输出使用中文；
2. 不硬编码绝对路径，所有路径相对当前工作目录；
3. 不读取、修改、创建 `./workflow/proposal_state.yaml`；
4. 精读以 `round_goal.md` 中的核心问题为导向，不泛读；
5. coordinator 在 digester 返回且验证通过后移动 PDF，digester 不碰文件；
6. 单篇精读严格使用 7 节结构；
7. `paper_index.yaml` 跨轮次持续追加，不覆盖历史记录；
8. 不执行文献检索，不生成新的搜索任务；
9. 不综合最终论文结论，不判断最终 gap，不生成创新点；
10. 最终响应中不要执行其他 Skill。
