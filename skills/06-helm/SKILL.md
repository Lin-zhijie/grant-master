---
name: 06-helm
description: >
  中文项目申请书写作流程第 06 阶段工具：整体方案规划与项目主线收敛。
  根据 05-synthesis 的综合视角和 topic.md，从前期调研结论中筛选出最适合申请书的核心问题、主技术路线和整体方案，输出供 07-outline 直接使用的结构化蓝图。

  当用户输入 /grant-master:06-helm，或在 grant 工作流中需要从 synthesis 结论收敛为项目方案、确定申请书主线时，使用本 Skill。

  本 Skill 是 05-synthesis 的下游、07-outline 的上游。
  它只负责方案规划与收敛，不继续调研、不精读论文、不重新做 synthesis、不写申请书大纲或正文。
---

# 06-helm：整体方案规划与项目主线收敛

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 06 阶段：**整体方案规划与项目主线收敛**。

核心职责：

```text
05_synthesis（current_view.md）+ topic.md
  ↓
06_helm（本 Skill）
  ├── 从调研结论中筛选核心问题与主技术路线
  ├── 规划整体系统方案与研究内容
  ├── 明确项目边界（做什么 / 不做什么）
  └── 输出结构化蓝图供 07-outline 使用
  ↓
07_outline
```

要解决的问题：经过 synthesis 之后，已有很多可能方向、很多技术路线、很多 gap 线索。申请书不能什么都写。**本阶段要收敛为一个聚焦、完整、创新、可验证的项目方案。**

本 Skill 不继续调研，不精读论文，不重新做 synthesis，不写大纲，不写正文。

---

## 2. 工作目录规则

以 Claude Code 当前工作目录作为项目根目录。不硬编码任何绝对路径。所有路径都相对当前工作目录。

---

## 3. 状态管理边界

`./workflow/proposal_state.yaml` 只属于 `auto` 管理。本 Skill 不读取、不修改、不创建该文件。

---

## 4. 输入文件规则

helm 的职责是方案收敛。输入分为三级：

### 4.1 L1：主输入（默认必读）

这些文件决定 helm 能否工作。**每次调用必须全部读取。**

```text
./topic.md
./workflow/05_synthesis/current_view.md
./workflow/05_synthesis/latest_result.yaml
./workflow/05_synthesis/evidence_ledger.yaml
```

| 文件 | 提供什么 |
|------|---------|
| `current_view.md` | 当前对领域和问题的综合理解——gap 在哪、现有方法局限在哪、可能方向有哪些 |
| `evidence_ledger.yaml` | 每个 claim 的证据等级——哪些论断有证据支撑、哪些 gap 可信、哪些只能作为启发 |
| `latest_result.yaml` | synthesis 是否认为已经 `ready_for_helm`——以及还剩哪些未解决的问题 |

若缺少任一 L1 文件，生成 blocked 版 `helm_result.yaml`，不要编造方案。

### 4.2 L2：证据索引（默认必读）

这些文件帮助 helm 判断调研全局状态，**每次调用应读取**：

```text
./workflow/02_literature_plan/long_plan.yaml
./workflow/04_paper_digest/paper_index.yaml
./requirements.md
./applicant_profile.md
./CLAUDE.md
```

| 文件 | 提供什么 |
|------|---------|
| `long_plan.yaml` | 哪些调研任务已完成、哪些被跳过、长期调研路线 |
| `paper_index.yaml` | 精读了哪些论文，每篇的被引/venue/与课题关联 |
| `requirements.md` | 申报要求（项目类型、经费、年限、特殊约束） |
| `applicant_profile.md` | 团队基础——能支撑什么规模/类型的方案 |
| `CLAUDE.md` | 项目规则、特殊约束 |

### 4.3 L3：原始细节（按需追溯）

**不要一开始全部读完。** 只在需要验证某个 claim、gap、baseline 或技术路线的证据强度时，按以下路径追溯：

**追溯入口**：先从 `evidence_ledger.yaml` 的 `claims[].sources[].report` 字段定位到具体文件路径，再读取。

```text
# 按需追溯的典型路径：
helm 想确认某个 gap 是否真的有证据
  ↓
先看 evidence_ledger.yaml 的 claims / gap_candidates
  ↓
找到对应 claim 的 sources[].report 路径
  ↓
读取该 report（如 workflow/04_paper_digest/round_02/reports/Q1/papers/P003.md）
```

L3 文件池：
```text
workflow/04_paper_digest/round_XX/reports/{batch_id}/papers/*.md         # 单篇精读报告
workflow/04_paper_digest/round_XX/digest_report.md    # 某轮综合精读报告
workflow/03_academic_search/round_XX/search_summary.md
workflow/03_academic_search/round_XX/candidate_papers.md
workflow/02_literature_plan/round_XX/round_goal.md
workflow/01_topic/01_topic_card.md
```

**追溯原则**：每次追溯只读与当前要验证的具体问题直接相关的那个文件段落——不要通读整篇 report，不要在 L3 层做发现性浏览。

---

## 5. 核心约束

方案规划必须遵守以下约束，不得突破：

1. 聚焦几个关键核心问题，不要过度扩充；
2. 梳理技术路线，将关键问题串联，确保每个问题有对应的技术路线/方案进行解决；
3. 每个保留的问题都必须有对应解决方法；
4. 每个技术模块都必须服务核心问题；
5. 每个方案主张都必须能够被验证；
6. 不要把 synthesis 中的所有方向都塞进方案；
7. 必须明确哪些方向不做，以及为什么不做；
8. 如果候选方向过多无法收敛，应阻塞并请用户选择方向（最多提出 3 个选择问题）。

---

## 6. 执行流程

### 第 1 步：读取输入

1. 读取所有 L1 文件：`topic.md`、`current_view.md`、`latest_result.yaml`、`evidence_ledger.yaml`。确认 synthesis 已给出 `ready_for_helm`，理解 gap 线索、idea 候选、证据等级全景。
2. 读取所有 L2 文件：`long_plan.yaml`、`paper_index.yaml`、`requirements.md`、`applicant_profile.md`、`CLAUDE.md`。了解调研全局状态、精读覆盖面、申请约束和团队基础。
3. 遇到需要验证的 claim 或 gap 时，按 evidence_ledger 的 sources 路径追溯 L3——只读相关段落，不全量通读。

### 第 2 步：构建候选问题池

从 synthesis `current_view.md` 的 E（Gap）、F（创新候选）节提取候选问题，评估每个候选问题的重要性、适合性、可验证性和风险。

### 第 3 步：构建候选技术路线池

从 synthesis `current_view.md` 的 F（创新候选）、G（技术路线）节提取候选路线，评估每条路线的创新性、可行性、验证方式和风险。

### 第 4 步：筛选与收敛

从候选池中严格筛选出关键核心问题和技术路线。

选择标准：与 topic 贴合 / 证据充分 / 问题重要 / 不足明确 / 方案可落地 / 创新点可表达 / 指标可验证 / 范围不过大 / 风险可控。

对被放弃的方向，明确其去向：`background_only`、`future_work`、`dropped` 或 `need_more_research`。

若此步无法收敛，阻塞，向用户提出最多 3 个选择问题。

### 第 5 步：规划整体方案

规划最终项目方案：项目主线、系统架构、关键模块（角色、方法、输入输出、模块关系）、数据流、控制流、回退机制、安全边界。

### 第 6 步：规划验证逻辑

规划验证方案：baseline、对比方案、核心指标、实验场景、模块级验证、端到端验证、仍需用户确认的指标。

### 第 7 步：明确项目边界

明确本项目做什么 / 不做什么 / 作为扩展 / 只在背景提及 / 暂时放弃，以及选择理由。

### 第 8 步：写输出文件

写所有 4 个输出文件（格式见 §7），每个文件写前先用 Read 工具读取对应参考模板。

### 第 9 步：产出物完整性自检

1. 检查以下文件是否存在且非空：
   - `workflow/06_helm/helm_report.md`
   - `workflow/06_helm/scheme_blueprint.yaml`
   - `workflow/06_helm/decision_log.md`
   - `workflow/06_helm/helm_result.yaml`
2. 将验证结果写入 `helm_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. 若 `all_outputs_present: false` → 设置 `can_continue: false`，不声称阶段完成。缺失 scheme_blueprint.yaml 时必须阻塞——07-outline 依赖此文件。

---

## 7. 输出文件结构

若 `./workflow/06_helm/` 不存在，先创建。

```text
workflow/06_helm/
  helm_report.md          # 完整方案规划报告（给人看）
  scheme_blueprint.yaml   # 结构化蓝图（给 07-outline 读）
  decision_log.md         # 取舍决策记录（追溯用）
  helm_result.yaml        # 阶段状态（给 auto 读）
```

写每个输出文件前，用 Read 工具读取对应参考模板：

| 输出文件 | 参考模板 |
|---|---|
| `helm_report.md` | `references/helm_report_template.md` |
| `scheme_blueprint.yaml` | `references/scheme_blueprint_template.yaml` |
| `decision_log.md` | `references/decision_log_template.md` |
| `helm_result.yaml` | `references/helm_result_template.yaml`（含成功/阻塞两种格式） |

模板文件位置：本 Skill 目录下的 `references/`（如 `skills/06-helm/references/`）

**按需读取**：只在即将写某个文件时读取对应模板。

### 各文件职责

- `helm_report.md`：12 节完整报告，含候选池、筛选过程、最终方案、验证计划、写作蓝图；
- `scheme_blueprint.yaml`：结构化蓝图，`07-outline` 直接读取，告诉 outline 如何组织申请书；
- `decision_log.md`：记录哪些方向被放弃及原因，供后续回溯；
- `helm_result.yaml`：阶段状态，`can_continue / recommended_next_stage / quality` 等字段供 auto 读取。

---

## 8. 阻塞规则

| 情况 | 处理方式 |
|------|---------|
| L1 文件缺失（topic.md / current_view.md / evidence_ledger.yaml / latest_result.yaml） | 生成 blocked 版 `helm_result.yaml`，提示先完成对应上游阶段 |
| 候选方向过多无法收敛 | 阻塞，向用户提出最多 3 个选择问题（不要自行假设用户意图） |

---

## 9. 最终响应格式

```text
已完成整体方案规划：

核心问题：[一句话]
主技术路线：[一句话]
研究内容：[X 项]

输出文件：
- workflow/06_helm/helm_report.md
- workflow/06_helm/scheme_blueprint.yaml
- workflow/06_helm/decision_log.md
- workflow/06_helm/helm_result.yaml

不采用方向：[X 项，见 decision_log.md]

关键风险与待确认问题：
1. ...
2. ...

下一步建议：进入 07-outline，根据 scheme_blueprint.yaml 生成申请书大纲。
```

阻塞时：说明缺少什么输入或方案无法收敛，提出最多 3 个问题，不生成方案文件。

---

## 10. 质量要求

1. 所有正文输出使用中文；
2. 不硬编码项目绝对路径，默认使用当前工作目录；
3. 不读取、不修改、不创建 `./workflow/proposal_state.yaml`；
4. 写输出文件前用 Read 工具读取对应参考模板，按需读取；
5. 严格遵守 §5 核心约束，不生成多路线、多核心问题的发散方案；
6. 必须明确不做什么，以及为什么不做；
7. 创新点必须能被验证，不生成空泛创新点；
8. `scheme_blueprint.yaml` 必须足够结构化，让 07-outline 无需再做方案判断；
9. 不继续调研，不精读论文，不重新做 synthesis；
10. 最终响应中不要执行其他 Skill。
