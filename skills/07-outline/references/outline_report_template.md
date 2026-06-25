# 申请书内容架构与体量规划报告

## 项目基本信息

- **项目名称**：[从 topic.md 和 helm 提取]
- **项目类型**：[从 requirements.md 提取；未知则标记待确认]
- **申请代码 / 方向**：[从 requirements.md 提取；未知则标记待确认]
- **模板来源**：[references/ 中的模板文件名；若无则写"内置通用提纲"]
- **目标体量**：[X 页 / X 字；若为默认估计，标记待确认]

---

## 1. 大纲说明

本文件不是简单目录，而是申请书的**内容架构与体量规划报告**。

它说明：

1. 申请书整体逻辑如何展开；
2. 完整的大纲标题树（最深 5 级），每个 section（不论叶/非叶）至少 1 个 unit；
3. 每个章节承担什么论证功能；
4. 各章节计划写多少字（含 section_intro 开销）；
5. 每个 section 拆成哪些 writing units（非叶 section_intro + 叶结点 units）；
6. 哪些证据、论文、数据和 helm 方案应分配到哪些单元；
7. 后续 `08-section-write` 应如何逐 unit 写作。

---

## 2. 整体论证主线

### 2.1 一句话主线

[来自 workflow/06_helm/scheme_blueprint.yaml 的 one_sentence_mainline]

### 2.2 核心问题

[核心问题及其与 topic 的关系]

### 2.3 主技术路线

[主技术路线及其与 research contents / modules 的关系]

### 2.4 从背景到方案的逻辑链

```text
应用背景 → 关键瓶颈 → 现有方法不足 → 本项目核心问题 → 研究目标 → 研究内容 → 技术路线 → 验证方式
```

---

## 3. 模板结构与章节骨架（完整大纲标题树）

> 模板中的固定标题必须保留。新增标题用于组织内容展开。
> 大纲最深 5 级。每个 section（不论叶/非叶）至少 1 个 unit。
> 🍃 = 叶结点 | 📋 = 非叶结点（section_intro，需开篇段落）| 🏷 = 非叶结点（heading-only）

[列出从模板提取或内置生成的完整章节结构，每级缩进。每个 section 标注其 unit(s)]

示例：

```
1. 项目介绍                                     ← L1 非叶 🏷（heading-only）
  → S01-U001（section_intro，仅写标题）

  1.1 项目名称 🍃                                ← L2 叶结点
    → S01.1-U001

  1.2 背景及研究意义                            ← L2 非叶 📋（需要开篇）
    → S01.2-U001（section_intro，标题 + 开篇概述）

    1.2.1 应用背景：弹性扩容挑战 🍃              ← L3 叶结点
      → S01.2.1-U001
    1.2.2 技术背景：RDMA与双网卡 🍃             ← L3 叶结点
      → S01.2.2-U001
    ...

  1.4 研究方法                                   ← L2 非叶 📋（需要开篇）
    → S01.4-U001（section_intro，标题 + 总体思路开篇）

    1.4.4 研究内容二：三层QoS隔离               ← L3 非叶 📋（需要开篇）
      → S01.4.4-U001（section_intro，标题 + QoS隔离总述）

      1.4.4.1 硬件VL/DSCP优先级隔离 🍃          ← L4 叶结点
        → S01.4.4.1-U001
      1.4.4.2 软件sender-side整形 🍃            ← L4 叶结点
        → S01.4.4.2-U001
      1.4.4.3 PFC-free可靠数据面 🍃             ← L4 叶结点
        → S01.4.4.3-U001
```

---

## 4. 章节体量预算摘要

| 章节 ID | 章节标题 | 层级 | 类型 | 目标页数 | 目标字数 | 扩展密度 | 论证功能 |
|---|---|---|---|---|---|---|---|
| S01 | 项目介绍 | L1 | 🏷 非叶 |  |  |  |  |
| → S01-U001 | section_intro (heading-only) | — | — | 0 | 0 | — | 仅写标题 |
| S01.2 | 背景及研究意义 | L2 | 📋 非叶 |  |  |  |  |
| → S01.2-U001 | section_intro (需开篇) | — | — | 0.4 | 300 | low | 引导读者进入本节 |
| S01.2.1 | 应用背景 | L3 | 🍃 叶 |  |  |  |  |

说明：

- 非叶结点 section 有 1 个 section_intro unit：📋=需开篇段落（150-500字），🏷=仅标题（0字）
- 叶结点 section 的目标字数为挂载 units 之和
- 非叶结点的目标字数为子结点 + section_intro unit 之和
- 高密度叶结点应拆成多个 writing units
- 形式性章节不应机械扩写

---

## 5. Writing Units 总览

| Unit ID | 所属 Section | Unit 类型 | 标题 | Lv | 目标字数 | 优先级 | 状态 | 写作目的 |
|---|---|---|---|---|---|---|---|---|
| S01-U001 | S01 | section_intro 🏷 | 项目介绍 | 1 | 0 | high | pending | 仅写标题 |
| S01.2-U001 | S01.2 | section_intro 📋 | 背景及研究意义（开篇） | 2 | 300 | high | pending | 引导读者进入本节 |
| S01.2.1-U001 | S01.2.1 | background | 应用背景：弹性扩容挑战 | 3 | 1200 | high | pending | 量化存储瓶颈 |

> `Lv` = heading_level，等于所属 section 的 level。
> `is_first_unit_of_section` 决定是否写该级标题。
> section_intro 类型的 `needs_intro_paragraph` 决定是写开篇段落还是仅写标题。

---

## 6. 关键章节草稿级大纲

以下每个小节应包含：

- 本节角色
- 关键句
- 论证链
- 支撑证据
- 数据点或指标
- 与其他节的关联
- section → writing units 映射（含 section_intro）

### [章节标题]

#### 本节角色

[本节在全书中的论证功能]

#### 关键句

1. [可扩写成正文的关键句]
2. [可扩写成正文的关键句]

#### 论证链

1. [步骤 1]
2. [步骤 2]
3. [步骤 3]
4. [步骤 4]

#### 支撑证据

- [evidence claim / paper / synthesis / helm source]

#### Section → Writing units 映射

| Section ID | Section 标题 | 层级 | 类型 | Unit ID(s) | 目标字数 |
|---|---|---|---|---|---|
| S01.2 | 背景及研究意义 | L2 | 📋 非叶 | S01.2-U001 | 300 |
| S01.2.1 | 应用背景 | L3 | 🍃 叶 | S01.2.1-U001 | 1200 |

---

## 7. 证据分配摘要

| Unit ID | 所属 Section | 主要来源 | Evidence Claims | Paper Sources | 注意事项 |
|---|---|---|---|---|---|
| S01.1-U001 | S01.1 |  |  |  |  |

---

## 8. 图表与表格规划

| 位置（Unit / Section） | 图表类型 | 内容 | 来源 | 是否必需 |
|---|---|---|---|---|
|  | 技术路线图 |  | helm | yes |

---

## 9. Blocked / 待补充内容

| Unit / Section | 阻塞原因 | 需要补充什么 | 建议处理 |
|---|---|---|---|
|  |  |  |  |

---

## 10. 跨节一致性约束

- **术语统一**：[关键术语列表]
- **逻辑一致性**：[跨节论证关系]
- **数据一致性**：[跨节引用同一数据]
- **方案一致性**：[研究内容、技术路线、创新点、验证指标之间的一致性]
- **禁写内容**：[dropped / background_only 方向的处理]

---

## 11. 给 08-section-write 的执行建议

1. 优先写 `priority=high` 且 `status=pending` 的 writing units；
2. 每个 unit 按 `writing_units.yaml` 中的 `paragraph_slots` 写；
3. section_intro 类型：`needs_intro_paragraph=true` 时写标题 + 简短开篇，`false` 时仅写标题行；
4. 叶结点 unit：`is_first_unit_of_section` 决定是否写标题，后续 unit 从正文开始；
5. 必须优先使用 `source_allocation.yaml` 指定的证据；
6. 不得越过当前 unit 写其他内容；
7. 如果 unit 证据不足，应标记 blocked，而不是用空话填充。
