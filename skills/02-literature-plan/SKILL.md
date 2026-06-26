---
name: 02-literature-plan
description: >
  中文项目申请书写作流程第 02 阶段工具：文献查找计划生成。
  根据第 01 阶段课题初始理解，或第 05 阶段综合理解报告，维护一个长期文献调研计划，并为下一阶段 academic-search 生成本轮短期精准调研目标。

  当用户输入 /grant-master:02-literature-plan，或要求生成文献查找计划、生成第 N 轮调研计划、规划下一轮文献调研、生成 academic-search 任务、安排搜索方向、更新长期调研计划、生成本轮搜索 goal 时，使用本 Skill。

  本 Skill 是 01-topic 的下游、03-academic-search 的上游。
  它只负责"查什么"和"本轮优先查什么"的规划，不执行搜索、不精读论文、不综合论文结论、不写申请书正文。
---

# 02-literature-plan：文献查找计划生成

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 02 阶段：**文献查找计划生成**。

核心职责：

```text
01_topic / 05_synthesis
  ↓
02_literature_plan
  ├── 更新长期调研计划 long_plan.yaml（当前最新）
  ├── 保存本轮快照   round_XX/long_plan.yaml
  ├── 更新进度归档   research_archive.yaml
  └── 生成本轮短期目标 round_XX/round_goal.md + search_queries.yaml
  ↓
03_academic_search
```

本 Skill 不执行 academic-search，不下载论文，不精读论文，不形成文献综述结论。

---

## 2. 工作目录规则

以 Claude Code 当前工作目录作为项目根目录。不硬编码任何绝对路径。所有路径都相对当前工作目录。

---

## 3. 阶段编号

```text
01_topic              课题初始理解 / framing v0
02_literature_plan    文献查找计划生成        ← 本 Skill
03_academic_search    文献查找
04_paper_digest       逐篇论文精读
05_synthesis          综合理解 / 更新当前视角
```

---

## 4. 状态管理边界

`./workflow/proposal_state.yaml` 只属于 `auto` 管理。本 Skill 绝不读取、修改或创建该文件。

---

## 5. 输入文件规则

### 5.1 每一轮都必须优先读取已有长期计划

如果存在，必须读取：

```text
./workflow/02_literature_plan/long_plan.yaml
./workflow/02_literature_plan/latest_plan.yaml
```

如果已有历史轮次，还应读取最近一轮的 `round_XX/round_goal.md`、`round_XX/plan_result.yaml`。

目的：继承上一轮计划；避免重复任务；将新任务并入长期计划；选择本轮最应执行的目标。

---

### 5.2 第一轮输入

必须读取：

```text
./workflow/01_topic/01_topic_card.md
./workflow/01_topic/01_topic_result.yaml
./workflow/01_topic/01_literature_seed.yaml
```

可选读取：`./topic.md`、`./requirements.md`、`./applicant_profile.md`、`./references/`

---

### 5.3 第二轮及后续输入

优先读取：

```text
./workflow/05_synthesis/current_view.md
./workflow/05_synthesis/latest_result.yaml
```

可选读取最新一轮的 `03_academic_search` 和 `04_paper_digest` 产物。

后续轮次核心任务：根据上一轮综合理解中仍未解决的问题、新出现的 gap 线索、创新点疑点，更新长期计划，选择下一轮最值得执行的短期搜索 goal。

---

## 6. 轮次判断规则

1. 如果不存在 `./workflow/02_literature_plan/`，创建该目录。
2. 如果不存在任何 `round_XX`，创建第一轮 `round_01`。
3. 已有若干轮时，创建下一个编号的轮次目录。
4. 用户明确指定轮次时，以用户指定为准。
5. 不覆盖已有轮次目录，除非用户明确要求"重写这一轮计划"。

轮次目录命名使用两位数字：`round_01`、`round_02`……

---

## 7. 长期计划与短期目标的关系

### 7.1 长期计划覆盖范围

1. **背景调研计划**（可选）：只在背景不清楚、领域边界不清楚、术语不清楚时才需要。
2. **核心目标调研计划**（必须）：围绕课题最核心问题、最近邻工作、核心 gap 是否成立。
3. **关键技术调研计划**（必须）：围绕课题涉及的关键技术分别设计调研任务。
4. **迭代新增任务**（必须）：每轮 05_synthesis 后可能产生新的问题，进入长期计划。

长期计划每一轮都要更新，不只在第一轮生成。

### 7.2 短期目标规则

1. 背景调研任务可以单独作为一轮。
2. 非背景轮次：可以规划 1-3 个**互不依赖**的并行搜索任务。03-academic-search 支持并行 searcher agents，多条 query 可同时执行。
3. 同一轮内的多个任务必须服务于同一个调研阶段目标（如同一轮回答"现有方法不足"的多个子问题），不允许把松散无关的任务塞进同一轮。
4. 不允许把长期计划中的所有任务一次性交给 academic-search。
5. 本轮 goal 必须能在一轮中执行，并产生可精读的候选论文集合。

---

## 8. 背景调研是否跳过

**可跳过背景调研的条件**（满足任一即可跳过）：

1. `01_topic_card.md` 已清楚说明应用场景、核心矛盾、基本技术背景；
2. `01_topic_result.yaml` 中背景清晰度和文献计划准备度较高；
3. `01_literature_seed.yaml` 已能明确指向核心技术和最近邻工作；
4. `references/` 中已有足够背景材料；
5. 背景调研只会产生泛泛资料，不能有效推动 gap/idea 判断。

**需要背景调研的条件**（满足任一则安排）：课题应用场景不清楚；领域术语不清楚；不知道应查哪些会议或关键词；不清楚该课题属于哪个研究社区。

即使安排背景调研，也只能作为单独一轮，不与核心技术调研混在同一轮。

---

## 9. 输出文件结构

本 Skill 每轮生成或更新：

```text
./workflow/02_literature_plan/long_plan.yaml          # 长期计划（持续更新）
./workflow/02_literature_plan/research_archive.yaml   # 已调研内容归档（持续追加）
./workflow/02_literature_plan/round_XX/long_plan.yaml # 本轮快照（写入后不再修改）
./workflow/02_literature_plan/round_XX/round_goal.md  # 本轮短期目标
./workflow/02_literature_plan/round_XX/search_queries.yaml
./workflow/02_literature_plan/round_XX/plan_result.yaml
./workflow/02_literature_plan/latest_plan.yaml        # 索引文件
```

**各文件职责简述：**

- `long_plan.yaml`：全部调研任务的路线图，持续更新，不直接交给 academic-search 执行。
- `research_archive.yaml`：已完成/已跳过任务的归档总表，方便随时查看整体调研进度。
- `round_XX/long_plan.yaml`：本轮结束时 long_plan 的完整副本，保留各轮计划演变链条，一旦写入不再修改。
- `round_XX/round_goal.md`：告诉 academic-search 本轮查什么、为什么查、查到什么程度、不要查什么。
- `round_XX/search_queries.yaml`：将 round_goal 转化为机器可读的关键词和查询式。
- `round_XX/plan_result.yaml`：供 auto 判断是否可进入第 03 阶段。
- `latest_plan.yaml`：索引文件，指向最新轮次和长期计划，不承载调研内容。

---

## 10. 输出格式参考

写每个输出文件之前，用 Read 工具读取对应的模板文件：

| 输出文件 | 参考模板 |
|---|---|
| `long_plan.yaml` | `references/long_plan_template.yaml`（相对本 Skill 目录） |
| `research_archive.yaml` | `references/research_archive_template.yaml` |
| `round_goal.md` | `references/round_goal_template.md` |
| `search_queries.yaml` | `references/search_queries_template.yaml` |
| `plan_result.yaml` | `references/plan_result_template.yaml`（含成功/阻塞两种格式） |
| `latest_plan.yaml` | `references/latest_plan_template.yaml` |

模板文件位置：本 Skill 目录下的 `references/`（如 `skills/02-literature-plan/references/`）

**按需读取**：只在即将写某个文件时读取对应模板，不要一开始把所有模板全部加载。

---

## 11. `long_plan.yaml` 写入规则

1. 第一轮若不存在，则创建；后续轮次读取并更新。
2. 每轮更新完成后，将 `long_plan.yaml` 完整复制为 `round_XX/long_plan.yaml`（快照）。
3. 不删除历史任务，除非明确标记为 `dropped`。
4. 每个任务必须有 `status` 字段。
5. 每轮可规划 1-3 个互不依赖的并行任务（03 支持并行 searcher agents）。
6. 新增任务写入 `iterative_tasks` 或对应 plan 区域。
7. 被跳过的任务写入 `completed_or_skipped_tasks`，`status` 标注 `skipped`，`reason` 记录跳过依据。
8. 每轮更新后同步更新 `research_archive.yaml`。

---

## 12. `research_archive.yaml` 写入规则

1. 第一轮若不存在，则创建；后续轮次读取并追加，不覆盖历史记录。
2. `completed_tasks` 和 `skipped_tasks` 只增不减。
3. `pending_overview` 每轮刷新，反映当前待办状态。
4. 本文件是进度速查文件，不替代 `long_plan.yaml`。

---

## 13. `search_queries.yaml` 写入规则

1. `round` 和路径中的 `round_XX` 必须与实际轮次一致。
2. 非背景轮次的 `queries` 通常 4-12 条（1-3 个并行任务 × 每个任务 3-4 条 query），queries 之间互不依赖以支持并行执行。
3. 不把长期计划中的所有任务都写进 `queries`。
4. `target_total_papers` 默认 10-15；背景轮可放宽到 20-30。

---

## 14. 选择本轮短期目标的规则

1. 优先选择能最大幅度降低当前不确定性的任务；
2. 优先选择能确认或否定核心问题成立性的任务；
3. 优先选择与 `grant-paper-digest` 和 `grant-synthesis` 直接相关的任务；
4. 不优先选择泛泛背景资料，除非背景确实不清楚；
5. 不选择过宽任务；不选择与上一轮高度重复的任务；
6. 后续轮次优先响应 `05_synthesis` 提出的未解决问题和新增任务；
7. 如果多个任务都重要，选依赖关系最靠前的任务；
8. 用户明确指定方向时，以用户指定为准，但仍要控制范围。

非背景轮次的本轮目标必须符合：**1-3 个互不依赖的并行问题 + 每组问题有 3-4 条检索式 + 可形成 10-15 篇核心精读论文（每任务 3-5 篇）。**

---

## 15. 跳过标注规则

生成每轮计划时，必须主动检查是否有任务可以跳过。

### 15.1 可跳过的依据来源

**来自输入文件：**
- `01_topic_result.yaml` 中 `background_clarity: high` → 背景调研可跳过；
- `01_topic_card.md` 已明确说明核心技术路径 → 相关背景方向可跳过；
- `05_synthesis/current_view.md` 明确标注某方向"已有足够证据"；
- `references/` 中已有覆盖该方向的论文；
- 上一轮 `plan_result.yaml` 或 `long_plan.yaml` 已标注 `completed` 或 `synthesized`。

**来自用户语句：**
- 用户明确说"不需要查 X"或"跳过 X 方向"；
- 用户说"我们已经知道 Y，不用再调研"；
- 用户指定了本轮目标，隐含跳过了其他任务。

### 15.2 跳过的处理要求

识别到可跳过任务时，必须同时处理五个位置：

1. `long_plan.yaml`：将该任务 `status` 改为 `skipped`，`completed_or_skipped_tasks` 中记录 `reason`；
2. `round_goal.md` Section 2：列出本轮跳过的任务及理由；
3. `research_archive.yaml`：`skipped_tasks` 中追加该任务，填写 `skip_source` 和 `reason`；
4. `search_queries.yaml`：`long_plan_context.skipped_task_ids_this_round` 中列出跳过的任务 ID；
5. `round_XX/long_plan.yaml`（快照）：快照自然包含已更新的 skipped 状态。

### 15.3 跳过注意事项

- 跳过不等于永久放弃。后续若产生新证据，可将 `status` 改回 `pending` 并说明原因；
- 不轻易将高优先级核心任务标注为跳过，除非有明确依据；
- 跳过理由必须可追溯，读到 `reason` 字段的人应能理解为什么跳过。

---

## 16. 阻塞规则

### 16.1 第一轮阻塞

缺少以下任一文件时，生成 blocked 版 `plan_result.yaml` 并提示运行 `/grant-master:01-topic`：

```text
workflow/01_topic/01_topic_card.md
workflow/01_topic/01_literature_seed.yaml
```

### 16.2 后续轮次阻塞

第二轮及后续缺少 `workflow/05_synthesis/current_view.md` 时，提示先完成 `academic-search → grant-paper-digest → grant-synthesis`。

### 16.3 计划过宽阻塞

本轮任务之间互有依赖（无法并行）或方向过于松散（>3 个不相关方向）时，向用户提出最多 3 个选择问题。

---

## 17. 最终响应格式

```text
已生成/更新第 XX 轮文献查找计划：

长期计划（含本轮快照）：
- workflow/02_literature_plan/long_plan.yaml（当前最新）
- workflow/02_literature_plan/round_XX/long_plan.yaml（本轮快照）

调研进度归档：
- workflow/02_literature_plan/research_archive.yaml

本轮短期目标：
- workflow/02_literature_plan/round_XX/round_goal.md
- workflow/02_literature_plan/round_XX/search_queries.yaml

阶段结果：
- workflow/02_literature_plan/round_XX/plan_result.yaml
- workflow/02_literature_plan/latest_plan.yaml

本轮 goal：[一句话]

本轮跳过的任务（如有）：任务 ID：... 原因：...

下一步：使用 academic-search 执行 workflow/02_literature_plan/round_XX/round_goal.md
预期第 03 阶段输出目录：workflow/03_academic_search/round_XX/
```

阻塞时：说明缺少什么输入，提示下一步操作，不生成计划文件。

---

## 18. 质量要求

1. 所有正文输出使用中文；查询式可以使用英文；
2. 不硬编码绝对路径，默认使用当前工作目录；
3. 不读取、修改、创建 `./workflow/proposal_state.yaml`；
4. 每轮更新顶层 `long_plan.yaml` 后，必须复制快照至 `round_XX/long_plan.yaml`；
5. 生成计划时必须主动检查可跳过任务，有依据时在所有相关文件中标注；
6. 非背景轮次可规划 1-3 个互不依赖的并行任务（03 支持并行搜索），但必须服务于同一调研阶段目标；
7. 不执行 academic-search，不精读论文，不生成文献综述结论，不生成 gap 或创新点结论，不写申请书正文；
8. 写输出文件前，用 Read 工具读取对应参考模板；
9. 最终响应中不要执行其他 Skill。

## 19. 产出物完整性自检

本阶段所有文件写入完成后，执行以下自检：

1. 检查以下文件是否存在且非空：
   - `workflow/02_literature_plan/long_plan.yaml`
   - `workflow/02_literature_plan/research_archive.yaml`
   - `workflow/02_literature_plan/round_XX/round_goal.md`
   - `workflow/02_literature_plan/round_XX/search_queries.yaml`
   - `workflow/02_literature_plan/round_XX/long_plan.yaml`
   - `workflow/02_literature_plan/round_XX/plan_result.yaml`
   - `workflow/02_literature_plan/latest_plan.yaml`
2. 将验证结果写入 `plan_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. 若 `all_outputs_present: false` → 不声称阶段完成，在最终响应中说明缺失文件。
