---
name: 08-section-write
description: >
  中文项目申请书写作流程第 08 阶段工具：批次写作 Coordinator。
  读取 outline_state.yaml，按 section 亲缘性和字数预算将 pending units 分组，
  为每组写入 batch instruction sheet 文件，dispatch 给 grant-writer worker agent 并行写作，
  收集结果后统一更新 outline_state.yaml。

  当用户输入 /grant-master:08-section-write，或在 grant 工作流中需要撰写申请书正文时，使用本 Skill。

  本 Skill 是 07-outline 的下游、09-assemble 的上游。
  它只负责编排和状态更新，正文写作由 grant-writer agent 执行。
---

# 08-section-write：逐 unit 写作

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 08 阶段：**逐 unit 写作**。

核心职责：

```text
07_outline（outline_state.yaml + writing_units.yaml + context_bundle.yaml + figure_plan.yaml + table_plan.yaml + citation_plan.yaml）
    ↓
08_section_write（本 Skill / Coordinator）
  ├── 读取 outline_state.yaml，收集所有 pending units
  ├── 按 section 亲缘性 + 字数预算分组（每批 2-5 个 unit）
  ├── heading-only unit → Coordinator 直接写（零 agent 开销）
  ├── 为每批写入 batch instruction sheet 到 instructions/
  ├── 并行 dispatch grant-writer agents（每 agent 处理一批）
  ├── 收集所有批次结果，验证 unit .md 文件
  ├── 串行更新 outline_state.yaml（unit → section → parent 递归）
  └── 写 unit_result.yaml（→ auto）
    ↓
  循环，直到所有 unit written → 09-assemble
```

本 Skill 是 Coordinator——不写正文，只编排。正文由 grant-writer worker agent 执行，每个 agent 处理一组 unit（仍逐 unit 写，但共享上下文，减少 agent spawn）。

**写作规则不通过调用参数传递**——grant-writer 自行读取 `references/writing-style.md`。

Writer agent 定义见 `agents/writer.md`，写作宪法见 `references/writing-style.md`。

---

## 2. 工作目录与文件约定

```text
workflow/
├── 07_outline/
│   ├── outline_report.md          # 全局大纲（读，不修改）
│   ├── writing_units.yaml         # 所有 unit 的写作蓝图（读，不修改）
│   ├── source_allocation.yaml      # 证据/图表/引用索引（读，不修改）
│   ├── figure_plan.yaml           # 图片规划 + Codex 生图提示词（读，不修改）
│   ├── table_plan.yaml            # 表格规划 + 08 自动生成规则（读，不修改）
│   ├── citation_plan.yaml         # 稳定引用 tag + 参考文献条目（读，不修改）
│   ├── outline_state.yaml         # 状态追踪（读 + 写）
│   ├── outline_blueprint.yaml
│   ├── context_bundle.yaml         # 术语表/禁写/claim 分配（读，不修改）
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
- `./workflow/07_outline/outline_state.yaml`：Coordinator **只读**（找 pending units）→ 所有 agent 完成后 **Coordinator 串行写入**（更新 unit status）
- `./workflow/07_outline/writing_units.yaml`：Coordinator **只读**——摘取 unit 蓝图片段写入 batch instruction
- `./workflow/07_outline/figure_plan.yaml`：Coordinator **只读**——摘取本批次相关图片规划、占位位置和 Codex 生图提示词写入 batch instruction
- `./workflow/07_outline/table_plan.yaml`：Coordinator **只读**——摘取本批次相关表格规划、列结构、行结构、数据来源和生成规则写入 batch instruction
- `./workflow/07_outline/citation_plan.yaml`：Coordinator **只读**——摘取本批次相关 citation tag、使用提示和参考文献条目写入 batch instruction
- `./workflow/07_outline/context_bundle.yaml`：Coordinator **只读**——摘取术语表/禁写列表写入 batch instruction
- `./workflow/06_helm/scheme_blueprint.yaml`：Coordinator **只读**——摘取技术路线写入 batch instruction
- Writer agent **不读也不写** outline_state.yaml、writing_units.yaml——所有需要的信息都在 batch instruction 文件中

### 3.1 Writer Agent 并行安全

- Writer agents 之间 **shared-nothing**：每个 agent 只读自己的 batch instruction 文件和 `references/writing-style.md`，只写 `units/{unit_id}.md`
- 不同 agent 写入不同 unit 文件 → 无竞争条件
- outline_state 更新由 Coordinator 在**所有 agent 完成后串行执行** → 无并发写入

---

## 4. 输入文件规则

08 的职责是将大纲的 writing unit 扩写成正文。输入分为三级，确保写每个 unit 时既有全局论证视角，又对技术路线有足够深度的理解。

### 4.1 L1：主输入（默认必读）

这些文件决定 08 能否工作。**每次调用必须全部读取。**

```text
workflow/07_outline/outline_state.yaml         # 找第一个 pending unit + section tree 导航
workflow/07_outline/writing_units.yaml         # 目标 unit 的完整写作蓝图（paragraph_slots/sources/avoid）
workflow/07_outline/figure_plan.yaml           # 目标 unit 相关图片规划、占位位置、Codex 生图提示词
workflow/07_outline/table_plan.yaml            # 目标 unit 相关表格规划、列结构、行结构、数据来源
workflow/07_outline/citation_plan.yaml         # 目标 unit 相关稳定引用 tag、使用提示、参考文献条目
workflow/07_outline/outline_report.md          # 全局大纲——精确定位到本 unit 所属 section
workflow/06_helm/scheme_blueprint.yaml         # helm 方案蓝图——技术路线的权威描述
```

| 文件 | 提供什么 | 为什么必读 |
|------|---------|-----------|
| `outline_state.yaml` | section tree（含叶结点）+ unit 状态 + `unit_queue` | 找到目标 unit；获取 `depends_on`/`feeds_into`；确定 `heading_level` 和是否为所属 section 的第 1 个 unit |
| `writing_units.yaml` | 目标 unit 的完整写作蓝图：`paragraph_slots` / `required_elements` / `core_argument` / `sources` / `avoid` / `writing_notes` | 告诉 08 本 unit 写什么、怎么写、用哪些材料、有哪些约束 |
| `figure_plan.yaml` | 图片清单、目标 unit、正文占位位置、统一风格、`codex_prompt_base`、精调策略 | 告诉 writer 本 unit 是否要插图、插在哪里、是否需要生成 `codex_prompt_final` 给用户生图 |
| `table_plan.yaml` | 表格清单、目标 unit、列结构、行结构、数据来源、缺失值规则 | 告诉 writer 本 unit 是否要自动生成表格、表格如何填充、缺数据时如何处理 |
| `citation_plan.yaml` | 稳定 citation tag、可引用论文、使用场景、参考文献条目 | 告诉 writer 用哪个 `{{cite:tag}}` 引用论文；数字编号由 09-assemble 统一生成 |
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
workflow/04_paper_digest/round_XX/reports/{batch_id}/papers/*.md         # 单篇精读报告——具体实验数据和方法细节
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

**本 Skill（Coordinator）可以做：**
1. 读取 `outline_state.yaml` + `writing_units.yaml` + `context_bundle.yaml` + `scheme_blueprint.yaml`；
2. 读取 `figure_plan.yaml`，为每个 batch 提取相关 figure specs；
3. 读取 `table_plan.yaml`，为每个 batch 提取相关 table specs；
4. 读取 `citation_plan.yaml`，为每个 batch 提取相关 citation specs；
5. 按 section 亲缘性和字数预算将 pending units 分组；
6. 为每组生成并写入 batch instruction sheet 到 `instructions/`；
7. 并行 dispatch grant-writer agents（每 agent 处理一批）；
8. 收集批次结果，验证 unit .md 文件；
9. 在所有 agent 完成后串行更新 `outline_state.yaml`；
10. 写 `unit_result.yaml`。

**本 Skill（Coordinator）不允许做：**
1. 不直接写正文——正文由 grant-writer agent 完成（heading-only 除外）；
2. 不修改 `writing_units.yaml`、`outline_report.md`、`outline_blueprint.yaml`、`outline_result.yaml`；
3. 不修改已标记为 `written` 或 `approved` 的 unit；
4. 不合并多个 unit .md 文件（属于 09-assemble）；
5. 不执行全局审阅（属于 09-assemble / 10-review）；
6. 不越过 unit 的 `avoid` 约束自行决定写什么；
7. 不在 agent 执行过程中修改 outline_state.yaml。

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

**⚠️ Markdown 换行铁律（P0）**：pandoc 转换 markdown 到 docx 时，**紧邻的两行之间如果没有空行，转换后视为同一段落，不会换行**。因此，**所有段落之间、标题前后、参考文献条目之间、图片占位前后、表格前后，以及任何需要在 docx 中分行显示的单元之间，必须各保留一个空行**。

1. **术语首次出现原则**：首次出现必须定义，后续 unit 沿用不重复解释
     - **英文缩写首次出现必须给出全称**：所有英文缩写（如 RDMA、QP、QoS、LLM 等）在正文中首次出现时必须写出完整中文翻译+英文全称+缩写，例如"远程直接内存访问（Remote Direct Memory Access, RDMA）"。同一 unit 内后续出现直接用缩写。跨 unit 时——如果该缩写在上游已写好的 unit 中已首次定义，本 unit 可沿用缩写不再展开
2. **承上启下**：开头 1-2 句承接前文结论，结尾 1-2 句引出下文
3. **不越界**：只写本 unit 负责的论证内容，不侵入同一 section 下其他 unit 的领地
4. **证据准确**：引用论文数据时必须与 `writing_units.yaml` 的 `sources` 字段一致
5. **语气一致**：与已写好的 unit 保持一致
6. **标题规则**：所属 section 的第 1 个 unit 写 `heading_level` 级标题；后续 unit 以正文段落开头（可含更低级子标题），不再重复同级标题
     - **标题禁止编号**：所有 section 标题和 unit 内子标题**一律不得包含任何形式的编号**（如 `1.1`、`1.1.1`、`（一）`、`一、` 等）。标题编号由 09-assemble 根据 section tree 深度统一生成并插入。Writer 只输出纯文本标题，例如 `## 研究背景及意义` 而非 `## 1.1 研究背景及意义`
7. **图片规则**：若 unit 关联 `figure_refs` 或 `figure_plan.figures[].target.unit_id`，正文必须在合适段落后插入图片占位符；占位符不能替代文字论证。
8. **表格规则**：若 unit 关联 `table_refs` 或 `table_plan.tables[].target.unit_id`，writer 必须在正文中自动生成 Markdown 表格；不得只留下“表格待补”占位，除非表格被标记 blocked 或关键数据缺失。
9. **引用规则**：若 unit 关联 `citation_refs` 或涉及论文工作，writer 必须使用 `{{cite:tag}}`，不得写 `[1]` `[2]` 数字编号；数字编号由 09-assemble 统一替换。

### 6.3 写作后的自查

- 本 unit 结论是否与 `depends_on` 中 unit 的内容一致？
- 本 unit 的表述是否为 `feeds_into` 中 unit 留了正确的接口？
- 术语使用是否与已写好的 unit 一致？
- 所有 paragraph_slots 是否都已覆盖？

### 6.4 段落级写作规范

#### 6.4.0 section_intro 类型的特殊处理

`unit_type: section_intro` 的 unit 有两种模式：

**heading-only（needs_intro_paragraph=false）**：
- 只输出一行 markdown 标题（如 `## 研究背景及意义`）——注意**不带编号**（不写 `## 1.1 研究背景及意义`），编号由 09-assemble 统一生成
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
| section/unit 标题含编号 | `## 1.1 研究背景`、`### 2.1.3 技术路线`、`## 一、立项依据` | 编号由 09-assemble 统一生成，08 只输出纯文本标题 |
| 编号代替研究内容 | 正文中用 M1-M4 指代四个模块、用 R1-R4 指代研究内容——始终用自然语言名称，不得用编号代替 |
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
- **图片留空机制**：`> **[图 X：{标题}]** *{图片简要描述}*`。图片留空不能替代文字论证
- **提示词给出机制**：正文可见部分只放图片占位符；供用户复制给 Codex 生图的 `codex_prompt_base` / `codex_prompt_final` 放在 unit 文件末尾 HTML 注释块中，避免进入最终申请书正文
- **表格自动生成机制**：表格不留空、不导出 prompt。writer 必须根据 `table_specs[]` 直接生成 Markdown 表格，并在表格前后各写 1-2 句引导和解释。
- **引用 tag 机制**：正文中使用 `{{cite:tag}}` 标注引用，例如 `{{cite:vaswani2017attention}}`。不得写 `[1]`、`[2]`。09-assemble 会按首次出现顺序替换为数字编号并生成参考文献列表。
- **禁止**：❌ "采用基于深度学习的特征提取方法" ❌ "通过优化算法提升系统性能"
- **允许**：✅ 给出具体模型、结构、选择理由和文献依据

---

## 7. 执行流程

### 第 1 步：读取状态，收集 pending units

1. Read `outline_state.yaml`——收集所有 `status: pending` 的 units
2. Read `writing_units.yaml`——获取每个 unit 的蓝图（paragraph_slots/sources/avoid/target_words）
3. Read `figure_plan.yaml`——获取 pending units 关联图片、占位位置、Codex 生图提示词
4. Read `table_plan.yaml`——获取 pending units 关联表格、列结构、行结构、数据来源和生成规则
5. Read `citation_plan.yaml`——获取 pending units 关联引用 tag、使用提示和参考文献条目
6. Read `context_bundle.yaml` + `scheme_blueprint.yaml`——全局上下文

- 若 0 个 pending → 全部完成，写 `unit_result.yaml`（`all_complete: true`），告知 auto
- heading-only unit（`unit_type: section_intro` + `needs_intro_paragraph: false`）→ Coordinator 直接写标题行，标记 written，不 dispatch

### 第 2 步：分组

将 content units 按以下规则分组：

1. **同 section 优先**：同一 section 的 unit 尽量放同批（上下文连续）
2. **字数预算**：每批总 target_words ≤ 3000（避免 agent 上下文过载）
3. **批次上限**：每批 2-5 个 unit
4. **依赖处理**：
   - **同 section 内线性依赖**：`depends_on` 指向同一 section 的前置 unit → 放入同一批。writer 在批内按顺序执行，前文自然可用
   - **跨 section 依赖**：`depends_on` 指向其他 section 的 unit → 被依赖的 unit 所在 batch **必须先完成**。依赖方 batch 在其后串行 dispatch，不可并行

**跨 section 依赖检测**：

```
对每个 pending unit：
  for each dep in unit.depends_on：
    dep_section = get_section(dep)
    if dep_section ≠ unit.section：
      标记：unit 所在 batch 依赖 dep 所在 batch
```

分组完成后，构建 batch 依赖 DAG：
- 无跨 batch 依赖的 batch → **可并行 dispatch**
- 依赖其他 batch 的 batch → 必须等被依赖 batch 完成后才能 dispatch
- 循环依赖 → **报错**（outline 设计有误，需回 07-outline 修复）

```text
分组示例（含跨 section 依赖）：
  S02（3 units, 2400 words）→ batch_S02 ─┐
  S03（4 units, 2900 words）→ batch_S03_part1 ─┤ batch_S02 无外部依赖
  S03（4 units, 2900 words）→ batch_S03_part2 ─┘ S03_part2 依赖 S03_part1（串行）
                                          ↑ 但 S02 和 S03_part1 可并行
  S04-U002 depends_on S02-U003           → batch_S04 依赖 batch_S02（必须等 S02 完成）
  S04（2 units, 1200 words）→ batch_S04 ──→ dispatch after batch_S02 done
```

**并行调度**：

```
Round 1（并行）：batch_S02、batch_S03_part1
Round 2（并行）：batch_S03_part2、batch_S04  ← S03_part2 等 part1，S04 等 S02
```

### 第 3 步：写入 Batch Instruction Sheet 文件

为每批生成 batch instruction sheet（格式见 `agents/writer.md` §4），**写入磁盘**：

```bash
mkdir -p workflow/08_section_write/instructions
mkdir -p workflow/08_section_write/reports
```

每批写入 `instructions/{batch_id}_batch.yaml`，包含：
- `context_bundle`（术语表 + 禁写列表 + 论证链 + claim 分配——从 context_bundle.yaml 摘取）
- `scheme_excerpt`（技术路线摘要——从 scheme_blueprint.yaml 摘取）
- `figure_specs[]`（本批次 units 关联的图片规划——从 figure_plan.yaml 摘取，含占位位置、`codex_prompt_base`、精调策略）
- `table_specs[]`（本批次 units 关联的表格规划——从 table_plan.yaml 摘取，含列结构、行结构、数据来源、缺失值规则）
- `citation_specs[]`（本批次 units 关联的引用规划——从 citation_plan.yaml 摘取，含 tag、usage_hint、reference_text）
- `units[]`（本批 unit 列表，每个含从 writing_units.yaml 摘取的完整 blueprint）

#### 图片规格传递规则

Coordinator 为每个 batch 提取图片时：

1. 匹配 `figure_plan.figures[].target.unit_id` 与本批 `units[].unit_id`；
2. 同时读取 `writing_units.yaml` 中各 unit 的 `figure_refs`，补齐遗漏匹配；
3. 将匹配到的 figure specs 写入 batch instruction 的顶层 `figure_specs[]`；
4. 在对应 unit 的 `blueprint.figure_refs` 中保留 `figure_id`；
5. 不修改 `codex_prompt_base`；
6. 若 `figure_plan.yaml` 不存在，继续写正文，但在 `unit_result.yaml` 和 batch manifest 中 warning：`figure_plan_missing`。

#### 表格规格传递规则

Coordinator 为每个 batch 提取表格时：

1. 匹配 `table_plan.tables[].target.unit_id` 与本批 `units[].unit_id`；
2. 同时读取 `writing_units.yaml` 中各 unit 的 `table_refs`，补齐遗漏匹配；
3. 将匹配到的 table specs 写入 batch instruction 的顶层 `table_specs[]`；
4. 在对应 unit 的 `blueprint.table_refs` 中保留 `table_id`；
5. 不修改 table spec 的列结构、行结构和缺失值规则；
6. 若 `table_plan.yaml` 不存在，继续写正文，但在 `unit_result.yaml` 和 batch manifest 中 warning：`table_plan_missing`；
7. 若 unit 关联 table 但 `table_specs[]` 缺失，writer 不得编造表格结构，只能在 manifest 中记录 warning。

#### 引用规格传递规则

Coordinator 为每个 batch 提取引用时：

1. 匹配 `citation_plan.citations[].allocated_units` 与本批 `units[].unit_id`；
2. 同时读取 `writing_units.yaml` 中各 unit 的 `citation_refs`，补齐遗漏匹配；
3. 将匹配到的 citation specs 写入 batch instruction 的顶层 `citation_specs[]`；
4. 在对应 unit 的 `blueprint.citation_refs` 中保留 citation tag；
5. 不修改 citation tag 和 `reference_text`；
6. 若 `citation_plan.yaml` 不存在，继续写正文，但在 `unit_result.yaml` 和 batch manifest 中 warning：`citation_plan_missing`；
7. 若 unit 关联 citation 但 `citation_specs[]` 缺失，writer 不得发明 tag，只能在 manifest 中记录 warning。

### 第 4 步：按批次依赖 DAG Dispatch Writer Agents

根据 §2 构建的 batch 依赖 DAG，分轮 dispatch：

1. **Round 1**：所有无跨 batch 依赖的 batch 并行 dispatch
2. **Round N**：等待依赖的 batch 全部完成后，dispatch 当前轮次的 batch
3. 同一 round 内的 batch 之间无依赖 → 可安全并行

**宿主 agent 名称**：

| 宿主 | 必须使用的 worker |
|------|-------------------|
| Claude Code plugin | `grant-master:grant-writer` |
| Codex multi-agent | `grant_writer`（由 `.codex/config.toml` 注册，配置文件 `.codex/agents/grant-writer.toml`） |

如果当前运行环境无法确认上述 worker 已注册，**不得回退到 general-purpose / 通用 agent**；生成 blocked 版 `unit_result.yaml`，并提示用户先运行 `bash scripts/codex/check-agents.sh`。

**Dispatch prompt**（只传文件路径）：

```
你是 grant-writer。按照 agents/writer.md 的流程执行。

batch_instruction_path: workflow/08_section_write/instructions/{batch_id}_batch.yaml

流程：
1. Read batch_instruction_path（你的批次任务规格）
2. Read references/writing-style.md（写作宪法）
3. 逐 unit 写作 → 写 units/{unit_id}.md → 写 manifest
4. 返回批次结构化摘要。不修改 outline_state.yaml。
```

- Writer agent 自行从文件系统读取所有输入（batch instruction + writing-style.md）
- Coordinator 不传写作规则、不传上下文——都在文件中
- 同一 section 内的 unit 保持顺序（writer 循环内顺序执行，确保前后衔接）

### 第 5 步：收集结果 + 更新状态

所有 agent 完成后，串行执行：
1. 验证每个 unit .md 文件存在且非空
2. 验证每个批次的 manifest 已写入
3. 更新 `outline_state.yaml`（unit → section → parent 递归）
4. 失败 unit 标记为 blocked

### 第 6 步：写 unit_result.yaml + 完整性自检

验证所有输出文件后，写入 `unit_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

若 `all_complete: true` 但存在 unit 文件缺失 → 设 `all_outputs_present: false`，不声称全部完成。

## 8. 输出文件结构

```text
workflow/08_section_write/
  instructions/
    batch_S02_batch.yaml            # Coordinator → writer 批次说明书
    batch_S03_part1_batch.yaml
  reports/
    batch_S02_manifest.yaml   # Writer 产出的批次 manifest
  units/
    S01.2.1-U001.md           # Writer 产出的 unit 正文
  unit_result.yaml            # Coordinator 产出的阶段状态（→ auto）
```

写输出文件前，应读取本 Skill `references/unit_result_template.yaml` 模板。

---

## 9. 阻塞与异常处理

| 情况 | 处理方式 |
|------|---------|
| `outline_state.yaml` 不存在 | 生成 blocked `unit_result.yaml`，提示先完成 07-outline |
| `writing_units.yaml` 不存在 | 生成 blocked `unit_result.yaml`，提示先完成 07-outline |
| `figure_plan.yaml` 不存在 | 不阻塞正文写作；图片占位和 prompt 导出降级为 warning |
| `table_plan.yaml` 不存在 | 不阻塞正文写作；表格自动生成降级为 warning |
| `citation_plan.yaml` 不存在 | 不阻塞正文写作；引用 tag 降级为 warning，但 writer 不得写数字编号 |
| 所有 unit 均为 `written` 或 `approved` | `all_complete: true`，`recommended_next_stage: "ASSEMBLE"` |
| 目标 unit 的 `status: blocked` | 跳过，找下一个 `pending` unit |
| 目标 unit 的 `paragraph_slots` 为空 | 降级处理：以 `required_elements` + `core_argument` 为输入扩写 |
| 目标 unit 的 `sources` 不足 | 标记 warning，以已有材料继续写作；不阻塞 |
| 找不到 `depends_on` 中引用的 unit .md 文件 | 标记 warning，以 `writing_units.yaml` 和 `outline_report.md` 中间接信息替代 |
| unit 关联 figure 但 `figure_specs[]` 缺失 | 标记 warning；writer 可插入普通图片占位，但不得编造完整 prompt |
| unit 关联 table 但 `table_specs[]` 缺失 | 标记 warning；writer 不生成该表，不得编造表格结构 |
| unit 关联 citation 但 `citation_specs[]` 缺失 | 标记 warning；writer 不得发明 tag 或写数字编号 |

---

## 10. 最终响应格式

```text
已写完 unit：[unit_id] [title]
所属 section：[section_id] [section_heading]
标题级别：L{heading_level}（{是/否}所属 section 的第 1 个 unit）
写入文件：workflow/08_section_write/units/{unit_id}.md
图片占位：{无 / 已插入 Fxx}
生图提示词：{无 / 已在 unit 文件末尾注释块给出}
自动表格：{无 / 已生成 Txx}
引用 tag：{无 / 已使用 tag x 个}
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

1. Coordinator 不直接写正文——正文由 grant-writer agents 完成（heading-only 除外）；
2. 不读取、修改、创建 `./workflow/proposal_state.yaml`；
3. 不修改 `writing_units.yaml`、`outline_report.md`、`outline_blueprint.yaml`、`outline_result.yaml`；
4. 不修改已标记为 `written` 或 `approved` 的 unit；
5. 每个 batch instruction 文件包含完整的 `context_bundle` + `scheme_excerpt`——writer 无需读原始文件；
6. 若本批次涉及图片，batch instruction 文件必须包含 `figure_specs[]`，含 `codex_prompt_base` 和 `writer_refinement_policy`；
7. 若本批次涉及表格，batch instruction 文件必须包含 `table_specs[]`，含列结构、行结构、数据来源和缺失值规则；
8. 若本批次涉及引用，batch instruction 文件必须包含 `citation_specs[]`，含 tag、使用提示和 reference_text；
9. heading-only unit 由 Coordinator 直接写入（零 agent 开销），不 dispatch；
10. 同 section 内线性依赖放同批顺序执行；跨 section 依赖通过 batch DAG 保证被依赖 batch 先完成；
11. outline_state 更新在所有 agent 完成后串行执行（避免并发写入）；
12. 每个 agent 完成后验证 unit .md 文件存在且非空再更新状态；
13. agent 失败不阻塞整体——标记为 blocked，继续其他 unit；
14. 有 blocked unit 时在 unit_result 中明确列出 blocked 的 unit_id 和原因；
15. 最终响应中不要执行其他 Skill。

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
