---
name: 01-topic
description: >
  中文项目申请书写作流程第 01 阶段工具：课题初始理解 / framing v0。
  把当前项目根目录下的 topic.md 转化为结构化的初始课题理解卡片，并生成第一轮文献查找种子。

  当用户输入 /grant-master:01-topic，或要求理解课题、分析课题背景、提炼课题问题、做课题初步分析、生成 topic card、为项目申请书做前置理解时，使用本 Skill。

  本 Skill 是 02-literature-plan 的上游。
  它只做课题初始框定与轻量背景理解，不做深入论文综述、不做文献空白判断、不生成成熟创新点、不写技术路线、不写大纲、不写申请书正文。
---


# 01-topic：课题初始理解 / framing v0

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 01 阶段：**课题初始理解 / framing v0**。

核心职责：

```text
topic.md
  ↓
01_topic（本 Skill）
  ├── 生成课题理解卡片  workflow/01_topic/01_topic_card.md
  ├── 生成阶段结果文件  workflow/01_topic/01_topic_result.yaml
  └── 生成文献查找种子  workflow/01_topic/01_literature_seed.yaml
  ↓
02_literature_plan
```

它生成的是**研究入口**，不是研究结论。它只做课题初始理解、问题框定、轻量背景解释和第一轮调研种子生成，不做深入论文综述、不做文献空白判断、不生成成熟创新点、不写申请书正文。

---

## 工作目录与文件约定

以 **Claude Code 当前工作目录**作为项目根目录。不硬编码任何绝对路径。所有路径都相对当前工作目录。

```text
.
├── topic.md                        # 必须，课题原始描述
├── requirements.md                 # 可选，申报要求
├── applicant_profile.md            # 可选，申请人/团队基础
├── references/                     # 可选，当前项目资料
└── workflow/
    └── 01_topic/
        ├── 01_topic_card.md            # 本 Skill 生成
        ├── 01_topic_result.yaml        # 本 Skill 生成，供 auto 读取
        └── 01_literature_seed.yaml     # 本 Skill 生成，供 02-literature-plan 使用
```

如果 `./workflow/01_topic/` 目录不存在，应创建它。

---

## 状态管理边界

`./proposal_state.yaml` 只属于 `auto` 管理。本 Skill **绝不**读取、修改或创建该文件。

---

## 职责边界

**本 Skill 可以做：**

1. 理解 `topic.md` 中的课题原始描述；
2. 提炼应用场景、核心矛盾、关键对象、工程约束；
3. 区分已知事实、合理假设、待验证问题；
4. 做轻量背景解释，帮助理解基本概念和应用场景；如果有联网工具可进行轻量级背景检索，而非想当然给出结论；
5. 识别 `references/` 中是否已有调研材料、论文清单或笔记，并提取线索；
6. 生成第一轮文献查找方向和 academic-search 调研种子；
7. 明确标记哪些判断必须由后续调研验证。

**本 Skill 不允许做：**

1. 不进行系统性论文综述，不精读论文，不生成正式 related work；
2. 不构造完整文献矩阵，不判断"目前没有任何工作解决某问题"；
3. 不生成成熟创新点，不判断当前理解已足以进入 `grant-gap` 或 `grant-outline`；
4. 不直接生成技术路线、申请书大纲或申请书正文；
5. 不把模型已有知识或初步搜索结果写成确定事实；
6. 不把论文名称、系统名称、引用数、发表信息作为确定事实，除非明确来自用户提供材料；
7. 不读取、修改或创建 `proposal_state.yaml`。

---

## 对已有调研材料的处理规则

如果 `./references/` 中存在调研报告、论文清单、论文笔记或分析材料，只能做以下处理：

1. 将其标记为"已有材料"；
2. 提取与课题理解有关的线索；
3. 提取可能需要后续验证的论文、系统、术语和方向；
4. 将这些线索写入 `workflow/01_topic/01_literature_seed.yaml`；
5. 在 `workflow/01_topic/01_topic_card.md` 中说明"已有材料可能有用，但需后续正式综合"。

不得声称"已有材料已经完成 grant-research 阶段"或"当前理解已足以支撑 grant-gap / grant-outline"。如果已有材料看起来很深入，只能写：

> 当前目录中存在较深入的调研材料，建议后续由 grant-synthesis 或 grant-gap 进行正式综合。

---

## 执行流程

### 第 1 步：读取输入

1. `./topic.md` —— **必须存在**，这是课题的唯一权威入口。
2. `./CLAUDE.md` —— 若存在，了解项目规则。
3. `./requirements.md` —— 若存在，了解申报要求。
4. `./applicant_profile.md` —— 若存在，了解申请人/团队基础。
5. `./references/` —— 若存在且与课题直接相关，按需读取，只提取线索。

### 第 2 步：前置校验

如果 `./topic.md` 不存在或内容为空，立即停止，不要编造课题。生成 blocked 版 `01_topic_result.yaml`，提示用户先创建并填写 `topic.md`。

### 第 3 步：轻量背景理解

建立对课题领域的基础认识，为下一阶段生成检索线索。**这一步不是文献综述。**

允许：解释核心技术概念、解释工程场景、识别相关技术方向和问题类型、生成深入调研的关键词与问题、进行轻量级背景检索（如有联网工具）。

不允许：大量阅读和总结论文、生成系统性 related work、给出最终创新性结论、把初步搜索结果当作最终事实。

### 第 4 步：生成课题理解卡片

写 `workflow/01_topic/01_topic_card.md` 前，先用 Read 工具读取：

```text
topic_card_template.md
```

严格按照模板的 14 个章节结构生成。它是 v0 初始理解，不是最终视角。

### 第 5 步：生成文献查找种子

写 `workflow/01_topic/01_literature_seed.yaml` 前，先用 Read 工具读取：

```text
literature_seed_template.yaml
```

它用于后续 `02-literature-plan` 生成每一轮 academic-search 的搜索任务书。

### 第 6 步：生成阶段结果文件

写 `workflow/01_topic/01_topic_result.yaml` 前，先用 Read 工具读取：

```text
topic_result_template.yaml
```

它只包含阶段摘要，不复制完整正文。`quality` 各分数必须依据 `01_topic_card.md` 的实际质量给出，`questions` 最多 3 个。

### 第 7 步：收尾说明

向用户简要说明：生成了哪些文件、课题初始理解质量、是否可以进入 `02-literature-plan`、如果需要补充则提出最多 3 个最关键问题。

---

## 写作原则

- 全部正文使用中文；可以保留必要英文关键词；
- 严格区分确定性层级：已知事实只能来自用户提供材料；
- 不确定内容必须标为 `[待补充]`、`[待验证]` 或 `[待调研]`；
- 不编造事实、数据、政策、论文、已有成果或团队基础；
- 不使用"意义重大""填补空白""国内领先""国际先进"等套话，除非有明确依据；
- 不盲目使用看起来很专业的技术词汇，只有在明确相关技术存在、成熟、可行的情况下使用；
- 只有课题方向根本无法判断时才提问，且最多 3 个；
- 下一阶段只能建议进入 `02-literature-plan`，不要建议直接进入 `grant-gap`、`grant-idea` 或 `grant-outline`。

---

## 阻塞场景处理

如果 `topic.md` 缺失或为空：

1. 不生成正常版 `01_topic_card.md`（可生成极简说明版）；
2. 生成 blocked 版 `01_topic_result.yaml`（见参考模板）；
3. 生成 blocked 版 `01_literature_seed.yaml`（见参考模板）；
4. 不要编造课题，最多向用户提出 3 个问题。

---

## 最终响应格式

```text
已生成/更新：
- workflow/01_topic/01_topic_card.md
- workflow/01_topic/01_topic_result.yaml
- workflow/01_topic/01_literature_seed.yaml

阶段结论：
- 当前只是 v0 初始理解；
- 下一步建议进入 02-literature-plan；
- 不建议直接进入 gap、idea 或 outline。
```

阻塞时：说明 `topic.md` 缺失或无法判断课题方向，提出最多 3 个补充问题，不生成正常产物。

---

## 质量要求

1. 所有正文输出使用中文；
2. 不硬编码项目绝对路径，默认使用当前工作目录；
3. 不读取、不修改、不创建 `proposal_state.yaml`；
4. 写每个输出文件前，用 Read 工具读取对应参考模板（按需读取，不要一次性全部加载）；
5. 只生成 v0 初始理解，不生成成熟创新点，不生成最终文献空白判断；
6. 不把已有调研报告直接综合成最终视角；
7. 不把论文、系统、引用数、发表信息当成事实，除非明确来自用户提供材料；
8. 下一步只能建议进入 `02-literature-plan`；
9. 最终响应中不要执行其他 Skill。
