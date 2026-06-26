---
name: 05-synthesis
description: >
  中文项目申请书写作流程第 05 阶段工具：综合理解与专家视角积累。
  在每轮论文精读结束后，综合所有已读材料，持续深化对该研究领域的专家理解：
  这个领域在解决什么问题、现有工作怎么做的、做得怎么样、哪里还不够、可能怎么做得更好。
  维护项目的综合理解文件 current_view.md，为进入 06-helm 积累足够的知识基础。

  当用户输入 /grant-master:05-synthesis，或在 grant 工作流中需要综合调研结论、更新领域理解时，使用本 Skill。

  本 Skill 是 04-paper-digest 的下游、02-literature-plan（继续调研）和 06-helm（进入方案）的上游。
  它只负责积累和深化领域理解，不做最终方案决策、不写申请书正文。
---

# 05-synthesis：综合理解与专家视角积累

## 1. 阶段定位

本 Skill 的核心任务是：**读完这一轮的论文之后，我对这个领域到底理解了什么？**

经过多轮调研和精读，synthesis 要让你逐渐成为这个领域的行家，能够清楚地回答：

- 这个研究领域在研究什么问题？
- 现在的工作是怎么做的？各自有什么优劣势？
- 哪些问题已经被解决得比较好了？
- 哪些问题还没有被充分解决，或者解决方案有明显不足？
- 优化空间在哪里？可能的技术路线有哪些？
- 本课题的方向在这个大背景下处于什么位置？

这些理解积累在 `current_view.md` 中，是后续 `06-helm` 制定方案的主要知识来源。

```text
04_paper_digest（本轮精读报告）
  ↓
05_synthesis（本 Skill）
  ├── 综合本轮新知识 + 已有 current_view
  ├── 更新对领域的专家理解
  └── 判断：继续调研 / 进入 helm
  ↓
  ├── 仍需调研 → 02-literature-plan
  └── 知识积累足够 → 06-helm
```

本 Skill 不执行文献查找，不精读 PDF，不做方案决策，不写申请书正文。

---

## 2. 输入文件

### 2.1 每轮必须读取

```text
workflow/04_paper_digest/round_XX/digest_report.md       # 本轮精读报告（主要输入）
workflow/02_literature_plan/round_XX/round_goal.md       # 本轮调研想回答的问题
workflow/02_literature_plan/long_plan.yaml               # 整体调研计划
```

### 2.2 增量更新基础（已有时必须读取）

```text
workflow/05_synthesis/current_view.md                    # 已有的综合理解（代表所有历史轮次）
workflow/05_synthesis/latest_result.yaml
```

**不要重新读取所有历史轮次的报告**——`current_view.md` 已经是历史积累的精华。每轮只需要把新知识融入进去。

### 2.3 首轮额外读取（`current_view.md` 不存在时）

```text
workflow/01_topic/01_topic_card.md
workflow/01_topic/01_topic_result.yaml
workflow/01_topic/01_literature_seed.yaml
```

### 2.4 建议读取

```text
workflow/04_paper_digest/paper_index.yaml               # 了解已精读论文全集
topic.md / requirements.md / applicant_profile.md       # 课题约束与申请背景
```

---

## 3. 核心任务：建立并深化领域专家理解

synthesis 的工作**不是"总结一下这几篇论文写了什么"**，而是把读到的内容转化为对这个领域真正的理解和判断。

### 3.1 深度原则

**每一轮 synthesis 必须产生可量化的理解深化。** 不是"读了 X 篇论文、新增了 Y 条认知"，而是：

- 这轮之后，对核心问题的理解**具体**到了什么程度？
- 哪个 gap 的置信度从"猜测"变成了"有文献支撑"？
- 哪个方向从"可能可行"变成了"明确可行/不可行"？
- 对最近邻工作的评价从"可能相关"细化到了"在哪个具体维度上不同"？

**禁止的输出风格**：要点罗列、变更日志、摘要集合。这会让 synthesis 退化为"读书笔记"，失去专家视角的深度。

**要求的输出风格**：成段的分析叙述——每条发现必须附带"证据→分析→对课题意味着什么"的完整推理链。

### 3.2 每轮必须回答的关键问题

**关于这个领域**：
- 这个研究方向解决的核心问题是什么？应用场景是什么？
- 这个领域里有哪些主流方向或技术流派？各自的思路是什么？
- 最近几年有什么新趋势？

**关于现有工作**：
- 最近邻的工作做了什么？用的什么方法？
- 哪些问题已经被解决得比较好了，哪些还差得远？
- 现有方法在什么场景下有效？在本课题的场景下够用吗？**如果不够用，具体差在哪里？**

**关于不足和机会**：
- 现有方法明显的短板在哪里？是场景不对、约束没考虑、还是性能不够？
- 这些短板重要吗？有论文或数据能说明这个问题确实存在并且值得解决？
- 如果要改进，可能的方向有哪些？现有工作有没有给出线索？

**关于本课题**：
- 课题所瞄准的方向，在领域全景里处于什么位置？
- 课题的创新点落脚在哪个具体的"现有方法不够用"上？
- 目前对这个问题的理解是否足够深？还需要补哪些知识？

### 3.3 两个核心产出物的定位

| 产出物 | 定位 | 读者 | 要求 |
|--------|------|------|------|
| `synthesis_report.md`（轮次报告） | 深度分析文档——本轮对关键问题的分析、判断和推理过程 | 后续自己回顾、trace 决策依据 | 成段叙述，每条分析 200-500 字，"证据→分析→影响"三段论 |
| `current_view.md`（综合手册） | 自包含的领域说明书——当前最完整、最权威的理解 | helm、outline、任何需要了解领域全貌的人 | 可以独立阅读，不依赖轮次报告即可理解全貌。指向轮次报告追溯详细证据链 |

---

## 4. `current_view.md` 的维护方式

路径：`workflow/05_synthesis/current_view.md`

### 4.1 这是什么

`current_view.md` 是**自包含的领域说明书**——它不是论文摘要集合，不是轮次报告追加，而是一份可以独立阅读的完整参考手册。任何人读完它，应该能理解：这个领域在解决什么问题、现有工作怎么做的、哪里还不够、本课题打算怎么做。

每轮 synthesis 结束后，它应该比上一轮更深刻、更完整——认知更确定了、假设被推翻了、新机会被发现了。它保存的是**最佳当前理解**，不是历史记录。

### 4.2 如何更新

- **自包含原则**：current_view.md 不依赖轮次报告即可独立阅读。它写的是"结论"，轮次报告写的是"推理过程"。
- **不要简单追加**：旧内容如果已经过时或被推翻，直接修改或删除。旧版本中基于不完整信息做出的判断，如果已被新证据推翻，就应该删除而非保留。
- **保留演进标记**：如果某个观点发生了重大变化，在正文中标注 `[更新于 round_XX]` 或 `[已推翻，见 round_XX/synthesis_report.md]`。
- **指向轮次报告**：每节末尾可以添加 `> 详细证据链及分析过程见 round_XX/synthesis_report.md §X`，供需要追溯推理细节的人使用。
- **保持叙述流畅**：current_view.md 是手册，不是数据库——它应该有清晰的分析叙述和逻辑流，让读者可以连贯阅读，而不是在碎片化条目之间跳转。

### 4.3 结构

写 `current_view.md` 前，用 Read 工具读取：

```text
current_view_template.md
```

使用该模板的六节结构（领域概况 / 现有工作全景 / 主要不足与 gap / 可能的突破方向 / 与本课题的关联 / 下一步判断）。

### 4.4 `evidence_ledger.yaml` 的维护方式

路径：`workflow/05_synthesis/evidence_ledger.yaml`

与 `current_view.md` 一样，`evidence_ledger.yaml` 是每轮增量更新的。它的维护遵循以下规则：

- **增量追加，不覆盖**：新 claim 追加到 `claims` 列表，旧 claim 修改时保留原 ID 并标注更新轮次；
- **被推翻的不删除**：将 `status` 改为 `contradicted`，在 `caveat` 中记录推翻依据和来源；
- **每轮结束后立即更新**：读完 digest_report 并更新 current_view 后，同步更新 evidence_ledger；
- **claim 必须有来源**：每个 claim 必须通过 `sources[].report` 可追溯到具体的 paper digest 或其他上游文件；
- **usable 标注必须诚实**：`usable_for_helm` 和 `usable_for_application_text` 必须基于证据强度，不夸大。

写 `evidence_ledger.yaml` 前，用 Read 工具读取：

```text
evidence_ledger_template.yaml
```

---

## 5. 输出文件结构

```text
workflow/05_synthesis/
  current_view.md                              # 当前最新专家视角（每轮增量更新）
  evidence_ledger.yaml                         # 前级证据索引——helm 和 outline 的证据入口
  latest_result.yaml                           # 最新轮次指针
  round_XX/
    synthesis_report.md                        # 本轮新增理解与变更记录
    synthesis_result.yaml                      # 阶段状态（给 auto 读）
```

写输出文件前，用 Read 工具读取对应参考模板：

| 输出文件 | 参考模板 |
|---|---|
| `current_view.md` | `references/current_view_template.md` |
| `evidence_ledger.yaml` | `references/evidence_ledger_template.yaml` |
| `synthesis_report.md` | `references/synthesis_report_template.md` |
| `synthesis_result.yaml` | `references/synthesis_result_template.yaml`（含成功/阻塞两种格式） |
| `latest_result.yaml` | `references/latest_result_template.yaml` |

模板文件位置：本 Skill 目录下的 `references/`（如 `skills/05-synthesis/references/`）

### 5.1 evidence_ledger.yaml 的职责

这是 synthesis 最重要的输出之一——**它是后续所有阶段（helm、outline）的证据入口**。

helm 和 outline 不应该从 03、04 的大量原始文件中捞信息。它们先通过 `evidence_ledger.yaml` 找到需要的证据，再按 `sources[].report` 路径按需追溯。

每轮 synthesis 结束后，**必须增量更新** `evidence_ledger.yaml`：

- **claims**：本轮新确认或推翻的论断。每条 claim 必须标注：
  - `usable_for_helm`：是否可以作为方案规划的输入依据
  - `usable_for_application_text`：是否可以写入申请书正文（如研究现状论述）
  - `evidence_level`：strong / medium / weak / contradict
  - `sources[].report`：可追溯的精读报告路径
- **gap_candidates**：本轮识别或更新的 gap 候选。标注 confidence、场景匹配度、可解决性、可验证性
- **hypotheses**：本轮验证或推翻的假设
- **technical_inspirations**：从论文中获得的技术启发

更新原则：
- 旧 claim 的证据等级变化时，修改原条目并标注 `[更新于 round_XX]`
- 被推翻的 claim 不删除——将 `status` 改为 `contradicted` 并记录推翻依据
- 不要在 evidence_ledger 中放入 synthesis 的"个人判断"——每条 claim 必须有明确的论文/数据来源

---

## 6. 跳过调研任务的判断

跳过调研任务是**高风险决策**——跳过核心任务可能导致 helm 在证据不充分的情况下做出方案决策。以下规则强制执行。

### 6.1 绝对不允许跳过的情况

以下情况**无论如何不能建议跳过**，除非用户明确指令：

1. **long_plan 中标记为 `priority: high` 的核心任务**：即使已精读的论文似乎部分回答了该任务的问题，也不能推断"已充分覆盖"——除非该任务的所有子问题都能在 evidence_ledger 中找到 `evidence_level: strong` 的 claim
2. **被多个上游文件独立标记为"待验证"的方向**：如果 01_literature_seed、long_plan 和 current_view 都指出某方向需要调研，不能仅凭一轮精读就跳过
3. **与核心 gap 直接相关的验证任务**：gap 是本课题创新性的根基——验证 gap 是否成立的任务必须执行到证据强度达到 strong 或 gap 被明确推翻为止

### 6.2 可以建议跳过的情况（需多源依据）

满足以下**至少两个**条件，才可以建议跳过：

- 已精读的 ≥3 篇独立论文充分回答了该任务的所有子问题，且在 evidence_ledger 中有对应的 strong-evidence claim
- 该方向与核心问题关联很弱（在 current_view.md 的领域全景中处于边缘位置），且跳过不影响核心 gap 的置信度
- 用户明确说了这个方向不用查
- 该任务是纯工程细节（如具体 API 选型），不影响申请书的核心论证主线

### 6.3 跳过建议的文档要求

每条跳过建议必须写入 `synthesis_report.md` §7，包含：
- 任务 ID 和描述
- 本轮的具体证据（哪些论文的什么发现使得该任务不需要专门调研）
- 为什么这个证据足以替代专门调研
- 跳过风险：如果证据后来被推翻，对 helm 方案的影响是什么

跳过建议同时写入 `synthesis_result.yaml` 的 `skip_recommendations`。

---

## 7. 进入 helm 的判断

**helm 是方案收敛——一旦进入，调研循环终止，后续只出不进。因此准入条件必须严格。**

### 7.1 硬性门槛（以下条件必须全部满足）

在 `synthesis_result.yaml` 中设 `ready_for_helm: true` 之前，逐项确认：

**1. 核心 gap 确认程度**
- 至少有一个核心 gap 在 evidence_ledger 中被 ≥3 篇独立论文的 claim 支撑（`evidence_level: strong`），且没有 contradict 类型的 claim
- 该 gap 的描述已经具体到"在 [场景] 下，当 [约束] 时，现有方法 [具体失效模式]"

**2. 最近邻覆盖**
- long_plan 中标记为核心的所有最近邻方向（C1/C2/...）均已至少执行一轮
- 每个最近邻方向至少有 3-5 篇精读论文，且已写入 current_view.md §二 的对应方向分析
- 不存在"知道某篇重要论文存在但未精读"的情况

**3. 领域全景清晰**
- current_view.md §二 的工作全景至少覆盖了该领域的 3 个以上独立方向
- 能清楚说明本课题在这幅全景图中的位置（§五）
- 不存在"某个大方向完全没看过"的情况

**4. 技术路线有备选**
- §四 中至少有 2 个有文献支撑的候选突破方向
- 每个方向的可行性、创新性、可验证性都已被评估
- 不是"只有一个 idea"

**5. 多轮验证**
- **第一轮 synthesis 不允许建议进入 helm**（除非用户明确要求，或 long_plan 中所有核心任务在本轮前已被标注为 completed）
- 至少经过 3 轮调研循环（02→03→04→05 至少运行 2 次），且第3轮的新增认知相比第1、2轮确实减少了

**6. 边际收益递减确认**
- 最近一轮 synthesis 的核心发现中，不存在"改变了主线判断"的重大新认知
- 如果最近一轮仍在发现重要的新 gap 或推翻之前的判断，说明领域理解还在快速收敛中，应继续调研

### 7.2 明确禁止进入 helm 的情况

以下任一情况存在时，**必须设 `ready_for_helm: false`**：

- 最核心的近邻工作（在 long_plan 中标记为最高优先级的）还没精读
- 最重要的 gap 只有 1 篇或没有文献支撑
- 对领域全景还很模糊——说不清有几个主流方向
- 候选突破方向少于 2 个
- 只有 1 轮调研
- 最近一轮的核心发现仍在大幅改变对课题方向的判断
- 有用户明确要求查但还没查的方向

### 7.3 条件性进入

如果 7.1 的条件大部分满足但有 1-2 项需要补充，可以建议"条件性进入"：

```yaml
ready_for_helm: "conditional"
helm_conditions:
  - "进入 helm 后，在确定 QoS 方案前需精读 Justitia/Palladium（2-3 篇）"
  - "PFC 风险量化数据可在方案设计中按需补充"
```

条件性进入时，`recommended_next_stage` 仍为 `"HELM"`，但在 `synthesis_result.yaml` 的 `notes` 中列出 helm 阶段需要按需追溯的 L3 任务。

---

## 8. 阻塞规则

| 情况 | 处理方式 |
|------|---------|
| 本轮 `digest_report.md` 缺失 | 生成 blocked 版 `synthesis_result.yaml`，提示先完成 04-paper-digest |
| 首轮 `01_topic_card.md` 缺失 | 生成 blocked 版，提示先完成 01-topic |
| `round_goal.md` 缺失 | 可继续，但在报告中标注本轮调研目标不清晰 |

---

## 9. 最终响应格式

```text
已完成第 XX 轮综合理解更新：

本轮主要新增理解：
- [2-3 条最重要的新认知]

current_view.md 主要变化：
- [更新了哪些内容，推翻了什么旧判断]

输出文件：
- workflow/05_synthesis/current_view.md
- workflow/05_synthesis/evidence_ledger.yaml
- workflow/05_synthesis/round_XX/synthesis_report.md
- workflow/05_synthesis/round_XX/synthesis_result.yaml
- workflow/05_synthesis/latest_result.yaml

跳过建议：X 项（见 synthesis_result.yaml）

是否建议进入 helm：是/否
理由：[核心依据，1-2 句]

下一步：
- 继续 02-literature-plan 第 N 轮（建议查：...）
或
- 进入 06-helm
```

---

## 10. 质量要求

1. 所有正文使用中文；
2. 不硬编码绝对路径；
3. 不读取、修改、创建 `./workflow/proposal_state.yaml`；
4. 每轮只读新材料 + 已有 current_view，不重读历史轮次报告；
5. `current_view.md` 是自包含的领域说明书，可以独立阅读，不依赖轮次报告；
6. `synthesis_report.md` 是深度分析文档，每条发现必须包含"证据→分析→对课题的影响"完整推理链——禁止写成要点罗列或变更日志；
7. 对"不足"和"gap"的描述必须具体——有场景、有约束、有具体失效模式、有文献来源标注，不写空泛套话；
8. 技术方向是线索和候选，不是最终方案——但必须达到"可以做 helm 决策"的信息密度；
9. 跳过建议必须有本轮证据依据，核心任务不能仅凭推断跳过；
10. 写输出文件前读对应参考模板，按需加载；
11. 最终响应中不要执行其他 Skill。

## 11. 产出物完整性自检

本阶段所有文件写入完成后，执行以下自检：

1. 检查以下文件是否存在且非空：
   - `workflow/05_synthesis/current_view.md`
   - `workflow/05_synthesis/evidence_ledger.yaml`
   - `workflow/05_synthesis/round_XX/synthesis_report.md`
   - `workflow/05_synthesis/round_XX/synthesis_result.yaml`
   - `workflow/05_synthesis/latest_result.yaml`
2. 将验证结果写入 `latest_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. `synthesis_result.yaml` 中亦须包含 `integrity` 字段。
4. 若 `all_outputs_present: false` → 不声称阶段完成，`rounds_completed` 不递增。
