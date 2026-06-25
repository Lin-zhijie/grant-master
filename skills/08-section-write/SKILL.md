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

本 Skill 是 auto 循环调用的执行单元。auto 负责循环，08 只负责"取一个 unit→写→更新状态"这一原子操作。

**每次调用只写一个 writing unit。**

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

- `./proposal_state.yaml` 只属于 `auto` 管理。本 Skill **绝不**读取、修改或创建该文件。
- `./workflow/07_outline/outline_state.yaml` 是本 Skill 的**状态中枢**——读取它决定写哪个 unit，写入它标记完成。
  - 遍历 section tree → 每个 section → units，找第一个 `status: pending` 的 unit
  - 也可以直接使用 `unit_queue.priority_order` 获取写作顺序
  - 写完后更新 unit 状态 → 聚合所属 section 状态 → 向上递归 parent 状态
- `./workflow/07_outline/writing_units.yaml` 提供每个 unit 的**详细写作蓝图**（paragraph_slots、sources、required_elements、avoid 等）——只读不写。
- `./workflow/07_outline/` 下的其他文件**只读不写**。

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

### 第 1 步：读取状态文件，找目标 unit

**方法 A（推荐）**：直接读取 `outline_state.yaml` 的 `unit_queue.priority_order`，取第一个 `status: pending` 的 unit_id。

**方法 B（兜底）**：深度优先遍历 `sections` 树 → 每个 section（不论叶/非叶）→ `units` 数组，找第一个 `status: pending` 且 `status != blocked` 的 unit。

- 如果没有 `pending` unit → 全部已写完 → `unit_result.yaml`（`all_complete: true`），告知 auto 进入 09-review。
- 如果找到 `pending` unit → 锁定为**本轮目标**。

### 第 2 步：读取 unit 写作蓝图

从 `writing_units.yaml` 中精确定位目标 unit（按 `unit_id` 匹配），提取完整写作蓝图：

| 字段 | 用途 |
|---|---|
| `title` | unit 标题 |
| `heading_level` | 输出标题级别（1-5） |
| `section_id` | 所属 section ID |
| `unit_type` | background / related_work / gap / objective / content / route / innovation / validation / foundation / other |
| `purpose` | 本 unit 写作目的 |
| `role_in_document` | 在全书中的论证角色 |
| `core_argument` | 核心论证陈述 |
| `required_elements` | 必须在正文中出现的要素列表 |
| `paragraph_slots[]` | 段落槽位：role / target_words / must_include / source_hints / avoid |
| `sources` | helm / synthesis / evidence_claims / papers / other |
| `avoid` | 禁写内容列表 |
| `writing_notes` | 给写作者的提示 |

### 第 3 步：判断 heading_output_rule 和 unit 类型

从 `writing_units.yaml` 中确认目标 unit 的 `unit_type` 和 `is_first_unit_of_section`。

**标题格式规范**：标题**不带编号**。编号由 09-assemble 组装时统一注入。08-section-write 只输出干净标题文字。

- 格式：`{markdown_heading_prefix} {heading}`（纯标题文字，无编号前缀）
- 示例：`### 应用背景：大规模AI推理服务的弹性扩容挑战`

**情况 A：section_intro 且 needs_intro_paragraph=false（heading-only）**

- 只写标题行（如 `## 背景及研究意义`），不生成任何正文段落
- 该 section 的内容由子级 section 的 unit 直接开始
- 无需读取 L2/L3 上下文，无需内容清单检查
- **直接跳到第 8 步**（更新状态，标记该 unit 为 written）

**情况 B：section_intro 且 needs_intro_paragraph=true（需要开篇段落）**

- 写标题行（含编号）+ 1-3 段简短开篇文字（150-500 字）
- 开篇内容：本节在全书论证链中的角色 + 内容组织方式
- 不深入子级 section 的技术细节
- paragraph_slots 通常只有 1-2 个（引言 + 结构概述）

**情况 C：叶结点 unit（unit_type ≠ section_intro）**

- `is_first_unit_of_section=true` → 正文开头写标题（含编号），如 `### 1.2.1 应用背景`
- `is_first_unit_of_section=false` → 不重复同级标题，以正文段落直接开头。可含更低级子标题（`heading_level + 1` 级起）

### 第 4 步：读取全局上下文

1. **L1**：精确定位 `outline_report.md` 中本 unit 所属 section的对应段落（§3 章节骨架 + §6 关键章节草稿级大纲），提取关键句和论证链；确认 `scheme_blueprint.yaml` 中与本 unit 相关的技术描述（如写研究方案，则定位到对应 module 的 method/input/output/validation）。
2. **L2**：读取 `current_view.md`（领域全景）、`evidence_ledger.yaml`（证据入口）、`helm_report.md`（方案设计理由）、`decision_log.md`（被放弃方向）、`topic.md`（原始方向）。
3. 从 `outline_state.yaml` 中提取目标 unit 的 `depends_on` 和 `feeds_into`。

### 第 5 步：读取已写好的相邻 unit

1. `depends_on` 中列出的所有 unit 的 .md 文件
2. 同一 section 下前一个兄弟 unit 的 .md 文件（若存在）
3. 同一 section 下的第 1 个 unit（若本 unit 不是第 1 个）——确认标题和开篇方式
4. 前一个叶结点的最后一个 unit（跨叶结点过渡时）

### 第 6 步：扩写正文

> **heading-only unit 跳过此步骤**（已在第 3 步直接跳到第 8 步）。

#### 6a. 扩写前：内容清单检查（必须执行）

从 `writing_units.yaml` 和 `outline_report.md` 中提取本 unit 的所有内容条目，形成**待覆盖清单**。清单上的每一项都必须出现在最终正文中。

**section_intro（needs_intro_paragraph=true）的简化清单格式**：
```text
unit_id: [xxx]
unit_type: section_intro
section_id: [xxx]
heading_level: [N]

开篇要素：
□ 本节在论证链中的角色
□ 本节要回答的问题
□ 内容组织方式（子内容及其逻辑关系）
```

**叶结点 unit 的完整清单格式**：
```text
unit_id: [xxx]
section_id: [xxx]
heading_level: [N]
is_first_unit_of_section: [true/false]

待覆盖段落槽位：
□ P1: [role] → must_include: [...]
□ ...

待覆盖必需要素：
□ [required_element 1]
□ ...

证据引用：
□ [evidence_claim 1] — 用法: [...]

前文承接: depends_on=[...]
后文铺垫: feeds_into=[...]

禁写：
□ [avoid 1]
□ ...
```

此清单必须写入 `unit_result.yaml` 的 `content_checklist` 字段。

#### 6b. 扩写正文

**section_intro（needs_intro_paragraph=true）的扩写**：
- 1-3 段，总计 150-500 字
- 不深入子级 section 的技术细节
- 重点：本节在论证链中的角色 + 子内容组织逻辑

**叶结点 unit 的扩写**：
- **以 paragraph_slots 为骨架**：每个 slot 对应 1-N 个段落，按 slot 顺序依次展开
- `core_argument` 是核心论点——必须在正文中清晰体现
- `must_include` 中的每一项必须出现在对应 slot 的段落中
- `source_hints` 指向的材料必须恰当地融入论证
- `avoid` 中的每一项不得出现在正文中
- `outline_report.md` 中本 section 的关键句和论证链也必须覆盖

#### 6c. 扩写后：内容覆盖核查（必须执行）

逐项确认已在正文中覆盖，标记 ☑/☐。无法覆盖的在 warnings 中记录原因。

### 第 7 步：写入 unit .md 文件

写入 `workflow/08_section_write/units/{unit_id}.md`。

文件内容仅为该 unit 的正文，不含全局目录或其他 unit 的内容。

### 第 8 步：更新 outline_state.yaml

1. 目标 unit `status` → `written`
2. 聚合所属 section 状态：若该 section 下所有 unit 均为 `written`，则 section `status` → `written`
3. 向上递归更新 parent section 状态（非叶结点的状态由其 children 聚合）
4. 更新 `metadata`：`total_written_words`（累加本 unit 的 target_words）、`progress_pct`、`units_by_status`、`sections_by_status`
5. 更新 `last_updated`

### 第 9 步：写 unit_result.yaml

按 `references/unit_result_template.yaml` 结构写入本轮执行结果。

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

1. 所有正文输出使用中文；
2. 不读取、修改、创建 `proposal_state.yaml`；
3. 不修改 `writing_units.yaml`、`outline_report.md`、`outline_blueprint.yaml`、`outline_result.yaml`；
4. 不修改已标记为 `written` 或 `approved` 的 unit；
5. 每次调用只写一个 writing unit；
6. 写作前必须读取该 unit 在 `writing_units.yaml` 中的完整蓝图；
7. 写作前必须读取全局上下文（L1 + L2）；
8. 严格遵循 `heading_output_rule`：所属 section 的第 1 个 unit 写标题，后续 unit 不重复同级标题；
9. 按 `paragraph_slots` 逐槽位展开，每个 slot 的 `must_include` 必须全部覆盖；
10. **paragraph_slot 的 slot_id（P1, P2, P3...）绝不输出到正文**——它是写作脚手架，不是可见标签；
11. **H5 单元（heading_level=5）除外**：可用（1）（2）（3）作为可见段落编号，每节独立从（1）开始；
12. 严格遵守 `avoid` 约束；
13. 正文中的论文引用和数据必须与 `sources` 字段一致，不编造；
14. 不向正文中引入 unit 蓝图未提及的新核心论点或新创新点；
15. 写完立即更新 `outline_state.yaml`（unit → 所属 section → 向上递归 parent）；
16. 最终响应中不要执行其他 Skill。

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
- ❌ 过度自信（"必将取得重大突破"）
- ❌ 模糊表述（"进行相关研究""开展一系列实验"）
- ❌ "填补空白""国内领先""国际先进""世界首次"等套话

### 文风一致性
- 全文保持统一的人称（"本项目"而非"我们"）
- 术语使用前后一致
- 时态一致（立项依据用现在时/过去时，研究方案用将来时）
