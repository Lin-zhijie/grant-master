# Workflow Contract —— auto 与各 Skill 之间的契约

本文档定义 grant-master 工作流中 **auto 编排器** 与 **各阶段 Skill** 之间的强制契约。所有 Skill 和 auto 必须遵守本文档的规则，不得以任何理由违反。

---

## 1. 核心原则

### 1.1 auto 的定位

> auto 只做路由 + 验证，不做决策。各 skill 的 result 文件是唯一的真相来源。./workflow/proposal_state.yaml 只记录"已验证的事实"，不记录"auto 希望的事实"。

### 1.2 不可跳过的阶段

以下阶段是 pipeline 的**必经阶段**，auto 在任何模式下均不得跳过：

| 阶段 | 名称 | 跳过后果 |
|------|------|---------|
| 10 | review | 未审阅的草稿直接输出，质量不可控 |

以下循环的**最少执行次数**受 `config.min_rounds` 约束：

| 循环 | 最少次数 | 来源 |
|------|---------|------|
| 调研循环 (02→03→04→05) | 由 `config.min_rounds` 定义 | 用户启动参数 / ./workflow/proposal_state.yaml config |
| 审阅修复循环 (10→08→09→10) | 不限，P0 > 0 时必须继续 | review_result.yaml |

---

## 2. 上下文压力下的行为准则

### 2.1 压力来源

上下文窗口压力、token 压力、时间压力、模型判断"差不多够了"——**都不是跳过阶段的合法理由**。

### 2.2 合法动作（degradation_policy.allowed）

当上下文压力过大时，auto 只能执行以下动作：

1. **write_checkpoint**：将当前状态完整写入 `./workflow/proposal_state.yaml`，确保所有已完成阶段有 `completed_at` 时间戳
2. **summarize_current_state**：生成简洁的当前状态摘要，告知用户已完成什么、下一步是什么
3. **stop_and_request_resume**：停止自动推进，明确告诉用户"请在新 session 中 `/grant-master:auto 继续`"

### 2.3 禁止动作（degradation_policy.forbidden）

以下动作**绝对禁止**，无论上下文压力多大：

1. **skip_required_stage**：跳过任何必经阶段（如 09→11 跳过 10-review）
2. **mark_unrun_stage_completed**：将未实际执行的阶段标记为 `completed`
3. **invent_round_completion**：虚报调研轮次（如实际只跑 2 轮但写 `rounds_completed: 3`）
4. **write_result_without_outputs**：在未生成阶段产出物的情况下写入 result 文件声称完成
5. **modify_evidence_fields**：auto 直接修改 `quality`、`research_loop.rounds_completed` 等应由各 Skill 独立写入的字段

### 2.4 违规检测

用户或后续 session 可通过以下方式检测违规：

| 违规类型 | 检测方法 |
|---------|---------|
| skip_required_stage | 检查 `./workflow/proposal_state.yaml` 中 stage 的 `completed_at` 时间戳是否连续（不应有跳过） |
| mark_unrun_stage_completed | 检查对应阶段的 `required_outputs` 文件是否全部存在且非空 |
| invent_round_completion | 检查 `workflow/02-05/` 对应轮次目录及 result 文件是否存在 |
| write_result_without_outputs | 各 skill 的 result 文件中的 `integrity.all_outputs_present` 字段是否为 `true` |

---

## 3. 阶段产出物完整性契约

### 3.1 每个 Skill 的义务

每个阶段 Skill 在执行末尾必须：

1. 列出本 Skill 承诺的所有输出文件
2. 逐一验证文件存在且非空
3. 将验证结果写入 result 文件的 `integrity` 字段
4. 如有缺失 → 设置 `integrity.all_outputs_present: false`，阶段状态不得为 `completed`

### 3.2 auto 的义务

auto 在标记阶段为 `completed` 之前必须：

1. 读取该阶段的 result 文件
2. 检查 `integrity.all_outputs_present` 是否为 `true`
3. 逐个检查 `required_outputs` 列表中的文件是否存在且非空
4. 任一检查失败 → 阶段状态设为 `blocked`，不得推进

### 3.3 各阶段 required_outputs 清单

```yaml
stage_outputs:
  "01":
    required:
      - "workflow/01_topic/01_topic_card.md"
      - "workflow/01_topic/01_topic_result.yaml"
      - "workflow/01_topic/01_literature_seed.yaml"
  "02":
    required:
      - "workflow/02_literature_plan/long_plan.yaml"
      - "workflow/02_literature_plan/round_XX/round_goal.md"
      - "workflow/02_literature_plan/round_XX/search_queries.yaml"
      - "workflow/02_literature_plan/round_XX/plan_result.yaml"
      - "workflow/02_literature_plan/latest_plan.yaml"
  "03":
    required:
      - "workflow/03_academic_search/round_XX/search_summary.md"
      - "workflow/03_academic_search/round_XX/candidate_papers.md"
      - "workflow/03_academic_search/round_XX/search_results.yaml"
      - "workflow/03_academic_search/round_XX/search_result.yaml"
  "04":
    required:
      - "workflow/04_paper_digest/round_XX/digest_report.md"
      - "workflow/04_paper_digest/round_XX/digest_result.yaml"
      - "workflow/04_paper_digest/paper_index.yaml"
  "05":
    required:
      - "workflow/05_synthesis/current_view.md"
      - "workflow/05_synthesis/evidence_ledger.yaml"
      - "workflow/05_synthesis/round_XX/synthesis_report.md"
      - "workflow/05_synthesis/round_XX/synthesis_result.yaml"
      - "workflow/05_synthesis/latest_result.yaml"
  "06":
    required:
      - "workflow/06_helm/helm_report.md"
      - "workflow/06_helm/scheme_blueprint.yaml"
      - "workflow/06_helm/decision_log.md"
      - "workflow/06_helm/helm_result.yaml"
  "07":
    required:
      - "workflow/07_outline/outline_report.md"
      - "workflow/07_outline/volume_budget.yaml"
      - "workflow/07_outline/writing_units.yaml"
      - "workflow/07_outline/source_allocation.yaml"
      - "workflow/07_outline/figure_plan.yaml"
      - "workflow/07_outline/table_plan.yaml"
      - "workflow/07_outline/citation_plan.yaml"
      - "workflow/07_outline/outline_state.yaml"
      - "workflow/07_outline/outline_blueprint.yaml"
      - "workflow/07_outline/context_bundle.yaml"
      - "workflow/07_outline/outline_result.yaml"
  "08":
    required:
      - "workflow/08_section_write/unit_result.yaml"
    check:
      - "outline_state.yaml 中所有 unit 状态为 written 时，阶段完成"
  "09":
    required:
      - "workflow/09_assemble/proposal_draft.md"
      - "workflow/09_assemble/assemble_report.md"
      - "workflow/09_assemble/assemble_result.yaml"
  "10":
    required:
      - "workflow/10_review/review_report.md"
      - "workflow/10_review/review_result.yaml"
  "11":
    required:
      - "workflow/11_output/proposal.docx"
      - "workflow/11_output/output_result.yaml"
    gate:
      - "workflow/10_review/review_result.yaml 必须存在且 P0_count == 0"
```

---

## 4. proposal_state.yaml 字段权限

### 4.1 字段分类

| 分类 | 字段路径 | 写入者 | 读取者 |
|------|---------|--------|--------|
| **config**（不可变，启动时写入一次） | `project`, `mode_settings`, `research_loop.max_rounds`, `research_loop.auto_exit_criteria`, `document_format.template_heading_numbering` | auto（仅初始化时） | auto |
| **pipeline**（auto 写入，基于 result 文件验证后） | `stages.*.status`, `stages.*.completed_at`, `current`, `writing_loop.*` (来自 outline_state), `review_loop.*` (来自 review_result) | auto（仅验证后） | auto |
| **evidence**（各 skill 独立写入，auto 只读） | `quality.*`, `research_loop.rounds_completed`, `research_loop.decision` | 各阶段 skill（在其 result 文件中），auto 汇总 | auto |

### 4.2 关键约束

- `research_loop.rounds_completed`：**必须由 05-synthesis 在 `synthesis_result.yaml` 中写入**，auto 只从该文件读取并同步到 ./workflow/proposal_state.yaml
- `quality.*`：**必须由对应阶段的 skill 在 result 文件中写入**，auto 只汇总，不得自行修改
- `stages.*.status`：auto 只有在验证 `required_outputs` 全部存在后才能标记为 `completed`
- `config.document_format.template_heading_numbering`：默认 `false`。`false` 表示 Template/reference docx 的 Heading 样式不自带自动编号，09-assemble 必须向 markdown 标题注入编号；`true` 表示 Heading 样式已经绑定自动编号，auto 调用 09 时应传递 `--template-heading-numbering`，09 输出干净标题，避免 docx 双编号。

---

## 5. 阶段顺序连续性约束

### 5.1 标准顺序

```text
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11
```

### 5.2 合法跳跃

以下跳跃是合法的（因为有循环回边）：

- 05 → 02：调研循环回边
- 10 → 08：审阅修复循环回边

### 5.3 非法跳跃（auto 必须拦截）

以下跳跃**必须被 auto 拦截并报错**：

- 任何向前跳过 ≥1 个阶段的行为（如 05→07、09→11）
- 任何 required_stage 被跳过（如 10-review 在 config.required_stages 中）

auto 检测到非法跳跃时：
1. 不执行目标阶段
2. 记录警告到 ./workflow/proposal_state.yaml 的 history
3. 在输出中明确告知用户跳过了哪些阶段
4. 如果跳过的阶段在 `config.required_stages` 中 → **硬阻塞**，不允许继续

---

## 6. 版本

本契约随 plugin 迭代更新。每次修改 workflow 规则时必须同步更新本文档。

当前版本：v1.0（2026-06-25）
