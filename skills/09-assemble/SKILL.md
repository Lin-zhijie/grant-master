---
name: 09-assemble
description: >
  中文项目申请书写作流程第 09 阶段工具：合并组装。
  读取 outline_state.yaml 的 section tree，将 08-section-write 产出的所有 unit .md 文件按深度优先顺序
  组装为一份完整的申请书草稿 .md，并执行基础质量检查（标题层级、字数、术语一致性扫描、缺失 unit 检测）。

  当用户输入 /grant-master:09-assemble，或在 grant 工作流中所有 unit 都标记为 written 后需要合并组装时，使用本 Skill。

  本 Skill 是 08-section-write 的下游、10-review 的上游。
  它只负责合并组装和基础检查，不执行深度审阅、不修改 unit 文件、不输出 docx。
---

# 09-assemble：合并组装与基础检查

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 09 阶段：**合并组装**。

```text
08_section_write（units/*.md × N）
  + 07_outline（outline_state.yaml + outline_report.md）
    ↓
09_assemble（本 Skill）
  ├── 按 section tree 深度优先遍历，拼接所有 unit .md
  ├── 注入标题编号（安全网）
  ├── 基础质量检查（标题层级、字数、术语一致性扫描、重复内容）
  ├── 输出完整的 proposal_draft.md
  ├── 输出 proposal_draft.pdf（pandoc → weasyprint）
  ├── 输出 assemble_report.md（检查结果）
  └── 输出 assemble_result.yaml
    ↓
10_review（全局审阅）
```

核心职责：**把碎片化的 unit 文件组装为一份完整的、可供全局审阅的草稿**。

---

## 2. 工作目录与文件约定

```text
workflow/
├── 07_outline/
│   ├── outline_state.yaml         # section tree + unit 状态（读）
│   ├── outline_report.md          # 跨节一致性约束、论证链（读）
│   ├── writing_units.yaml         # unit 蓝图（读，用于 checks）
│   └── ...
├── 08_section_write/
│   └── units/
│       ├── S01-U001.md
│       ├── S01.1-U001.md
│       ├── S01.2-U001.md
│       ├── S01.2.1-U001.md
│       └── ...                    # 所有 unit .md（读，不修改）
└── 09_assemble/
    ├── proposal_draft.md          # 组装后的完整草稿（写）
    ├── proposal_draft.pdf         # PDF 版本（写，pandoc + weasyprint）
    ├── assemble_report.md         # 组装质量检查报告（写）
    └── assemble_result.yaml       # 阶段状态（写）
```

---

## 3. 状态管理边界

- `./proposal_state.yaml` 只属于 `auto` 管理。本 Skill **绝不**读取、修改或创建该文件。
- `./workflow/07_outline/outline_state.yaml`：只读——读取 section tree 和 unit 状态。
- `./workflow/08_section_write/units/`：只读——读取所有 unit .md 文件。
- 本 Skill 写入 `workflow/09_assemble/` 下的所有文件。

---

## 4. 输入文件

### L1：主输入（默认必读）

```text
workflow/07_outline/outline_state.yaml       # section tree + unit 列表 + 状态
workflow/07_outline/outline_report.md        # §10 跨节一致性约束、关键术语表
workflow/08_section_write/units/*.md         # 所有 unit 正文
```

### L2：辅助检查（默认必读）

```text
workflow/07_outline/writing_units.yaml       # 字数目标、unit 类型
```

### L3：按需追溯

```text
workflow/07_outline/source_allocation.yaml   # 如需检查证据一致性
```

---

## 5. 职责边界

### 可以做

1. 读取 outline_state.yaml 的 section tree，验证所有 unit 状态为 `written`；
2. 按深度优先顺序拼接所有 unit .md 文件为 proposal_draft.md；
3. 注入缺失的标题编号（安全网）；
4. 生成 proposal_draft.pdf（pandoc → HTML → weasyprint）；
5. 执行基础质量检查并写入 assemble_report.md；
6. 如果检查发现严重问题（如缺失 unit），报告问题但不阻塞输出。

### 不允许做

1. 不修改 unit .md 文件；
2. 不重写、扩写、删减 unit 内容；
3. 不执行深度审阅（属于 10-review）；
4. 不输出 docx（属于 11-output）；
5. 不改变 unit 的顺序——严格按 section tree 的 DFS 顺序拼接。

---

## 6. 组装规则

### 6.1 遍历顺序

**组装前，首先在文档最开头输出申请书名称作为一级标题**：

```markdown
# 申请书名称
```

标题文字来源：优先从 `outline_report.md` 中提取项目名称/申请书标题；若未找到，则从项目根目录 `topic.md` 的第一行（或明确标注的课题名称）提取。

之后按深度优先遍历 section tree。对每个 section：

1. 输出该 section 的 units（按 `units` 数组顺序）
2. 递归输出 children（按 `children` 数组顺序）

```
S01
  → S01-U001（section_intro, heading-only: 输出标题行）
  → children[0]: S01.1
      → S01.1-U001
  → children[1]: S01.2
      → S01.2-U001（section_intro, needs_intro: 标题 + 开篇段）
      → children[0]: S01.2.1
          → S01.2.1-U001
      → children[1]: S01.2.2
          → S01.2.2-U001
  → children[2]: S01.3
      → S01.3-U001
  ...
```

### 6.2 拼接方式与编号注入

拼接时先写入一级标题 `# 申请书名称`（来源见 §6.1），再按 DFS 顺序拼接各 unit。

每个 unit .md 文件的内容直接拼接。section 之间插入一个空行。unit 之间不额外插入分隔符（因为相邻 unit 的过渡已在写作时处理）。

**heading_number 安全网**：拼接完成后，必须扫描 draft 中所有 markdown 标题行（`#` 开头的行），检查是否已含编号。若某标题缺少编号，从 section tree 中定位其所属 section，用 `heading_number`（由 `section_id` 去 "S" 前缀得到）注入：

```text
修复前：## 项目名称与定位
修复后：## 1.1 项目名称与定位
```

注入逻辑：
1. 按 draft 中的标题顺序，与 section tree 的 DFS 顺序一一对应
2. 提取该 section 的 `heading_number`（若数据中缺失则从 `section_id` 推导：`S01.2.1` → `1.2.1`）
3. 若标题行尚未以 `{heading_number} ` 开头，则注入编号

```text
{S01-U001.md 的全部内容}

{S01.1-U001.md 的全部内容}

{S01.2-U001.md 的全部内容}

{S01.2.1-U001.md 的全部内容}
...
```

### 6.3 特殊情况处理

| 情况 | 处理 |
|---|---|
| 某 unit 的 .md 文件不存在 | 记录到 `missing_units`，在对应位置插入 `> **[缺失：{unit_id} {title}]**` 占位标记 |
| 某 unit 状态为 `blocked` | 同上 |
| 某 unit 文件为空 | 记录警告，不插入占位 |

### 6.4 标题编号注入（默认开启，可用 `--no-numbers` 关闭）

08-section-write 输出的标题不带编号。编号由本阶段统一注入。

**默认行为**：拼接完成后，扫描所有 markdown 标题行，从 section tree 中定位对应 section，推导 `heading_number`（`section_id` 去 "S" 前缀），注入编号：

```text
注入前：## 背景及研究意义
注入后：## 1.2 背景及研究意义
```

**关闭方式**：若用户指定 `--no-numbers`（如 `/grant-master:09-assemble --no-numbers`），跳过编号注入。标题保持干净，适用于后续靠 Word 自动编号（grant-11）的场景。

注入逻辑详见 §8 第 2.5 步。

### 6.5 PDF 输出

在生成 `proposal_draft.md` 后，生成 `proposal_draft.pdf`。

**环境检查**：
```bash
# 检查 weasyprint 是否可用
python3 -c "from weasyprint import HTML" 2>/dev/null && echo "OK" || echo "MISSING"
```
- 若 weasyprint 不可用：输出警告 `weasyprint 不可用，跳过 PDF 生成`，不阻塞
- 无需检查 pandoc——前面已检查

**转换流程**：

```bash
# 步骤 1：markdown → HTML5
pandoc workflow/09_assemble/proposal_draft.md \
  --from=markdown \
  --to=html5 \
  --standalone \
  --output=/tmp/proposal_body.html

# 步骤 2：将 body 嵌入带 CSS 引用的完整 HTML 模板
# 读取 /tmp/proposal_body.html 的 <body> 内容
# 写入 /tmp/proposal_full.html（结构如下）：
#
# <!DOCTYPE html>
# <html lang="zh-CN">
# <head>
#   <meta charset="utf-8">
#   <link rel="stylesheet" href="{skill_references_dir}/pdf_styles.css">
# </head>
# <body>
#   {body_content}
# </body>
# </html>
#
# 其中 {skill_references_dir} = 本 Skill 的 references/ 目录

# 步骤 3：HTML → PDF
python3 -c "
from weasyprint import HTML
HTML('/tmp/proposal_full.html').write_pdf('workflow/09_assemble/proposal_draft.pdf')
"
```

**HTML 模板构造**：
1. 用 pandoc 的 `--to=html5` 生成 body 内容
2. 从 `/tmp/proposal_body.html` 中提取 `<body>` 和 `</body>` 之间的内容
3. 嵌入完整 HTML 模板，`<link>` 引用本 Skill `references/pdf_styles.css` 的绝对路径
4. 写入 `/tmp/proposal_full.html`

**CSS 引用**：必须用 `references/pdf_styles.css` 的绝对路径（不能用相对路径，weasyprint 从当前工作目录解析）。本 Skill 的 references 目录路径可通过对 SKILL.md 所在目录推导得到。

**字体依赖**：
- CSS 指定 `"Noto Sans SC"` 为第一字体
- Linux/WSL 环境中 weasyprint 通常附带该字体
- 如果缺失：`sudo apt install fonts-noto-cjk`（不阻塞，仅提示）
- 不依赖 SimSun 等 Windows 专有字体

**错误处理**：
- weasyprint 转换失败 → 输出警告，写入 `assemble_report.md`，不阻塞
- 字体缺失 → warning，PDF 可能回退到系统默认字体

---

## 7. 基础质量检查

组装后执行以下检查，结果写入 `assemble_report.md`。

### 7.1 完整性检查

| 检查项 | 方法 | 严重程度 |
|---|---|---|
| 所有 unit 是否都有 .md 文件 | 对比 outline_state 的 unit 列表与实际文件 | error（缺失 > 0 时不阻塞但标红） |
| 所有 unit 是否都有内容 | 检查文件大小 > 0 | warning |
| 关键词是否全部覆盖 | 对比 outline_report.md §10 的禁写内容和关键术语 | info |

### 7.2 标题层级与编号检查

提取 draft 中所有 markdown 标题（`#` 行），检查：

- 标题层级是否从 1 开始、不跳级（如 L2 后直接 L4 即为跳级）
- **编号是否已注入且正确**（若未使用 `--no-numbers`）：`# 1.`、`## 1.2`、`### 1.2.1` 应与 section tree 的 `heading_number` 一一对应
- 编号是否连续（如 `1.2.1` → `1.2.2` → `1.2.3`，不应跳跃）
- 标题文字是否与 `outline_report.md` §3 的 section heading 一致（允许微调）
- heading-only 的 section 是否正确只输出了一行标题
- 若使用了 `--no-numbers`：确认标题不含编号（干净模式）

### 7.3 字数统计

按 section 统计实际字数，与 `volume_budget.yaml` 的目标对比，标记偏差 > 20% 的章节。

### 7.4 术语一致性扫描

从 `outline_report.md` §10 提取关键术语表，在 draft 中搜索每个术语的首次出现位置和后续使用是否一致。

---

## 8. 执行流程

### 第 1 步：验证前提

1. 读取 `outline_state.yaml`
2. 检查所有 unit 状态：全部 `written` 或 `approved` 才可组装
3. 如有 `pending` unit，报告警告但允许继续（用于预览模式）

### 第 2 步：按 section tree 组装

1. 从 `outline_report.md`（或 `topic.md`）提取申请书名称，写入一级标题 `# 申请书名称`
2. 深度优先遍历 section tree
3. 读取每个 unit 的 .md 文件内容
4. 拼接为初始 draft

### 第 2.5 步：注入标题编号（默认执行）

1. 若用户指定了 `--no-numbers` → 跳过此步骤
2. 扫描初始 draft 中所有 markdown 标题行
3. 与 section tree 的 DFS 顺序一一对应
4. 对每个标题行：从对应 section 推导 `heading_number`（`section_id` 去 "S" 前缀）
5. 若标题行尚未以 `{heading_number} ` 开头，注入编号（`## 背景` → `## 1.2 背景`）
6. 输出 `proposal_draft.md`

### 第 3 步：执行基础检查

按 §7 的四项检查执行，生成 `assemble_report.md`。

### 第 4 步：生成 PDF

按 §6.5 流程执行：pandoc markdown → HTML5 → weasyprint → `proposal_draft.pdf`。
若 weasyprint 不可用，输出警告，跳过此步骤，不阻塞。

### 第 5 步：写 assemble_result.yaml

---

## 9. 输出文件结构

```text
workflow/09_assemble/
  proposal_draft.md
  proposal_draft.pdf            # 若 weasyprint 可用
  assemble_report.md
  assemble_result.yaml
```

---

## 10. 最终响应格式

```text
已完成第 09 阶段：合并组装。

组装单位数：X/X units
缺失 unit：X 个（或"无"）
草案文件：
  - workflow/09_assemble/proposal_draft.md
  - workflow/09_assemble/proposal_draft.pdf（{已生成 / 跳过：weasyprint 不可用}）
总字数：X 字（目标 Y 字，偏差 Z%）
标题层级：最深 L{X}，{是/否}有跳级
编号注入：修复 X 个缺失编号（或"无需修复"）
检查报告：workflow/09_assemble/assemble_report.md

严重问题：X 个
警告：X 个

下一步建议：进入 10-review 进行全局审阅。
```

---

## 11. 质量要求

1. 不修改任何 unit .md 文件；
2. 严格按 section tree 的 DFS 顺序拼接；
3. 标题编号安全网必须执行——不得让缺少编号的标题进入 draft；
4. 基础检查必须全部执行，不得跳过；
5. 缺失 unit 不阻塞输出，但必须在报告中标红；
6. PDF 生成为可选（weasyprint 不可用时跳过，不阻塞）；
7. PDF 生成前必须检查 weasyprint 可用性，不可用时给出清晰提示；
8. 最终响应中不要执行其他 Skill。
