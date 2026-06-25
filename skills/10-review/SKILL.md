---
name: 10-review
description: >
  中文项目申请书写作流程第 10 阶段工具：全局审阅。
  读取 09-assemble 组装好的完整草稿 proposal_draft.md，对照 outline_report.md 的跨节一致性约束、
  writing_units.yaml 的写作蓝图、decision_log.md 的禁写方向，执行多维度的全局审阅，
  输出分级修改建议列表和审阅报告。

  当用户输入 /grant-master:10-review，或在 grant 工作流中完成合并组装后需要全局审阅时，使用本 Skill。

  本 Skill 是 09-assemble 的下游、11-output 的上游。
  它只负责审阅和输出修改建议，不自动修改正文、不输出 docx。
---

# 10-review：全局审阅

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 10 阶段：**全局审阅**。

```text
09_assemble（proposal_draft.md + assemble_report.md）
  + 07_outline（outline_report.md + writing_units.yaml）
  + 06_helm（decision_log.md）
  + 05_synthesis（evidence_ledger.yaml + current_view.md）
    ↓
10_review（本 Skill）
  ├── 论证链完整性审阅
  ├── 跨节过渡与呼应审阅
  ├── 证据一致性审阅
  ├── 禁写内容扫描
  ├── 冗余与遗漏检测
  ├── 体量平衡审阅
  ├── 输出分级修改建议列表（P0/P1/P2）
  └── 输出 review_report.md + review_result.yaml
    ↓
  修改建议 → 回灌到具体 unit 重写（手工或 08-section-write 重写后重新 09→10）
    ↓
  审阅通过 → 11-output
```

核心职责：**作为评审人的代理，对完整草稿执行系统化的全局审阅**。

---

## 2. 工作目录与文件约定

```text
workflow/
├── 07_outline/
│   ├── outline_report.md          # §10 跨节一致性约束、论证链、关键术语（读）
│   ├── writing_units.yaml         # 每个 unit 的 required_elements / avoid（读）
│   ├── outline_state.yaml         # section tree（读）
│   └── ...
├── 06_helm/
│   └── decision_log.md            # dropped / background_only 方向（读）
├── 05_synthesis/
│   ├── evidence_ledger.yaml       # 证据索引（读）
│   └── current_view.md            # 领域全景（读）
├── 09_assemble/
│   └── proposal_draft.md          # 待审阅的完整草稿（读，不修改）
└── 10_review/
    ├── review_report.md           # 审阅报告（写）
    └── review_result.yaml         # 阶段状态（写）
```

---

## 3. 状态管理边界

- `./proposal_state.yaml`：绝不读取、修改或创建。
- 本 Skill 只读取上游文件，写入 `workflow/10_review/`。
- 审阅建议可能需要回灌到具体 unit，但本 Skill 不自动执行修改。

---

## 4. 输入文件

### L1：审阅对象（默认必读）

```text
workflow/09_assemble/proposal_draft.md          # 完整草稿——审阅的核心对象
workflow/09_assemble/assemble_report.md          # 09 产出的基础检查结果（跳过已发现的问题）
workflow/07_outline/outline_report.md            # §2 论证主线 + §10 跨节一致性约束
workflow/07_outline/writing_units.yaml           # 每个 unit 的 required_elements / avoid / core_argument
```

### L2：审阅依据（默认必读）

```text
workflow/06_helm/decision_log.md                 # dropped / background_only 方向
workflow/07_outline/outline_state.yaml           # section tree（用于定位问题所属 section）
```

### L3：按需追溯

```text
workflow/05_synthesis/evidence_ledger.yaml       # 核查数据引用准确性
workflow/05_synthesis/current_view.md            # 核查 gap 论述与领域全景一致
workflow/06_helm/scheme_blueprint.yaml           # 核查技术方案描述准确性
```

---

## 5. 职责边界

### 可以做

1. 通读 proposal_draft.md 全文；
2. 对照上游文件执行 7 个维度的系统审阅；
3. 发现问题后定位到具体的 section/unit；
4. 输出分级修改建议（P0 阻塞 / P1 强烈建议 / P2 优化建议）；
5. 建议修改方向，但不自动修改正文。

### 不允许做

1. 不自动修改 proposal_draft.md 或 unit .md 文件；
2. 不执行格式排版（属于 11-output）；
3. 不重新做文献调研或 synthesis；
4. 不跳过任何审阅维度。

---

## 6. 审阅维度

### D1：论证链完整性（最重要）

检查 `outline_report.md` §2.4 的逻辑链在正文中是否真实、完整地呈现：

```text
应用背景 → 关键瓶颈 → 现有方法不足 → 本项目核心问题
  → 研究目标 → 研究内容 → 技术路线 → 验证方式
```

| 检查项 | 方法 |
|---|---|
| 链条中每一步是否都在正文中有对应段落 | 按链索骥，逐一比对 |
| 相邻步骤之间的过渡是否存在 | 检查"因此/由此可见/基于上述"等衔接词 |
| 是否有逻辑跳跃（如从 gap 直接跳到方案，跳过目标） | 检查步骤间是否有内容断层 |
| 结论是否与前提匹配（如 gap 说的 A，方案解决的却是 B） | 交叉比对 gap 段与技术方案段 |

### D2：跨节过渡与呼应

| 检查项 | 方法 |
|---|---|
| 相邻 section 之间是否有过渡句 | 检查每个 section 的最后 1-2 句和下一个 section 的开头 1-2 句 |
| 前后呼应：S01.2-U005（gap）中提出的问题是否在 S01.4 中得到解决 | 将 gap 段的关键词与技术方案段的关键词做交叉比对 |
| 指标传递：S01.3 的考核指标是否在 S01.4-U010（验证计划）中被逐项对应 | 列指标清单，在验证计划段中逐项搜索 |

### D3：证据一致性

| 检查项 | 方法 |
|---|---|
| 同一数据点在不同 section 的表述是否一致 | 搜索数字（如"80%""10.3s""7.4%"），检查每次出现的上下文 |
| 同一论文的结论在不同场景下的引用是否准确 | 搜索论文简称，检查每次引用的语义 |
| 是否存在无标注引用（claim 未标来源） | 扫描所有"研究表明/已有工作表明"等短语，检查是否带了引用 |

### D4：禁写内容扫描

从 `decision_log.md` 提取 `dropped` 和 `background_only` 方向，从 `outline_report.md` §10 提取禁用词列表：

| 检查项 | 方法 |
|---|---|
| dropped 方向是否出现在正文中 | 搜索 dropped 方向的关键词 |
| background_only 方向是否被过度展开（超过 3 句） | 搜索并检查上下文长度 |
| 禁用词（"填补空白""国内领先""国际先进""首次提出"）是否出现 | 全文搜索 |

### D5：冗余与遗漏

| 检查项 | 方法 |
|---|---|
| 同一论点是否在多处重复展开 | 对比不同 section 的核心论点关键词 |
| `required_elements` 中是否有遗漏 | 取 writing_units.yaml 中所有 required_elements，在 draft 中搜索 |
| 图表占位是否全部替换或标注 | 搜索 `**[图` 模式 |

### D6：体量平衡

| 检查项 | 方法 |
|---|---|
| 高密度 section（如 S01.4 研究方法）是否占比过大 | 计算各 section 字数占比 |
| 形式性 section（如 S03/S04）是否被过度扩写 | 检查字数是否显著超出 budget |

### D7：文风与可读性

| 检查项 | 方法 |
|---|---|
| 全文人称是否统一（"本项目" vs "我们"） | 搜索"我们"的出现 |
| 是否存在超过 5 行的长段落 | 统计段落行数 |
| 是否存在连续 3 段以上无任何衔接词 | 检查段落间过渡 |

---

## 7. 问题分级标准

| 级别 | 含义 | 示例 |
|---|---|---|
| **P0** | 阻塞输出：必须修复才能进入 11-output | dropped 方向写入正文；核心指标数据矛盾；论证链断裂 |
| **P1** | 强烈建议修复 | 术语不一致；关键过渡缺失；证据来源标注不全 |
| **P2** | 优化建议 | 段落过长；表述可更精炼；可增加过渡词 |

---

## 8. 执行流程

### 第 1 步：读取审阅对象和依据

1. L1：通读 proposal_draft.md
2. L1：读取 outline_report.md（论证链 + 跨节约束 + 术语表）
3. L1：读取 writing_units.yaml（required_elements + avoid）
4. L2：读取 decision_log.md + outline_state.yaml

### 第 2 步：逐维度审阅

按 D1→D7 顺序执行。每个维度产出：

- 通过项
- 发现的问题（含级别、位置、原文摘录、建议修改方向）

### 第 3 步：汇总并分级

- P0 问题列表（阻塞项）
- P1 问题列表（强烈建议）
- P2 问题列表（优化建议）

### 第 4 步：生成审阅报告

写入 `review_report.md` 和 `review_result.yaml`。

---

## 9. 输出文件结构

```text
workflow/10_review/
  review_report.md
  review_result.yaml
```

---

## 10. 最终响应格式

```text
已完成第 10 阶段：全局审阅。

审阅维度：论证链 / 跨节过渡 / 证据一致性 / 禁写内容 / 冗余遗漏 / 体量平衡 / 文风
发现问题：P0 X 个 / P1 X 个 / P2 X 个
审阅报告：workflow/10_review/review_report.md

P0 阻塞项：
- [位置] 问题描述

下一步建议：
- 如有 P0 → 修复后重新 09-assemble → 10-review
- 如无 P0 → 进入 11-output 输出 docx
```

---

## 11. 质量要求

1. 7 个维度全部执行，不得跳过；
2. 每个发现的问题必须定位到具体 section/段落；
3. 不自动修改正文——审阅和写作分离；
4. 不读取、修改、创建 `proposal_state.yaml`；
5. 最终响应中不要执行其他 Skill。
