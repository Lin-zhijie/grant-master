---
name: 07-outline
description: >
  中文项目申请书写作流程第 07 阶段工具：申请书内容架构与体量规划。
  读取申请书模板、06-helm 的整体方案蓝图、05-synthesis 的综合理解与证据账本，
  生成可扩展的申请书大纲、章节体量预算、writing units、证据分配表和逐单元写作状态，
  为 08-section-write 提供可直接执行的写作任务。

  当用户输入 /grant-master:07-outline，或在 grant 工作流中需要生成申请书大纲、根据 helm 蓝图和模板制定写作计划、
  拆解 writing units、规划篇幅预算、初始化写作状态追踪时，使用本 Skill。

  本 Skill 是 06-helm 的下游、08-section-write 的上游。
  它只负责内容架构、体量规划、写作单元拆解和状态初始化，不写申请书正文。
---

# 07-outline：申请书内容架构与体量规划

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 07 阶段：**申请书内容架构与体量规划**。

它不是一个简单的“大纲生成器”。它要解决的是：

```text
如何把 helm 已经收敛出的项目方案，转化为一套可写、可扩展、可追踪、可控制篇幅的申请书写作架构。
```

核心职责：

```text
06_helm（helm_report.md + scheme_blueprint.yaml）
  + 05_synthesis（current_view.md + evidence_ledger.yaml）
  + 申请书模板 / requirements
    ↓
07_outline（本 Skill）
  ├── 解析模板，保留官方章节结构
  ├── 将 helm 方案映射到模板栏目
  ├── 生成逻辑大纲 outline_report.md
  ├── 生成章节体量预算 volume_budget.yaml
  ├── 拆解 writing units writing_units.yaml
  ├── 分配上游证据 source_allocation.yaml
  ├── 初始化逐节/逐单元写作状态 outline_state.yaml
  ├── 生成结构化蓝图 outline_blueprint.yaml
  └── 输出阶段状态 outline_result.yaml
    ↓
08_section_write / 08_unit_write
```

本阶段的根本任务：

```text
不是把目录列出来，而是把申请书拆成大量可执行的写作单元。
每个单元都要有目标字数、论证任务、证据来源、段落槽位和写作边界。
```

后续 `08-section-write` 不应该再重新思考“这一节写什么”，而应按本阶段生成的 writing units 和 source allocation 逐单元扩写。

---

## 2. 工作目录与文件约定

以 Claude Code 当前工作目录作为项目根目录。

不要硬编码任何绝对路径。所有路径都相对当前工作目录。

```text
.
├── topic.md
├── requirements.md                  # 可选，申报要求、页数/字数/格式限制
├── applicant_profile.md             # 可选，申请人/团队基础
├── references/
│   └── Template.docx                # 可选，申请书模板，可能是 .docx/.doc/.md/.txt
├── workflow/
│   ├── 05_synthesis/
│   │   ├── current_view.md
│   │   ├── evidence_ledger.yaml
│   │   └── latest_result.yaml
│   ├── 06_helm/
│   │   ├── helm_report.md
│   │   ├── scheme_blueprint.yaml
│   │   ├── decision_log.md
│   │   └── helm_result.yaml
│   └── 07_outline/
│       ├── outline_report.md
│       ├── volume_budget.yaml
│       ├── writing_units.yaml
│       ├── source_allocation.yaml
│       ├── outline_state.yaml
│       ├── outline_blueprint.yaml
│       └── outline_result.yaml
```

如果 `workflow/07_outline/` 不存在，应创建。

---

## 3. 状态管理边界

`./proposal_state.yaml` 只属于 `auto` 管理。

本 Skill 绝不读取、修改或创建：

```text
./proposal_state.yaml
```

本 Skill 只通过 `workflow/07_outline/outline_result.yaml` 向 `auto` 汇报结果。

---

## 4. 输入文件读取规则

本 Skill 有权限读取 01-06 阶段的全部结果，但不应默认泛读所有历史文件。

采用三级读取规则：

```text
L1：主输入，默认必读；
L2：证据索引，默认读取；
L3：原始细节，按需追溯。
```

### 4.1 L1：主输入，默认必读

```text
./workflow/06_helm/scheme_blueprint.yaml
./workflow/06_helm/helm_report.md
./workflow/06_helm/helm_result.yaml
./topic.md
```

申请书模板也属于主输入，但模板缺失时不阻塞：

```text
./references/Template.docx
./references/Template.doc
./references/Template.md
./references/Template.txt
./references/提纲.*
```

如果找不到模板文件，使用本 Skill 内置的通用申请书结构作为骨架，并在 `outline_result.yaml` 中记录：

```yaml
template_status: "fallback_builtin_outline"
```

如果缺少 `scheme_blueprint.yaml` 或 `helm_report.md`，应阻塞，提示先完成 `06-helm`。

如果缺少 `topic.md`，应阻塞，提示先完成 `01-topic`。

---

### 4.2 L2：证据索引，默认读取

如果存在，每次调用应读取：

```text
./workflow/05_synthesis/current_view.md
./workflow/05_synthesis/evidence_ledger.yaml
./workflow/05_synthesis/latest_result.yaml
./workflow/04_paper_digest/paper_index.yaml
./workflow/06_helm/decision_log.md
./requirements.md
./applicant_profile.md
./CLAUDE.md
```

用途：

- `current_view.md`：帮助设置研究现状、gap 表达和背景脉络；
- `evidence_ledger.yaml`：为每个 writing unit 分配可用证据；
- `paper_index.yaml`：帮助组织国内外研究现状章节；
- `decision_log.md`：避免把已放弃方向写入主线；
- `requirements.md`：决定页数、字数、模板约束、项目类型；
- `applicant_profile.md`：用于研究基础、可行性和团队基础章节；
- `CLAUDE.md`：读取项目级写作规则。

---

### 4.3 L3：原始细节，按需追溯

不要一开始全部读取 L3。

只有在以下情况才追溯：

1. 为某个 writing unit 需要具体论文数据；
2. `evidence_ledger.yaml` 中某个 claim 的摘要不足；
3. 要为“国内外研究现状”分配代表性论文；
4. 要为“研究基础/可行性”查找已有材料；
5. 要确认某个 conclusion 是否可用于申请书正文。

可追溯文件池：

```text
workflow/04_paper_digest/round_XX/papers/*.md
workflow/04_paper_digest/round_XX/digest_report.md
workflow/05_synthesis/round_XX/synthesis_report.md
workflow/03_academic_search/round_XX/candidate_papers.md
workflow/03_academic_search/round_XX/search_summary.md
workflow/02_literature_plan/long_plan.yaml
workflow/02_literature_plan/round_XX/round_goal.md
workflow/01_topic_card.md
```

追溯原则：

```text
先从 evidence_ledger.yaml 或 paper_index.yaml 找索引；
再读取对应 paper report 或 digest_report；
不要绕过 synthesis 直接从 academic-search 候选论文形成申请书依据；
如果 helm 与 synthesis 不一致，优先使用 helm 的 scheme_blueprint，并在 outline_result.yaml 中记录差异。
```

---

## 5. 职责边界

### 本 Skill 可以做

1. 读取并解析申请书模板；
2. 保留模板官方栏目结构；
3. 根据 helm 蓝图生成申请书逻辑大纲；
4. 根据目标页数/字数生成章节体量预算；
5. 将章节拆成 writing units；
6. 为每个 writing unit 设置目标字数、目标页数、写作目的、论证要素、段落槽位；
7. 为每个 writing unit 分配 synthesis / evidence_ledger / paper reports / helm 中的材料来源；
8. 初始化逐节、逐单元状态追踪；
9. 标记 blocked 或材料不足的单元；
10. 生成供 `08-section-write` 直接执行的写作任务。

### 本 Skill 不允许做

1. 不写申请书正文；
2. 不执行 section-write 或 unit-write；
3. 不继续调研；
4. 不精读论文；
5. 不重新做 synthesis；
6. 不重新做 helm 方案收敛；
7. 不修改 06-helm 的任何输出；
8. 不读取、修改或创建 `proposal_state.yaml`；
9. 不将 helm decision_log 中标注为 `dropped` 的方向写入主线；
10. 不直接使用 academic-search 候选论文作为申请书依据，除非该论文已进入 paper_digest 或 evidence_ledger；
11. 不编造论文、数据、结论、项目基础或团队成果。

---

## 6. 核心设计原则：outline 必须包含体量规划

本 Skill 不得只生成章节级标题。

必须同时完成：

```text
逻辑大纲（完整标题树，最深 5 级，叶结点标注）
+ 章节体量预算（section tree 递归，与大纲同构）
+ writing units 拆解（叶结点 → units，1 个叶结点 ≥ 1 个 unit）
+ 证据分配
+ 段落槽位设计
+ heading_level 标注
+ 写作状态初始化（section tree + unit states + section_index）
```

原因：

```text
如果 outline 只固定章节目录，后续 content-plan 只能在固定大纲里硬塞字数；
这样会导致内容扩展困难，section-write 只能扩写已有标题。
```

所以本 Skill 的输出必须让后续写作自然变长，而不是靠空话堆字数。

---

## 7. 模板解析与章节骨架规则

### 7.1 模板优先级

优先读取 `./references/` 中的模板文件：

```text
Template.docx
Template.doc
Template.md
Template.txt
提纲.*
```

若有 `.docx`，可用 pandoc 转换为 markdown：

```bash
pandoc ./references/Template.docx -t markdown --wrap=none -o /tmp/template_outline.md
```

如果 pandoc 不可用或模板无法解析，不阻塞，回退到内置申请书提纲。

### 7.2 标题保留规则

如果模板明确提供官方标题：

1. 一级、二级标题必须保留原文；
2. 不得改写官方固定标题；
3. 不得删除模板中的必写栏目；
4. 可以在模板标题下添加三级及更深标题，用于增强内容组织；
5. 添加标题必须服务 helm 主线和写作体量，不得为了凑层级而机械拆分。

### 7.3 大纲层级与 writing unit 的挂载关系

本 Skill 应生成**完整的大纲标题树**，最深到五级。**每个 section（不论是否叶结点）至少挂载 1 个 writing unit**。

层级关系：

```text
section tree（L1 → L2 → ... → L5，最深 5 级）
  │
  ├── 每个 section（不论叶/非叶）至少 1 个 unit
  │     │
  │     ├── 非叶结点 unit（section_intro）：1 个
  │     │     ├── 需要 intro 段落：写标题 + 简短开篇（150-500 字）
  │     │     └── 不需要 intro 段落：只写标题（heading only），内容由子级 section 直接开始
  │     │
  │     └── 叶结点 unit：1+ 个
  │           └── paragraph slots（每个 unit 4-8 个）
```

关键规则：

1. **每个 section 至少 1 个 unit**——不论叶结点还是非叶结点。这使得标题层级完整，不会因跳过非叶结点而丢失标题。
2. **非叶结点 unit（section_intro）**：每个非叶结点恰好 1 个 unit。该 unit 的 `needs_intro_paragraph` 决定行为：
   - `true`：该 section 需要在子内容展开前有一段总述性文字（如"1.2 背景及研究意义"的开篇）。unit 写该级标题 + 简短开篇段落（150-500 字）。
   - `false`：该 section 只是一个组织性标题（如"1. 项目介绍"），不需要独立开篇文字。unit 只写该级标题（heading only），正文内容由第一个子级 section 的 unit 直接开始。
3. **叶结点 unit**：1 个叶结点 ≥ 1 个 unit。内容简单的叶结点 1 个 unit 即可；内容复杂（如"三层 QoS 隔离"涉及多个子主题）应拆成多个 unit。
4. **unit ID 命名规范**：`{section_id}-U{NNN}`。例如 section `S01.2` 的 unit 为 `S01.2-U001`（非叶 intro unit）；叶结点 `S01.2.1` 的 unit 为 `S01.2.1-U001`。
5. **heading_number**：每个 section 和 unit 应携带 `heading_number`（由 `section_id` 去掉前缀 "S" 得到，如 `S01.2.1` → `1.2.1`）。它不作为 08-section-write 的标题输出依据（08 输出干净标题），而是给 09-assemble 组装时注入编号使用。
6. **heading_level**：等于该 unit 所属 section 的 `level`。
7. **heading_output_rule**：每个 section 的第 1 个 unit 写该级标题（含编号）。同一 section 的后续 unit 以正文段落衔接，不再重复同级标题。
8. **非叶结点 unit 的字数不计入体量预算的主体论证部分**——它们只是结构性开销（标题行 + 可选简短开篇），不在 volume_budget 中与叶结点争夺篇幅。

示例——完整的 section tree + units：

```text
S01（项目介绍，L1，非叶）
  └── S01-U001: section_intro（needs_intro_paragraph=false → heading only）

  S01.2（背景及研究意义，L2，非叶）
    └── S01.2-U001: section_intro（needs_intro_paragraph=true → 标题 + 开篇概述）

    S01.2.1（应用背景，L3，叶）
      └── S01.2.1-U001（heading_level=3）

    S01.2.2（技术背景，L3，叶）
      └── S01.2.2-U001（heading_level=3）

  S01.4（研究方法，L2，非叶）
    └── S01.4-U001: section_intro（needs_intro_paragraph=true → 标题 + 总体思路开篇）

    S01.4.4（三层QoS隔离，L3，非叶）
      └── S01.4.4-U001: section_intro（needs_intro_paragraph=true → 标题 + QoS隔离总述）

      S01.4.4.1（硬件VL/DSCP层，L4，叶）
        └── S01.4.4.1-U001（heading_level=4）

      S01.4.4.2（软件整形层，L4，叶）
        └── S01.4.4.2-U001（heading_level=4）

      S01.4.4.3（PFC-free数据面层，L4，叶）
        └── S01.4.4.3-U001（heading_level=4）
```

### 7.3.1 needs_intro_paragraph 判断标准

非叶结点 unit 是否需要 intro 段落，按以下标准判断：

| 情况 | needs_intro_paragraph | 理由 |
|---|---|---|
| 该 section 是模板官方二级标题（如"背景及研究意义""研究方法"） | `true` | 官方标题下通常需要一段文字说明本节的组织逻辑 |
| 该 section 的 children 之间有逻辑递进关系需要交代 | `true` | 避免子内容直接堆砌，缺乏衔接 |
| 该 section 仅为纯组织性标题（如"项目介绍"），内容完全由子级承载 | `false` | 写标题即可，开篇文字会显得冗余 |
| 该 section 是 L4/L5 深层非叶结点，仅用于分组同类内容 | `false`（通常） | 深层标题本身已足够具体，不需额外开篇 |
| 该 section 在模板中是形式性栏目（如"人力、设备等投入及项目预算"） | `false`（通常） | 以表格填报为主，不需文字开篇 |

**原则**：不为了凑 intro 而写空话；但也不能让子内容"从天而降"缺少引导。

---

## 8. 体量规划规则

本 Skill 必须生成：

```text
workflow/07_outline/volume_budget.yaml
```

### 8.1 目标篇幅来源

篇幅目标按以下顺序确定：

1. `requirements.md` 或模板中明确写出的页数/字数要求；
2. 用户在当前指令中指定的页数/字数；
3. 项目类型默认值；
4. 如果都没有，使用“中等详尽申请书”默认策略，并标记需要用户确认。

默认策略：

```text
NSFC / 青年类：20-30 页，约 15000-25000 字；
重点项目 / 重大项目：50-100 页，约 40000-80000 字；
工程方案 / 标书：100 页以上，按 requirements 分卷规划；
未知类型：40 页，约 30000 字，需用户确认。
```

### 8.2 体量分配原则

篇幅不平均分配，而按论证权重分配。

优先给：

1. 立项依据 / 背景 / 研究现状；
2. 研究内容；
3. 技术路线 / 研究方案；
4. 验证计划 / 考核指标；
5. 创新点；
6. 研究基础。

不应给太多篇幅给：

1. 过泛的背景；
2. 被 helm 降级为 background_only 的方向；
3. dropped 方向；
4. 模板中形式性栏目。

---

## 9. writing units 拆解规则

本 Skill 必须生成：

```text
workflow/07_outline/writing_units.yaml
```

writing unit 是后续写作的最小执行单元。

### 9.1 每个 writing unit 必须包含

1. `unit_id`（格式：`{section_id}-U{NNN}`，如 `S01.2-U001`、`S01.2.1-U001`）
2. `section_id`（**指向所属 section ID**，不论叶/非叶）
3. `heading_level`（该 unit 在输出文档中的标题级别，等于所属 section 的 level）
4. `is_first_unit_of_section`（是否为所属 section 的第 1 个 unit——决定是否写标题）
5. `unit_type`（`section_intro` / `background` / `related_work` / `gap` / `objective` / `content` / `route` / `innovation` / `validation` / `foundation` / `other`）
6. `needs_intro_paragraph`（**仅 `section_intro` 类型需要**：`true`=写标题+简短开篇段落，`false`=只写标题）
7. `title`
8. `target_words`（`section_intro` 且 `needs_intro_paragraph=false` 时可为 0）
9. `target_pages`
10. `purpose`
11. `role_in_document`
12. `required_elements`
13. `paragraph_slots`（`section_intro` 且 `needs_intro_paragraph=false` 时为空数组）
14. `sources`
15. `evidence_claims`
16. `avoid`
17. `output_file`
18. `status`

### 9.2 单元粒度

推荐粒度（按 unit 类型区分）：

**section_intro unit（非叶结点）：**
```text
needs_intro_paragraph=true：150-500 字（开篇段落，不深入内容细节）
needs_intro_paragraph=false：0 字（仅写标题行，不生成正文段落）
```

**叶结点 unit：**
```text
普通申请书：每个 unit 600-1200 字；
长申请书：每个 unit 1000-1800 字；
标书：每个 unit 500-1500 字，按需求条款或响应项拆分。
```

如果一个叶结点的目标字数超过 2000 字，应将其拆成多个 writing units（共享同一 section ID 和 heading_level）。

叶结点拆分决策：

```text
叶结点目标字数 ≤ 1200 字 → 1 个 unit（叶结点标题 = unit 标题）
叶结点目标字数 1200-2000 字 → 1-2 个 unit（按子主题拆分）
叶结点目标字数 > 2000 字 → 考虑将叶结点提升为非叶，下挂更深层叶结点
```

### 9.3 非背景轮次严禁发散

writing units 必须围绕 helm 选择的主线展开。

不要把 synthesis 中所有方向都拆成正文单元。

被 helm 标为：

```text
dropped
```

的方向不得成为主线 unit。

被 helm 标为：

```text
background_only
```

的方向只能成为背景或研究现状中的简短 unit。

---

## 10. 段落槽位规则

每个 writing unit 必须包含 `paragraph_slots`。

段落槽位用于约束后续写作的展开方式，避免输出过短或泛泛而谈。

每个 unit 通常包含 4-8 个段落槽位，例如：

```text
P1：引入本单元问题；
P2：解释背景或已有方法；
P3：分析核心挑战；
P4：提出本项目思路；
P5：说明机制/模块/流程；
P6：说明验证方式；
P7：小结并衔接下一节。
```

每个 slot 应包含：

1. `slot_id`
2. `role`
3. `target_words`
4. `must_include`
5. `source_hints`
6. `avoid`

---

## 11. source allocation 规则

本 Skill 必须生成：

```text
workflow/07_outline/source_allocation.yaml
```

它为每个 writing unit 分配上游材料。

来源可以包括：

```text
workflow/06_helm/scheme_blueprint.yaml
workflow/06_helm/helm_report.md
workflow/06_helm/decision_log.md
workflow/05_synthesis/current_view.md
workflow/05_synthesis/evidence_ledger.yaml
workflow/04_paper_digest/paper_index.yaml
workflow/04_paper_digest/round_XX/...
topic.md
requirements.md
applicant_profile.md
```

每个 unit 至少应有：

1. helm 来源；
2. synthesis/current_view 来源；
3. evidence_claims，若该 unit 涉及研究现状、gap、baseline、指标或创新性；
4. paper sources，若该 unit 需要引用论文；
5. avoid 列表。

如果某个核心 unit 找不到足够证据，应标记：

```yaml
status: "blocked"
blocked_reason: "缺少支撑证据"
```

---

## 12. outline_state.yaml 规则

本 Skill 必须生成：

```text
workflow/07_outline/outline_state.yaml
```

`outline_state.yaml` 是 08-section-write 的循环引擎。

它不只追踪章节，也追踪 writing units。

状态流转：

```text
pending → in_progress → written → approved
```

如果材料不足：

```text
blocked
```

规则：

1. 所有 section（含叶结点和非叶结点）初始为 `pending`，除非缺材料，则为 `blocked`；
2. 所有 writing unit 初始为 `pending`，除非该 unit 缺材料，则为 `blocked`；
3. 非叶结点 section 的状态由其 children（下级 section）的状态聚合；
4. 叶结点 section 的状态由其挂载的 units 的状态聚合；
5. `08-section-write` 应优先写 `priority: high` 且 `status: pending` 的 unit；
6. 每个 unit 必须有 `output_file` 和 `heading_level`；
7. `outline_state.yaml` 的 `section_index` 提供所有 section 的扁平索引，供 08-section-write 快速定位叶结点。

---

## 13. 输出文件结构

本 Skill 生成以下文件：

```text
workflow/07_outline/
  outline_report.md
  volume_budget.yaml
  writing_units.yaml
  source_allocation.yaml
  outline_state.yaml
  outline_blueprint.yaml
  outline_result.yaml
```

文件含义：

| 文件 | 含义 |
|---|---|
| `outline_report.md` | 给人看的申请书逻辑大纲与体量规划说明，含完整大纲标题树（最深 5 级，叶结点标注 🍃） |
| `volume_budget.yaml` | 文档总页数/字数、各章页数/字数（section tree 递归，与 outline_state 同构） |
| `writing_units.yaml` | 每个大纲叶结点的 writing units，含 `section_id`（叶结点 ID）、`heading_level`、段落槽位和边界 |
| `source_allocation.yaml` | 每个 writing unit 使用哪些上游证据和材料 |
| `outline_state.yaml` | 大纲 section tree（最深 5 级） + units 写作状态追踪 + `section_index` 扁平索引 |
| `outline_blueprint.yaml` | 给 auto 和后续阶段读取的结构化大纲蓝图，含 `section_tree_summary` |
| `outline_result.yaml` | 阶段状态文件 |

写输出文件前，应读取本 Skill `references/` 目录中的对应模板。

模板文件包括：

```text
references/outline_report_template.md
references/volume_budget_template.yaml
references/writing_units_template.yaml
references/source_allocation_template.yaml
references/outline_state_template.yaml
references/outline_blueprint_template.yaml
references/outline_result_template.yaml
```

不要使用硬编码绝对路径引用模板。应使用本 Skill 所在目录下的 `references/`。

---

## 14. 执行流程

### 第 1 步：读取模板和输入

1. 读取 L1 主输入；
2. 读取 L2 证据索引；
3. 查找并解析申请书模板；
4. 读取本 Skill references 中的输出模板；
5. 若缺少必要输入，生成 blocked 版 `outline_result.yaml`。

### 第 2 步：建立模板章节骨架

1. 提取模板标题层级；
2. 保留模板官方标题；
3. 判断哪些章节需要补充三级/四级标题；
4. 建立 section tree。

### 第 3 步：映射 helm 方案

将 `scheme_blueprint.yaml` 中的以下内容映射到章节：

- project_positioning；
- selected_problem；
- selected_route；
- system_scheme；
- research_contents；
- validation_plan；
- outline_guidance；
- rejected_problem_directions；
- rejected_routes。

### 第 4 步：映射证据

从 `current_view.md` 和 `evidence_ledger.yaml` 中为章节和 writing units 分配：

- 背景证据；
- 研究现状证据；
- gap 证据；
- baseline；
- 指标；
- 风险；
- 技术启发；
- 可用于申请书正文的 claim。

### 第 5 步：生成体量预算

生成 `volume_budget.yaml`。

必须包括：

- document target；
- section target；
- subsection target；
- expansion density；
- rationale；
- 是否需要用户确认；
- 各 section 目标字数之和必须接近总目标字数。

### 第 6 步：拆解 writing units

生成 `writing_units.yaml`。

要求：

1. **每个 section（不论叶/非叶）至少 1 个 unit**：
   - 非叶结点：1 个 `section_intro` unit（`needs_intro_paragraph` 按 §7.3.1 标准判断）；
   - 叶结点：≥1 个 unit；
2. 重点叶结点（高字数、高论证密度）应有多个 unit；
3. 每个 unit 的 `section_id` 指向所属 section ID；
4. 每个 unit 的 `heading_level` 等于所属 section 的 level；
5. 每个 unit 标注 `is_first_unit_of_section`（决定是否写标题）；
6. 单个 unit 不宜过大（见 §9.2 粒度指南）；
7. 非 `heading-only` 的 section_intro 和所有叶结点 unit 要有 paragraph_slots；
8. 每个 unit 都要有 target_words（`heading-only` section_intro 可为 0）；
9. 每个 unit 都要有 output_file；
10. 每个 unit 要有 avoid 约束。

### 第 7 步：生成 source_allocation

为每个 unit 生成 source allocation。

若单元缺少材料，标记 blocked。

### 第 8 步：生成 outline_state

初始化所有 section 和 unit 状态。

### 第 9 步：生成 outline_report 和 outline_blueprint

`outline_report.md` 给人看，应包含：

- 项目基本信息；
- 模板来源；
- 大纲说明；
- 逻辑大纲；
- 体量规划摘要；
- writing units 摘要；
- 证据分配摘要；
- blocked 单元；
- 跨节一致性约束。

`outline_blueprint.yaml` 给机器读，应整合：

- template structure；
- volume budget summary；
- unit summary；
- helm mapping；
- argument integrity；
- writing workflow hints；
- quality scores。

### 第 10 步：生成 outline_result

写入阶段状态、输出路径、质量评分和下一阶段建议。

---

## 15. 阻塞规则

| 情况 | 处理方式 |
|---|---|
| `scheme_blueprint.yaml` 缺失 | 阻塞，提示先完成 `06-helm` |
| `helm_report.md` 缺失 | 阻塞，提示先完成 `06-helm` |
| `topic.md` 缺失 | 阻塞，提示先完成 `01-topic` |
| 模板缺失 | 不阻塞，使用内置通用提纲 |
| pandoc 无法解析模板 | 不阻塞，使用内置通用提纲 |
| 某必写章节缺材料 | 整体不阻塞，该章节或 unit 标记 blocked |
| 目标页数/字数不明确 | 不阻塞，使用默认值，并标记 `needs_user_confirmation: true` |
| 核心研究内容无法拆成 writing units | 阻塞或标记核心 unit blocked，提示需要回到 helm |

---

## 16. 最终响应格式

执行成功后，向用户简要报告：

```text
已完成第 07 阶段：申请书内容架构与体量规划。

模板来源：[模板文件名 / 内置提纲]
目标体量：[X 页 / X 字，是否需要确认]
大纲标题树：[L1 X 个，L2 X 个，L3 X 个，L4 X 个，L5 X 个]（最大深度 X 级）
叶结点数：X 个
生成 writing units：[X 个，其中 high priority X 个]
blocked units：[X 个]

输出文件：
- workflow/07_outline/outline_report.md（含完整大纲标题树 + 叶结点标注）
- workflow/07_outline/volume_budget.yaml（section tree 递归体量预算）
- workflow/07_outline/writing_units.yaml（叶结点→units，含 heading_level）
- workflow/07_outline/source_allocation.yaml
- workflow/07_outline/outline_state.yaml（section tree 最深 5 级 + section_index）
- workflow/07_outline/outline_blueprint.yaml
- workflow/07_outline/outline_result.yaml

下一步建议：
进入 08-section-write，从 writing_units.yaml 中 priority=high 且 status=pending 的第一个 unit 开始写作。
```

如果阻塞：

```text
无法完成 07-outline，因为缺少必要输入：
- ...

请先完成：
- ...
```

---

## 17. 质量要求

1. 所有正文输出使用中文；
2. 可保留必要英文术语；
3. 不硬编码项目绝对路径；
4. 不读取、修改、创建 `proposal_state.yaml`；
5. 不写申请书正文；
6. 不重新做 helm；
7. 不重新做 synthesis；
8. 不编造论文、数据、结论或团队成果；
9. 模板中的官方标题必须保留；
10. 大纲必须生成完整标题树（最深 5 级），叶结点显式标注；
11. 必须生成体量预算（section tree 递归，与 outline_state 同构）；
12. 必须生成 writing units，每个 unit 的 `section_id` 指向叶结点 ID；
13. 每个 unit 必须有 `heading_level`（等于父叶结点的 level）；
14. 必须生成 source allocation；
15. 必须初始化 outline_state（section tree + section_index + unit states）；
16. 每个重点 writing unit 必须有 target_words 和 paragraph_slots；
17. 每个涉及文献、gap、baseline 或创新性的 unit 必须有证据来源；
18. dropped 方向不得进入主线叶结点；
19. background_only 方向只能作为背景叶结点简要出现；
20. 输出必须服务 08-section-write；
21. 最终响应中不要执行其他 Skill。

---

## 附录A：通用申请书结构与写作规范

以下内容为生成大纲时的写作风格参考。具体章节标题以用户模板为准。

### A.1 标题不可随意修改

如果模板提供了固定标题，必须严格保留：

- 不修改一级、二级标题；
- 不遗漏必写标题；
- 不在规定提纲之外自创一级或二级标题；
- 可在规定标题下添加三级及更深标题。

### A.2 内置通用提纲

当 `references/` 下无模板文件时，使用以下通用提纲作为骨架：

```text
（一）立项依据
  1. 研究意义
  2. 国内外研究现状
  3. 现有方法不足与本项目切入点

（二）研究内容
  1. 研究目标
  2. 研究内容
  3. 关键科学/技术问题
  4. 研究方案与技术路线
  5. 特色与创新
  6. 年度研究计划

（三）研究基础
  1. 研究基础与可行性分析
  2. 工作条件
  3. 相关科研项目情况
  4. 已完成项目情况

（四）其他需要说明的情况
```

### A.3 内容展开原则

长文档不是靠空话扩写，而是靠写作单元展开。

每个 writing unit 应尽量包含：

1. 明确论点；
2. 背景或上下文；
3. 技术解释；
4. 与本项目方案的关系；
5. 证据或依据；
6. 指标、约束或边界；
7. 验证方式；
8. 与前后文的衔接。

### A.4 章节逻辑链

```text
立项依据（Why）
  → 研究目标（What goal）
  → 研究内容（What to do）
  → 关键问题（Key problems）
  → 研究方案/技术路线（How）
  → 创新点（Novelty）
  → 验证计划（How to prove）
  → 研究基础（Why us）
```

### A.5 文风要求

推荐：

- 客观严谨；
- 自信但不夸大；
- 多用短句和动宾结构；
- 术语一致；
- 论证链清楚。

严格避免：

- “填补空白”；
- “国内领先”；
- “国际先进”；
- “首次提出”；
- 无依据的量化数据；
- 泛泛而谈的意义描述。
