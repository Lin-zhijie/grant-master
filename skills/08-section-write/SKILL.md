---
name: 08-section-write
description: >
  中文项目申请书写作流程第 08 阶段工具：逐 unit 写作。
  每次调用读取 outline_state.yaml，找到第一个 status=pending 的 writing unit，结合 writing_units.yaml 中的段落槽位/证据/论证要素和全局上下文，将该 unit 扩写成正式正文，写入独立的 .md 文件，然后更新 outline_state.yaml 标记该 unit 为 written。

  当用户输入 /grant-master:08-section-write，或在 grant 工作流中需要逐 unit 撰写申请书正文、推进写作进度、续写下一 unit 时，使用本 Skill。

  本 Skill 是 07-outline 的下游、09-assemble 的上游。
  它只负责逐 unit 扩写正文和更新状态，不合并、不全局审阅、不生成终稿。
---

# 08-section-write：逐 unit 写作

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 08 阶段：**逐 unit 写作**。

核心职责：

```text
07_outline（outline_state.yaml + writing_units.yaml + outline_report.md）
  + 已写好的 unit .md 文件（用于上下文一致性）
    ↓
08_section_write（本 Skill）——每次调用执行一次
  ├── 读取 outline_state.yaml，找到第一个 status=pending 的 writing unit
  ├── 读取 writing_units.yaml，获取该 unit 的完整写作蓝图（paragraph_slots/sources/avoid）
  ├── 读取全局上下文（大纲全貌 + 已写好的相邻 unit + helm/synthesis 原文）
  ├── 判断 heading_output_rule（所属 section 的第 1 个 unit 写标题，后续 unit 跳过同级标题）
  ├── 按 paragraph_slots 逐槽位扩写成正式正文 → 写入独立的 unit .md 文件
  ├── 更新 outline_state.yaml（unit → 所属 section → 向上递归 parent + metadata 计数）
  └── 写 unit_result.yaml（告诉 auto 本 unit 结果）
    ↓
  循环，直到所有 unit written → 09-assemble
```

本 Skill 支持两种执行模式，根据待写 unit 数量自动选择：

- **小批量模式（1-2 个 content unit）**：直接写，不创建 subagent。读 `references/writing-style.md` 获取写作宪法，自行扩写。
- **批量模式（3+ 个 content unit）**：作为 Coordinator 调度 grant-writer subagents 并行写。subagent 自行读取 `references/writing-style.md`。

**写作规则不通过调用参数传递**——08 和 grant-writer 各自独立读取 `references/writing-style.md`。该文件是唯一权威的写作宪法。

Writer agent 的定义见 `agents/writer.md`，完整写作规则见 `references/writing-style.md`。

---

## 2. 工作目录与文件约定

```text
workflow/
├── 07_outline/
│   ├── outline_report.md          # 全局大纲（读，不修改）
│   ├── writing_units.yaml         # 所有 unit 的写作蓝图（读，不修改）
│   ├── outline_state.yaml         # 状态追踪（读 + 写）
│   ├── outline_blueprint.yaml
│   └── outline_result.yaml
└── 08_section_write/
    ├── units/                      # 每个 unit 一个独立的 .md 文件
    │   ├── S01.1-U001.md
    │   ├── S01.2.1-U001.md
    │   └── ...
    └── unit_result.yaml            # 本轮执行结果（给 auto 读）
```

---

## 3. 状态管理边界

- `./workflow/proposal_state.yaml` 只属于 `auto` 管理。本 Skill **绝不**读取、修改或创建该文件。
- `./workflow/07_outline/outline_state.yaml`：**只读**——读取所有 unit 状态和 section tree。
  - 写入（更新 unit status → written）在**所有 writer agents 完成本轮后**统一执行
  - 不在 agent 执行过程中修改（避免并行写入冲突）
- `./workflow/07_outline/writing_units.yaml`：**只读**——为每个 writer agent 摘取对应 unit 的蓝图片段
- `./workflow/07_outline/context_bundle.yaml`：**只读**——每个 writer agent 注入完全相同的一份
- `./workflow/06_helm/scheme_blueprint.yaml`：**只读**——每个 writer agent 注入完全相同的一份
- `./workflow/07_outline/` 下的其他文件**只读不写**。

### 3.1 Writer Agent 并行安全

- Writer agents 之间 **shared-nothing**：每个 agent 只读取共享文件和自己的 unit 蓝图，只写入自己负责的 `units/{unit_id}.md`
- 不同 agent 写入不同文件 → 无竞争条件
- outline_state 更新由 Coordinator 在**所有 agent 完成后串行执行** → 无并发写入

---

## 4. 输入文件规则

08 的职责是将大纲的 writing unit 扩写成正文。输入分为三级，确保写每个 unit 时既有全局论证视角，又对技术路线有足够深度的理解。

### 4.1 L1：主输入（默认必读）

这些文件决定 08 能否工作。**每次调用必须全部读取。**

```text
workflow/07_outline/outline_state.yaml         # 找第一个 pending unit + section tree 导航
workflow/07_outline/writing_units.yaml         # 目标 unit 的完整写作蓝图（paragraph_slots/sources/avoid）
workflow/07_outline/outline_report.md          # 全局大纲——精确定位到本 unit 所属 section
workflow/06_helm/scheme_blueprint.yaml         # helm 方案蓝图——技术路线的权威描述
```

| 文件 | 提供什么 | 为什么必读 |
|------|---------|-----------|
| `outline_state.yaml` | section tree（含叶结点）+ unit 状态 + `unit_queue` | 找到目标 unit；获取 `depends_on`/`feeds_into`；确定 `heading_level` 和是否为所属 section 的第 1 个 unit |
| `writing_units.yaml` | 目标 unit 的完整写作蓝图：`paragraph_slots` / `required_elements` / `core_argument` / `sources` / `avoid` / `writing_notes` | 告诉 08 本 unit 写什么、怎么写、用哪些材料、有哪些约束 |
| `outline_report.md` | 全局大纲全貌——本 unit 所属 section在全书中的位置、前后叶结点的逻辑关系、关键句和论证链 | 确保本 unit 不孤立，知道自己的论证角色 |
| `scheme_blueprint.yaml` | 核心问题、技术路线、模块设计、验证方案的**权威描述** | 确保技术方案描述准确——写研究方案和创新点时必须以它为准 |

### 4.2 L2：全局视角（默认必读）

这些文件确保写每个 unit 时保持全局论证视角。**每次调用应读取**：

```text
workflow/05_synthesis/current_view.md          # 领域专家理解
workflow/05_synthesis/evidence_ledger.yaml     # 证据索引
workflow/06_helm/helm_report.md                # 方案全貌与设计理由
workflow/06_helm/decision_log.md               # 被放弃的方向
topic.md                                       # 原始课题方向
```

| 文件 | 提供什么 | 读它的时机 |
|------|---------|-----------|
| `current_view.md` | 领域全景、gap 分析、现有方法局限 | 写立项依据和研究现状时——需要把论证建立在领域全景之上 |
| `evidence_ledger.yaml` | 每个 claim 的证据等级、来源追溯路径 | 写任何引用论文结论的段落时——确保论证有文献支撑 |
| `helm_report.md` | 方案设计的完整推理过程——为什么选这个方向/技术路线 | 写研究方案和技术路线时——理解设计选择背后的理由，才能写清楚 |
| `decision_log.md` | 哪些方向被放弃、为什么 | 确保不把 `dropped` 的方向写入正文 |
| `topic.md` | 原始课题目标 | 写所有 unit 时——确保不跑题 |

### 4.3 L3：原始细节（按需追溯）

**不要一开始全部读完。** 08 在需要为某个技术细节、数据引用或论文结论寻找更具体的支撑时，按以下路径追溯：

**追溯入口**：先从 `writing_units.yaml` 中本 unit 的 `sources.evidence_claims` 或 `sources.papers` 定位，再从 `evidence_ledger.yaml` 的 `claims[].sources[].report` 找到具体文件路径，按需读取。

```text
# 按需追溯的典型路径：
写研究方案的某模块实现细节
  ↓
先看 writing_units.yaml 本 unit 的 paragraph_slots[].source_hints
  ↓
不够具体？→ 看 scheme_blueprint.yaml 的 modules[].method（设计概要）
  ↓
还需要数据支撑？→ 按 evidence_ledger 找到 paper digest → 读取具体实验数据
```

L3 文件池：
```text
workflow/04_paper_digest/round_XX/papers/*.md         # 单篇精读报告——具体实验数据和方法细节
workflow/04_paper_digest/round_XX/digest_report.md    # 某轮综合精读报告
workflow/05_synthesis/round_XX/synthesis_report.md    # 某轮 synthesis 分析——gap 推理过程
workflow/03_academic_search/round_XX/candidate_papers.md
workflow/03_academic_search/round_XX/search_summary.md
workflow/08_section_write/units/                       # 已写好的相邻 unit
```

**读取已写好的相邻 unit**：这是 L3 中最常读取的——每次写新 unit 时都应读取：
- `depends_on` 中列出的 unit——确认本 unit 需要承接的具体结论
- 同一 section 下前一个兄弟 unit——自然行文过渡（尤其是同一 section 多 unit 时）
- 同一 section 下的第 1 个 unit（如果本 unit 不是第 1 个）——确认标题和开篇方式

**追溯原则**：每次追溯只读与当前要解决的具体问题直接相关的那部分——不要通读整篇，不要在 L3 层做发现性浏览。

---

## 5. 职责边界

**本 Skill 可以做：**
1. 读取 `outline_state.yaml`，找到第一个 `status: pending` 的 writing unit；
2. 读取 `writing_units.yaml` 中该 unit 的完整写作蓝图（paragraph_slots / required_elements / core_argument / sources / avoid / writing_notes）；
3. 读取全局上下文（大纲全貌 + topic + helm + synthesis + 已写好的相邻 unit）；
4. 判断 `heading_output_rule`：该 unit 是所属 section 的第 1 个 unit 时写 `heading_level` 级标题，后续 unit 跳过同级标题；
5. 将 unit 蓝图按 paragraph_slots 槽位扩写成正式申请书正文；
6. 将正文写入 `workflow/08_section_write/units/{unit_id}.md`；
7. 更新 `outline_state.yaml`：unit status→written，聚合所属 section 状态，向上递归 parent 状态，更新 metadata 计数；
8. 写 `unit_result.yaml`。

**本 Skill 不允许做：**
1. 不一次写多个 unit；
2. 不修改 `writing_units.yaml`、`outline_report.md`、`outline_blueprint.yaml`、`outline_result.yaml`；
3. 不修改已标记为 `written` 或 `approved` 的 unit；
4. 不合并多个 unit .md 文件；
5. 不执行全局审阅（属于 09-assemble）；
6. 不越过 unit 的 `avoid` 约束自行决定写什么；
7. 不向正文中引入 unit 蓝图未提及的新核心论点或新创新点；
8. 不跳过 paragraph_slots——每个 slot 必须在正文中有对应段落或充分理由说明为何跳过。

---

## 6. 全局视角写作规范

### 6.1 写作前必须确认的全局信息

1. **本 unit 在全文中的论证角色**（来自 `writing_units.yaml` 的 `role_in_document`）
2. **本 unit 依赖前面哪些 unit 的结论**（来自 `outline_state.yaml` 的 `depends_on`）
3. **本 unit 为后面哪些 unit 做铺垫**（来自 `outline_state.yaml` 的 `feeds_into`）
4. **本 unit 的术语体系**：关键术语是否与已写好的 unit 一致
5. **本 unit 所属 section在整个论证链中的位置**（来自 `outline_report.md` 的论证链）
6. **本 unit 的 heading_output_rule**：是否为所属 section 的第 1 个 unit → 是否需要写标题

### 6.2 写作时的全局约束

1. **术语首次出现原则**：首次出现必须定义，后续 unit 沿用不重复解释
2. **承上启下**：开头 1-2 句承接前文结论，结尾 1-2 句引出下文
3. **不越界**：只写本 unit 负责的论证内容，不侵入同一 section 下其他 unit 的领地
4. **证据准确**：引用论文数据时必须与 `writing_units.yaml` 的 `sources` 字段一致
5. **语气一致**：与已写好的 unit 保持一致
6. **标题规则**：所属 section 的第 1 个 unit 写 `heading_level` 级标题；后续 unit 以正文段落开头（可含更低级子标题），不再重复同级标题

### 6.3 写作后的自查

- 本 unit 结论是否与 `depends_on` 中 unit 的内容一致？
- 本 unit 的表述是否为 `feeds_into` 中 unit 留了正确的接口？
- 术语使用是否与已写好的 unit 一致？
- 所有 paragraph_slots 是否都已覆盖？

### 6.4 段落级写作规范

#### 6.4.0 section_intro 类型的特殊处理

`unit_type: section_intro` 的 unit 有两种模式：

**heading-only（needs_intro_paragraph=false）**：
- 只输出一行 markdown 标题（如 `## 背景及研究意义`）
- 不生成任何正文段落
- 不读取 L2/L3 上下文（节省 token）
- 直接标记为 written

**需要开篇段落（needs_intro_paragraph=true）**：
- 输出标题 + 1-3 段简短开篇（150-500 字）
- 开篇内容要点：
  - 本节在全书论证链中的角色（1 句）
  - 本节要回答什么问题（1 句）
  - 本节内容组织方式——由哪些子内容构成，它们之间的逻辑关系（1-2 句）
- 禁止：
  - ❌ 深入子级 section 的技术细节
  - ❌ 堆砌子级标题列表
  - ❌ 泛泛的"本节将详细介绍……"

#### 6.4.1 动笔前：基于 paragraph_slots 梳理段落

每个 unit 的 `writing_units.yaml` 已包含详细的 `paragraph_slots`（每个 slot 有 role/target_words/must_include/source_hints/avoid），这本身就是段落级写作计划。动笔前应：

1. 通读所有 slots，确认理解每个 slot 的论证任务
2. 检查 slot 之间的逻辑递进关系
3. 对 `must_include` 中的每个要点确认有足够的上游知识支撑
4. 如果涉及的关键技术在上游知识中有更详细的说明，**按需回溯读取**相关段落

#### 6.4.2 行文：按 slot 展开，流畅推进——严禁脚手架泄漏

paragraph_slots 是 08-section-write 的**内部施工图纸**，slot 的 role 描述（如"路线一：软件整形"）和 slot_id（P1, P2...）**绝对不能穿透到正文输出中**。

**禁令清单（以下所有形式均禁止出现在正文中）**：

| 禁止形式 | 示例（均不允许） |
|---|---|
| slot_id 标签 | `**P1：...**`、`P2：` |
| slot role 做粗体段标题 | `**路线一：本地多层存储优化**。`、`**上述工作的共同盲区**。` |
| 编号小标题 | `**1. 应用背景**`、`（一）研究现状` |
| 清单式罗列 | `第一，...第二，...第三，...`（超过一处即禁止） |
| 模板化的过渡句 | `综上所述，...` `以上分析表明，...`（每段结尾都用即禁止） |

**正确做法：段落主题句自然推进**

slot 的 role 是写作者的理解提示——理解后用**自己的语言**写成该段的主题句，不要让 role 文本原样出现在段落开头。

❌ `**路线一：本地多层存储优化**。该路线的核心思想是在单节点内...`
✅ `在本地存储优化方面，现有工作通过在单节点内构建 GPU 显存、DRAM、NVMe SSD 的多层存储体系来压缩权重加载时间。`

❌ `**上述工作的共同盲区**。以上三条路线的加速类工作在各自场景下...`
✅ `然而，上述加速类工作存在一个关键的共同约束假设：它们均假定所利用的高速网络在当前时刻处于独占或近独占状态。`

❌ `**路线二：硬件优先级队列隔离**。DualPath 面向 agentic 推理场景...`
✅ `第二类工作是硬件级优先级队列隔离。DualPath 面向 agentic 推理场景...`
（注意：这里"第二类工作"是自然语言过渡，不是 `**粗体标签**`）

**核心判断标准**：写完一个 unit 后自问——"如果评审人读到这段，他能看出 paragraph_slots 的施工痕迹吗？"如果能，就是泄漏。

**关于正文内段落编号**：原则上禁止任何形式的编号标签（见上表）。唯一例外——当且仅当 heading_level=5 时，正文段落可使用 `（1）` `（2）` `（3）` 作为段落内部分项编号，每节独立从（1）开始。这是正文叙述的一部分，不是 heading 编号。

#### 6.4.3 深度：关键技术展开讲，不留空洞

- **关键技术必须展开**：涉及核心方法、关键模块设计、独特技术路线选择时，必须用具体的技术描述——架构思路、关键设计选择及理由、典型工作流程或数据流
- **用例子和场景让技术可理解**
- **图表留空机制**：`> **[图 X：{标题}]** *{图表简要描述}*`。图表留空不能替代文字论证
- **禁止**：❌ "采用基于深度学习的特征提取方法" ❌ "通过优化算法提升系统性能"
- **允许**：✅ 给出具体模型、结构、选择理由和文献依据

---

## 7. 执行流程

### 第 0 步：读取写作宪法 + 模式选择

1. 读取 `references/writing-style.md` —— 无论用哪种模式，写作规则从此文件获取
2. 读取 `context_bundle.yaml` + `scheme_blueprint.yaml` + `outline_state.yaml` + `writing_units.yaml`
3. 统计 pending content units（排除 heading-only）的数量：

| pending content units | 模式 | 说明 |
|---|---|---|
| 0 | 全部完成 | 写 unit_result.yaml（all_complete: true），告知 auto |
| 1-2 | **小批量模式** | 08 自己写，不创建 subagent。读 writing-style.md 获取规则 |
| 3+ | **批量模式** | Coordinator dispatch grant-writer subagents |

heading-only unit 总是由 Coordinator 直接写，不计入 content unit 数量。

### 第 1 步（小批量模式）：直接写作

1. 取第一个 pending unit
2. 按原有流程：读 unit 蓝图 → 判断 heading rule → 读相邻 unit → 扩写 → 写 .md 文件
3. 写作规则严格按 `references/writing-style.md`
4. 更新 outline_state
5. 如还有第 2 个 pending unit，重复
6. 写 unit_result.yaml

### 第 2 步（批量模式）：收集本轮待写 units

从 `outline_state.yaml` 中收集所有 `status: pending` 的 units。

- 如果没有 `pending` unit → 全部已写完 → 写 `unit_result.yaml`（`all_complete: true`），告知 auto 进入 09-assemble
- 如果有 → 按 §7.1 分组

### 第 3 步（批量模式）：分组与并行策略

```text
1. 将 pending units 按 section_id 分组
2. 在每个 section 内：按 writing_units.yaml 中的定义顺序排列
3. 不同 section 的 unit → 可以并行 dispatch
4. 同一 section 内的 unit → 必须顺序执行（后一个需要前一个的正文做衔接）
5. 例外：同一 section 内，如果 unit A 的 depends_on 不包含 unit B，且 B 不依赖 A → 可尝试并行
6. heading-only unit（unit_type=section_intro 且 needs_intro_paragraph=false）→ Coordinator 自己直接写
```

### 第 4 步（批量模式）：处理 heading-only units

Coordinator 直接写入标题行到 `units/{unit_id}.md`，标记为 written。不 dispatch agent。

### 第 5 步（批量模式）：Dispatch Writer Agents

按分组策略 dispatch grant-writer subagents。每个 subagent 使用 `agents/writer.md` 定义，**自行读取 `references/writing-style.md`**。

Coordinator 提供的 prompt **只含数据和指令，不含写作规则**：

```
按照 agents/writer.md 的流程写 unit {unit_id}。
必须先读取 references/writing-style.md 获取写作宪法。
数据文件：context_bundle.yaml、scheme_blueprint.yaml、{unit_blueprint、相邻 unit 路径}
写入：workflow/08_section_write/units/{unit_id}.md
```

### 第 6 步（批量模式）：收集结果 + 更新状态

所有 agent 完成后，串行执行：
1. 验证每个 unit .md 文件存在且非空
2. 更新 outline_state（unit → section → parent 递归）
3. 失败 agent 的 unit 标记为 blocked

### 第 7 步（批量模式）：写 unit_result.yaml + 完整性自检

### 第 10 步：产出物完整性自检

1. 检查 `workflow/08_section_write/unit_result.yaml` 是否存在且非空
2. 将验证结果写入 `unit_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. 若 `all_complete: true` 但存在 unit 文件缺失 → 设 `all_outputs_present: false`，不声称全部完成。

---

## 8. 输出文件结构

```text
workflow/08_section_write/
  units/{unit_id}.md          # 如 S01.2.1-U001.md
  unit_result.yaml
```

写输出文件前，应读取本 Skill `references/unit_result_template.yaml` 模板。

---

## 9. 阻塞与异常处理

| 情况 | 处理方式 |
|------|---------|
| `outline_state.yaml` 不存在 | 生成 blocked `unit_result.yaml`，提示先完成 07-outline |
| `writing_units.yaml` 不存在 | 生成 blocked `unit_result.yaml`，提示先完成 07-outline |
| 所有 unit 均为 `written` 或 `approved` | `all_complete: true`，`recommended_next_stage: "REVIEW"` |
| 目标 unit 的 `status: blocked` | 跳过，找下一个 `pending` unit |
| 目标 unit 的 `paragraph_slots` 为空 | 降级处理：以 `required_elements` + `core_argument` 为输入扩写 |
| 目标 unit 的 `sources` 不足 | 标记 warning，以已有材料继续写作；不阻塞 |
| 找不到 `depends_on` 中引用的 unit .md 文件 | 标记 warning，以 `writing_units.yaml` 和 `outline_report.md` 中间接信息替代 |

---

## 10. 最终响应格式

```text
已写完 unit：[unit_id] [title]
所属 section：[section_id] [section_heading]
标题级别：L{heading_level}（{是/否}所属 section 的第 1 个 unit）
写入文件：workflow/08_section_write/units/{unit_id}.md
本 unit 角色：[role_in_document]
写作进度：X/Y units 已完成（Z%），下一 unit：[next_unit_id] [next_title]
```

全部完成时：
```text
所有 writing units 已完成（X/X）。
下一步建议：进入 09-assemble。
```

---

## 11. 质量要求

1. 不直接写正文——正文由 writer agents 完成；
2. 不读取、修改、创建 `./workflow/proposal_state.yaml`；
3. 不修改 `writing_units.yaml`、`outline_report.md`、`outline_blueprint.yaml`、`outline_result.yaml`；
4. 不修改已标记为 `written` 或 `approved` 的 unit；
5. 每个 writer agent 注入完全相同的 `context_bundle.yaml` 和 `scheme_blueprint.yaml`；
6. heading-only unit 由 Coordinator 直接写入（零 agent 开销），不 dispatch；
7. 同一 section 内的 unit 严格按顺序执行（确保前后衔接）；
8. outline_state 更新在所有 agent 完成后串行执行（避免并发写入）；
9. 每个 agent 完成后验证 unit .md 文件存在且非空再更新状态；
10. agent 失败不阻塞整体——标记为 blocked，继续其他 unit；
11. 有 blocked unit 时在 unit_result 中明确列出 blocked 的 unit_id 和原因；
12. 最终响应中不要执行其他 Skill。

---

## 附录A：写作语气与文风

### 推荐的语气
- **客观严谨**：用事实和数据说话，避免主观臆断
- **自信但不自大**：展示实力但不夸张，用成果说话
- **简洁有力**：多用短句和动宾结构，避免冗长从句
- **逻辑清晰**：每段有明确的论点，段落间有清晰的过渡

### 常用的动宾结构
揭示……机理、阐明……机制、建立……模型、发展……方法、实现……调控、突破……瓶颈、解决……难题、提出……策略

### 语气示例

**✅ 好的语气**：
"已有研究表明……，但在……方面仍存在以下关键问题尚未解决：（1）……；（2）……。本项目拟从……角度出发，采用……方法，系统研究……，以期揭示……的内在机理。"

**❌ 不好的语气**：
"目前国内外对这个问题的研究还很少，我们将填补这一空白，在国际上首次实现……"（过于自大）

### 避免的表达
- ❌ 口语化表达（"做一下""看看""搞清楚"）
- ❌ 过度谦虚（"本项目尝试性地探索……"）
