---
name: auto
description: >
  Grant 申请书写作全流程自动化编排器。
  管理 ./workflow/proposal_state.yaml 全局状态，读取各阶段 result 文件，
  自动研判需要执行哪个阶段，处理调研循环（02-05）、写作循环（08）和审阅修复循环（10→08），
  支持协作模式和自动模式，支持断点续跑。

  当用户输入 /grant-master:auto，或在任何 grant 工作流中需要自动推进流程时，使用本 Skill。
  本 Skill 不执行具体工作——它只读取状态、研判路由、调用下游 Skill、更新状态。
---

# auto：全流程自动化编排器

## 1. 定位

auto 是 grant skill 链条的**自动驾驶仪**。它不做具体工作（不调研、不写作、不审阅），只做三件事：

```text
1. 读状态 → ./workflow/proposal_state.yaml + 各阶段 result 文件
2. 判路由 → 下一步该执行哪个阶段
3. 调 Skill → 调用对应的 XX-name skill，然后更新状态
```

### 1.1 铁律：subagent 类型锁定

auto 在调用 subagent 时，**只允许使用 Grant-Master 定义的 worker agent 类型**。不同宿主的 agent 名称不同，但都必须映射到本仓库的 worker contract：

| 宿主 | Searcher | Digester | Writer |
|------|----------|----------|--------|
| Claude Code plugin | `grant-master:grant-searcher` | `grant-master:grant-digester` | `grant-master:grant-writer` |
| Codex multi-agent | `grant_searcher` | `grant_digester` | `grant_writer` |

Codex 运行前必须能通过项目本地 `.codex/config.toml` 找到上述三个 role，并且三个 role 必须分别指向：

```text
.codex/agents/grant-searcher.toml  → agents/searcher.md
.codex/agents/grant-digester.toml  → agents/digester.md
.codex/agents/grant-writer.toml    → agents/writer.md
```

可用以下命令快速检查 Codex agent 注册：

```bash
bash scripts/codex/check-agents.sh
```

违反此铁律的后果：
- general-purpose agent 拥有全量工具权限和无限制上下文窗口，可能绕过阶段边界直接操作文件
- 通用 agent 不遵守 worker 的边界规则（不编造、不越界、单 query/单批边界等）
- 本 plugin 的质量保证体系（context_budget 上限、parallel_safe 标记、边界规则嵌入）全部失效

各 coordinator skill（03/04/08）在 dispatch 时必须使用对应宿主的 worker agent 类型**字符串字面量**，不允许动态推断或回退到通用型。若当前宿主无法确认这些 worker agent 已注册，必须生成 blocked 结果并提示用户先运行 `bash scripts/codex/check-agents.sh` 或完成宿主侧 agent 安装。

### 1.2 铁律：路径基准——项目根目录

**所有文件路径（instruction sheet 中的路径、agent 输出路径、mkdir 目标）均以项目根目录为基准。**

项目根目录 = `topic.md` 所在目录（用户执行 grant 工作流的目录）。

agent 启动后，**第一个文件操作之前**必须确认当前工作目录是项目根目录。若不确定，从 instruction sheet 中的 `round_dir` 推导：

```
round_dir = "workflow/04_paper_digest/round_01"
→ 项目根 = 去掉 "workflow/..." 后的前缀
```

**禁止行为**：
- agent 以自身所在目录（如 `~/.claude/skills/grant-master/agents/`）为基准解析路径
- agent 以上一个文件操作后的残留 CWD 为基准
- coordinator 在 instruction sheet 中使用 agent 本地路径

**后果**：若 agent 从错误基准写文件，产物会出现在 `papers/inbox/workflow/...` 等错误嵌套路径中，后续阶段无法找到。

## 2. 状态文件

auto **独享** `./workflow/proposal_state.yaml` 的读写权限。其他 XX-name skill **绝不**读取或修改此文件。

初始时若 `./workflow/proposal_state.yaml` 不存在，按 `references/proposal_state_template.yaml` 创建。

同时读取各阶段的 result 文件来更新状态（见 §4）。

## 3. Pipeline 拓扑

```text
01_topic
  ↓
02_literature_plan → 03_academic_search → 04_paper_digest → 05_synthesis
  ↑                                                              │
  └──────────── 调研循环（02-05 可回环）──────────────────────────┘
                                                                  ↓
                                                            06_helm
                                                                  ↓
                                                            07_outline
                                                                  ↓
                                                            08_section_write ←─────────┐
                                                              (逐 unit 循环)            │
                                                                  ↓                     │
                                                            09_assemble                │
                                                                  ↓                     │
                                                            10_review ─── P0>0 ────────┘
                                                                  ↓
                                                            11_output
```

每个阶段的输入/输出和职责见对应 Skill 的 SKILL.md。

## 4. 阶段产出物清单与门禁

每个阶段完成后，auto 必须验证其 **全部 required_outputs** 存在且非空，才能标记为 `completed`。

### 4.1 产出物清单

| 阶段 | Gate 文件（auto 读） | Required Outputs（必须全部存在且非空） | 提取的关键信息 |
|---|---|---|---|
| 01 | `workflow/01_topic/01_topic_result.yaml` | `01_topic_card.md`, `01_topic_result.yaml`, `01_literature_seed.yaml` | 文件存在即完成 |
| 02 | `workflow/02_literature_plan/round_XX/plan_result.yaml` | `long_plan.yaml`, `round_XX/round_goal.md`, `round_XX/search_queries.yaml`, `round_XX/plan_result.yaml`, `latest_plan.yaml` | 本轮搜索目标数 |
| 03 | `workflow/03_academic_search/round_XX/search_result.yaml` | `round_XX/search_summary.md`, `round_XX/candidate_papers.md`, `round_XX/search_results.yaml`, `round_XX/search_result.yaml` | 候选论文数、已下载数 |
| 04 | `workflow/04_paper_digest/round_XX/digest_result.yaml` | `round_XX/digest_report.md`, `round_XX/digest_result.yaml`, `paper_index.yaml` | 本轮精读论文数 |
| 05 | `workflow/05_synthesis/latest_result.yaml` | `current_view.md`, `evidence_ledger.yaml`, `round_XX/synthesis_report.md`, `round_XX/synthesis_result.yaml`, `latest_result.yaml` | rounds_completed、recommend_continue_research、strong_claims、convergence |
| 06 | `workflow/06_helm/helm_result.yaml` | `helm_report.md`, `scheme_blueprint.yaml`, `decision_log.md`, `helm_result.yaml` | can_continue、方案状态 |
| 07 | `workflow/07_outline/outline_result.yaml` | `outline_report.md`, `volume_budget.yaml`, `writing_units.yaml`, `source_allocation.yaml`, `figure_plan.yaml`, `table_plan.yaml`, `citation_plan.yaml`, `outline_state.yaml`, `outline_blueprint.yaml`, `context_bundle.yaml`, `outline_result.yaml` | total_units、blocked_units、figure/table/citation counts、quality scores |
| 08 | `workflow/08_section_write/unit_result.yaml` | `unit_result.yaml` + 检查 outline_state 中 unit 状态 | 刚写完的 unit、剩余 pending 数、all_complete |
| 09 | `workflow/09_assemble/assemble_result.yaml` | `proposal_draft.md`, `assemble_report.md`, `assemble_result.yaml` | 组装质量、heading 编号策略、heading 编号修复数 |
| 10 | `workflow/10_review/review_result.yaml` | `review_report.md`, `review_result.yaml` | P0/P1/P2 计数、ready_for_output |
| 11 | `workflow/11_output/output_result.yaml` | `proposal.docx`, `output_result.yaml` | 输出文件路径。**前置门禁**：`10_review/review_result.yaml` 必须存在且 `P0_count == 0` |

### 4.2 门禁验证流程

阶段执行完毕后，auto 执行以下验证步骤**再**更新状态：

1. 读该阶段的 gate result 文件
2. 检查 `integrity.all_outputs_present` 是否为 `true`（由 Skill 自身写入）
3. **独立交叉验证**：逐个检查 §4.1 的 `required_outputs` 中每个文件是否存在且非空
4. 任一文件缺失或为空 → 阶段状态设为 `blocked`，不推进
5. 全部通过 → 标记 `completed`

### 4.3 Evidence 字段只读原则

以下字段由各阶段 skill 在其 result 文件中独立写入，auto **只读取汇总，绝不自行修改**：

| 字段 | 来源 | 写入者 |
|------|------|--------|
| `quality.gap_strength` | `05_synthesis/latest_result.yaml` | 05-synthesis |
| `quality.evidence_strong_claims` | `05_synthesis/latest_result.yaml` | 05-synthesis |
| `quality.papers_digested` | `04_paper_digest/paper_index.yaml` | 04-paper-digest |
| `quality.review_p0_count` | `10_review/review_result.yaml` | 10-review |
| `research_loop.rounds_completed` | `05_synthesis/latest_result.yaml` | 05-synthesis |
| `research_loop.decision` | `05_synthesis/latest_result.yaml` | 05-synthesis |

auto 在 ./workflow/proposal_state.yaml 中记录这些值仅作为**缓存**，每次决策前必须与实际 result 文件做交叉验证。

## 5. 路由逻辑

### 5.1 线性推进

```text
当前 stage=N → 执行 grant-0N → 读 result → 标记 completed → stage=N+1 → 执行...
```

自动跳过已 `completed` 的阶段，从中断处继续（断点续跑）。

### 5.2 循环控制

**调研循环（02-05）**：

每次 05 完成后，读 `latest_result.yaml`：
- 若 `recommend_continue_research: true` 且 `rounds_completed < max_rounds`：
  - 协作模式：告知用户本轮结论，询问"继续调研还是进入方案？"
  - 自动模式：检查 exit_criteria（strong_claims ≥ min_strong_claims、papers ≥ min_papers_digested、convergence），满足则进 06，否则继续 02
- 若 `recommend_continue_research: false` 但 `rounds_completed < min_rounds`：
  - **即使 exit_criteria 满足，也必须继续调研直到达到 min_rounds**
  - 协作模式：告知用户"质量达标但未满足最少轮次要求（{min_rounds}轮），是否继续？"
  - 自动模式：继续 02，不跳出
- 否则 → 进 06

**写作循环（08）**：

每次 08 完成后，读 `unit_result.yaml`：
- 若 `all_complete: false` → 继续调用 08-section-write（Coordinator 自动处理 batch dispatch）
- 若 `all_complete: true` → 进 09
- 若有 `blocked_units` → 报告警告，允许继续到 09（blocked unit 在 assemble 中将以占位符表示）

> **注意**：08 现在是 Coordinator 模式——每次调用 dispatch 一批 writer agents（不同 section 间并行）。auto 不需要管理 agent 池，只需循环调用 08 直到 all_complete。Writer agent 的并行调度由 08 内部处理。

**审阅修复循环（10→08→09→10）**：

每次 10 完成后，读 `review_result.yaml`：
- 若 `P0_count > 0` 且 `review_loop.iterations < max_iterations`：
  - 协作模式：列出 P0 建议，询问"修复后继续还是手动处理？"
  - 自动模式：标记对应 unit 为 pending（通过 outline_state.yaml），重新 08→09→10
- 若 `P0_count == 0` → 进 11

### 5.3 阻塞处理

任何阶段返回 `status: blocked` 或 `can_continue: false` → 停止，记录阻塞原因。

## 6. 用户指令研判

auto 接收的第一个用户消息，按以下优先级研判意图：

| 用户指令 | 研判 | 行为 |
|---|---|---|
| 无参数或"继续"/"下一步" | 从中断处继续 | 读 ./workflow/proposal_state.yaml → 找下一个 pending stage → 执行 |
| "从头开始" | 重置 pipeline | 确认后清空状态，从 01 开始 |
| "状态"/"进度" | 查看进度 | 读 ./workflow/proposal_state.yaml，展示 pipeline 状态、完成度 |
| "继续调研"/"再来一轮" | 调研循环 | 设置 02 为 pending，执行 02→03→04→05 |
| "进入方案"/"生成大纲" | 跳过剩余调研 | 若 05 completed 则进 06，否则提示 |
| "审阅" | 审阅修复循环 | 若 08 all_complete 则进 09→10 |
| "输出"/"导出" | 最终输出 | 若 10 通过则进 11 |
| "修复 P0" | 审阅修复循环 | 按 10 建议回灌 unit，进 08→09→10 |
| "自动模式" | 切换模式 | 设置 mode=autonomous |
| "协作模式" | 切换模式 | 设置 mode=collaborative |

## 7. 执行流程

### 第 1 步：初始化状态

1. 若 `./workflow/proposal_state.yaml` 不存在 → 从 `references/proposal_state_template.yaml` 创建
2. 若存在 → 读取

### 第 2 步：研判用户意图

按 §6 研判，确定要执行的目标阶段。

### 第 3 步：检查前置条件

检查目标阶段所需的前置文件是否存在（如 06 需要 05 的 latest_result.yaml）。若缺失，回退到第一个缺失的前置阶段。

### 第 4 步：执行阶段

调用对应的 `/XX-name-...` skill。auto **自身不执行阶段工作**——它将控制权交给对应的 XX-name skill。

协作模式下，每个阶段执行前可简述"即将执行 grant-0X：...（一句话说明）"。

执行 09-assemble 时，auto 必须读取 `config.document_format.template_heading_numbering`：

- `false` 或字段缺失（默认）：按普通方式调用 09，09 将在 markdown 标题中注入编号。
- `true`：调用 09 时明确传递 `--template-heading-numbering`（兼容含义等同于旧 `--no-numbers`），让 09 输出干净标题，编号交给 docx Heading 样式。

auto 不得根据模板外观自行猜测该字段；它只使用配置值。

### 第 5 步：验证产出物完整性并更新状态

阶段执行完毕后：

1. 读该阶段的 gate result 文件
2. 检查 result 文件中的 `integrity.all_outputs_present` 字段是否为 `true`
3. **独立交叉验证**：按 §4.1 的 required_outputs 清单，逐个检查文件是否存在且非空（用 `ls -la` 或 Read 工具检查文件大小 > 0）
4. 任一文件缺失或为空 → 阶段状态设为 `blocked`，记录缺失文件列表，停止推进
5. 全部通过 → 更新 `./workflow/proposal_state.yaml`：
   - 该阶段的 `status` → `completed`
   - `completed_at` 时间戳
   - 从 result 文件中**读取**（不自行计算）quality 相关字段并缓存
   - `research_loop.rounds_completed` **必须**从 `05_synthesis/latest_result.yaml` 中读取，不得自行修改
6. 追加 `history` 记录，包含 `integrity_check` 结果

### 第 6 步：研判下一步

按 §5 的路由逻辑，确定下一步：
- 线性下一阶段 → 继续
- 进入循环 → 回到循环起点
- 到达终点（11 completed）→ 祝贺，总结全流程
- 阻塞 → 报告阻塞原因，等待用户

### 第 7 步：汇报

简洁汇报：
```text
[stage] → completed
下一步：[next_stage]
```

不要展开阶段内部的工作细节（那是各个 skill 自己的输出）。

## 8. 模式行为差异

| 行为 | 协作模式 | 自动模式 |
|---|---|---|
| 调研循环决策 | 每轮结束暂停，询问用户 | 自行判断，达到条件自动跳出 |
| 写作循环 | 每 unit 完成后可继续或暂停 | 连续写直到全部完成 |
| P0 审阅修复 | 列出 P0 建议，等用户确认后修复 | 自动回灌标记，重新 08→09→10 |
| 阶段间过渡 | 简述下一步，不暂停 | 不暂停，直接执行 |
| 阻塞（缺材料） | 暂停，列出所需材料 | 暂停（阻塞不可自动解决） |
| 阶段内部细节 | 透传 XX-name 的输出 | 透传 XX-name 的输出 |

## 8.1 上下文压力降级策略（Degradation Policy）

上下文窗口压力、token 压力、时间压力、模型判断"差不多够了"——**都不是跳过阶段的合法理由**。

### 允许的动作

当上下文压力过大时，auto 只能：

1. **write_checkpoint**：将当前状态完整写入 `./workflow/proposal_state.yaml`，确保所有已完成阶段有 `completed_at` 时间戳
2. **summarize_current_state**：生成简洁的当前状态摘要
3. **stop_and_request_resume**：停止自动推进，明确告知用户"请在新 session 中 `/grant-master:auto 继续`"

### 禁止的动作

以下动作**绝对禁止，无论上下文压力多大**：

1. **skip_required_stage**：跳过任何必经阶段（尤其 10-review 不可从 09 直接跳到 11）
2. **mark_unrun_stage_completed**：将未实际执行的阶段标记为 `completed`
3. **invent_round_completion**：虚报调研轮次（如实际 2 轮写 3 轮）
4. **write_result_without_outputs**：在未生成阶段产出物的情况下写入 result 文件
5. **modify_evidence_fields**：auto 直接修改 quality、rounds_completed 等应由各 skill 写入的字段

### 违规可检测性

用户可通过以下方式检测违规：

- 检查 `./workflow/proposal_state.yaml` 中各 stage 的 `completed_at` 序列是否连续
- 检查对应阶段 `required_outputs`（§4.1）文件是否全部存在且非空
- 检查对应轮次目录是否实际存在

## 8.2 阶段顺序连续性校验

auto 在推进 stage 时必须执行连续性检查：

```text
标准顺序：01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11
合法回边：05 → 02（调研循环）、10 → 08（审阅修复循环）
非法跳跃：任何向前跳过 ≥1 个阶段（如 05→07、09→11）
```

检测到非法跳跃时：
1. 如果跳过的阶段在 `config.required_stages` 中 → **硬阻塞**，不执行目标阶段
2. 否则 → 写入 warning 到 history，告知用户，但仍阻塞（不允许静默跳过）
3. 在输出中明确告知用户跳过了哪些阶段

## 9. 断点续跑

`./workflow/proposal_state.yaml` 是唯一的断点记录。恢复时：

1. 读 `stages`，找到第一个 `status: pending` 的阶段
2. 检查该阶段的前置条件（上一阶段的 result 文件是否存在且有效）
3. 若前置条件不满足（如文件被删除），回退到上一个阶段，标记为 pending
4. 从中断处继续执行

支持跨会话恢复：用户在新对话中 `/grant-master:auto`，auto 读 `./workflow/proposal_state.yaml` 即知道上次执行到哪里。

## 10. 质量要求

1. 不执行具体工作——调研/写作/审阅委托给对应 skill；
2. `./workflow/proposal_state.yaml` 每次操作后立即更新；
3. 阶段 result 文件缺失时不静默跳过——标记为 blocked 并报告；
4. 循环次数不超过上限（调研 max 5 轮、审阅修复 max 3 轮）；
5. 自动模式下，阻塞仍需人工介入（不自动跳过）；
6. 最终响应简洁——不展开阶段内部细节；
7. 不修改任何 XX-name skill 的输出文件；
8. **产出物完整性**：标记 completed 前必须独立验证全部 required_outputs 存在且非空（§4.1-4.2）；
9. **Evidence 字段只读**：quality 和 rounds_completed 等字段从各 skill 的 result 文件读取，不自行修改（§4.3）；
10. **阶段连续性**：检测到非法跳跃立即阻塞（§8.2）；
11. **min_rounds 约束**：调研轮次未达 min_rounds 不得跳出（§5.2）；
12. **上下文压力不得作为跳阶段理由**：遵守 degradation_policy（§8.1）；
13. 本 Skill 和所有阶段 Skill 必须遵守 `docs/workflow-contract.md`。
