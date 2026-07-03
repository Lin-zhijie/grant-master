---
name: 11-output
description: >
  中文项目申请书写作流程第 11 阶段工具：文档输出。
  读取 09-assemble 的完整草稿 proposal_draft.md，验证项目 Template.docx 的 pandoc 样式可用性，
  然后使用项目 Template.docx 或 skill 内置 default_reference.docx 作为 reference-doc，
  转换为格式规范的 .docx 文件。绝不回退到 pandoc 默认样式。

  当用户输入 /grant-master:11-output，或在 grant 工作流中审阅通过后需要输出最终 docx 时，使用本 Skill。

  本 Skill 是 10-review 的下游，是 grant skill 链条的终点。
  它只负责格式转换和输出质量验证，不修改正文内容、不执行审阅。
---

# 11-output：文档输出

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 11 阶段：**文档输出**。

```text
09_assemble（proposal_draft.md）
  + references/Template.docx（样式验证）
  + skill references/default_reference.docx（fallback）
    ↓
11_output（本 Skill）
  ├── 预处理 markdown（图片占位、表格）
  ├── pandoc 转换（--reference-doc=Template.docx 或 default_reference.docx）
  ├── 输出 proposal.docx
  ├── 后处理验证（字体、样式、页数）
  └── 输出 output_result.yaml
    ↓
  用户直接提交 proposal.docx，无需手动调格式
```

核心职责：**将 markdown 草稿转换为格式规范的 .docx，让用户拿到即可提交**。

---

## 2. 工作目录与文件约定

```text
./
├── references/
│   └── Template.docx              # 项目申请书模板（读，先做样式验证）
├── skills/11-output/references/
│   └── default_reference.docx     # skill 内置 fallback reference-doc（读）
├── workflow/
│   ├── 09_assemble/
│   │   └── proposal_draft.md      # 完整草稿（读，不修改）
│   └── 11_output/
│       ├── proposal.docx          # 最终输出（写）
│       └── output_result.yaml     # 阶段状态（写）
```

---

## 3. 状态管理边界

- 本 Skill 是链条终点，只输出、不修改上游任何文件。
- `./workflow/proposal_state.yaml`：绝不读取、修改或创建。

---

## 4. 输入文件

### L1：主输入（默认必读）

```text
workflow/09_assemble/proposal_draft.md    # 待转换的完整草稿
./references/Template.docx                # 项目申请书模板（样式验证；完整时可作为 reference-doc）
skills/11-output/references/default_reference.docx
                                           # 内置 reference-doc；Template 缺失或样式不完整时使用
```

### L2：验证参考（默认必读）

```text
workflow/07_outline/outline_report.md     # §4 体量预算（验证页数）
workflow/09_assemble/assemble_result.yaml # 读取 heading_numbering_policy，确认 09 已处理标题编号策略
workflow/10_review/review_result.yaml     # 确认审阅已通过（P0=0）
```

---

## 5. 职责边界

### 可以做

1. 读取 proposal_draft.md，验证 Template.docx 样式；
2. 预处理 markdown（图片占位转 pandoc 语法、表格格式化）；
3. 使用 pandoc + 选定的 reference-doc 转换为 .docx；
4. 验证输出质量（字体、样式继承、页数）；
5. 如果 pandoc 不可用，硬阻塞并给出明确的安装指引；
6. 如果 Template.docx 缺失或样式不完整，自动改用 skill 内置 `references/default_reference.docx`，不使用 pandoc 默认样式。

### 不允许做

1. 不修改 proposal_draft.md 的内容；
2. 不重新执行审阅；
3. 如果 review_result.yaml 显示有 P0 未解决，**硬阻塞**，不得输出 docx。

## 5.1 审阅门禁（硬阻塞）

以下条件**任一不满足 → 停止执行，不生成 docx**：

1. `workflow/10_review/review_result.yaml` **必须存在**
2. review_result.yaml 中 `P0_count == 0`
3. review_result.yaml 中 `ready_for_output == true`（若该字段不存在则检查 `approved == true`）

若阻塞，输出：

```
11-output 阻塞：10-review 未通过
原因：{review_result.yaml 缺失 / 存在 X 个 P0 问题未解决}
请先执行 10-review 并解决所有 P0 问题。
```

上下文压力、token 压力、时间压力——均不得作为跳过此门禁的理由。详见 `docs/workflow-contract.md`。

---

## 6. 转换流程

### 6.1 环境检查

检查 pandoc 是否可用：

```bash
pandoc --version
```

若不可用：**硬阻塞**，不生成 docx，提示安装 `pandoc`（`sudo apt install pandoc`）。

检查 Template.docx 是否存在。若不存在：不阻塞，直接使用 skill 内置 `references/default_reference.docx` 作为 `--reference-doc`，并在结果中标注 `template_missing: true`、`used_fallback_reference: true`。

检查 skill 内置 `references/default_reference.docx` 是否存在。若 Template 缺失或样式不完整，而内置 fallback 也不存在：**硬阻塞**，不得生成 docx，避免输出落入 pandoc 默认样式。

### 6.2 Template.docx 样式验证

**在调用 pandoc 之前**，必须检查 Template.docx 是否定义了 pandoc 所需的样式。

```bash
python3 -c "
import zipfile, xml.etree.ElementTree as ET
with zipfile.ZipFile('./references/Template.docx') as z:
    with z.open('word/styles.xml') as f:
        tree = ET.parse(f)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
style_ids = set()
for s in tree.getroot().findall('.//w:style', ns):
    sid = s.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}styleId')
    style_ids.add(sid)
required = ['Normal', 'Heading1', 'Heading2', 'Heading3', 'Heading4']
# pandoc uses 'Heading1' (no space) as the internal ID
for r in required:
    status = 'YES' if r in style_ids else 'MISSING'
    print(f'  {r:12s} → {status}')
"
```

| 样式 ID | Pandoc 用途 | 缺失后果 |
|---|---|---|
| `Normal` | 正文段落 | 无默认字体/行距 |
| `Heading1` | `#` 一级标题 | 不使用 Template，整体改用内置 default_reference.docx |
| `Heading2` | `##` 二级标题 | 不使用 Template，整体改用内置 default_reference.docx |
| `Heading3` | `###` 三级标题 | 不使用 Template，整体改用内置 default_reference.docx |
| `Heading4` | `####` 四级标题 | 不使用 Template，整体改用内置 default_reference.docx |

> **注意**：Pandoc 使用的内部样式 ID 是英文的 `Normal`、`Heading1`（无空格）、`Heading2` 等。即使 Word/WPS 界面显示为"正文""标题 1"，内部 ID 不变。

如果任何必需样式缺失：
- **不阻塞**，但必须整体改为使用 skill 内置的 `references/default_reference.docx` 作为 `--reference-doc`
- 内置文档包含完整的 Normal + Heading 1-4 样式（宋体正文 + 黑体/楷体标题）
- 副作用：使用内置文档会丢失 Template.docx 的页边距、页眉页脚等自定义设置
- 在 output_result.yaml 中标记 `template_styles_incomplete: true` 和 `used_fallback_reference: true`
- 在最终响应中提醒用户完善 Template.docx 后重新转换可获得更好的格式效果

禁止局部混用：只要 Template.docx 缺失任一必需样式，就不要继续把 Template.docx 传给 pandoc。reference-doc 只能在以下二者中二选一：

1. `./references/Template.docx`：仅当 Template 存在且 `Normal`、`Heading1`、`Heading2`、`Heading3`、`Heading4` 全部存在；
2. `{skill_dir}/references/default_reference.docx`：Template 缺失或任一必需样式缺失时使用。

不得省略 `--reference-doc`，不得使用 pandoc 默认 docx 样式。

#### 6.2.1 样式修复指引

告诉用户在 Word/WPS 中打开 `references/Template.docx`，按以下规格创建/修改样式：

| 样式名称（界面显示） | 内部 ID | 字体 | 字号 | 加粗 | 对齐 |
|---|---|---|---|---|---|
| 正文 | Normal | 宋体/仿宋 | 小四(~11pt) | — | 两端对齐，首行缩进2字符 |
| 标题 1 | Heading 1 | 黑体 | 三号(~16pt) | ✅ | 居中 |
| 标题 2 | Heading 2 | 黑体 | 四号(~14pt) | ✅ | 左对齐 |
| 标题 3 | Heading 3 | 黑体 | 小四(~12pt) | ✅ | 左对齐 |
| 标题 4 | Heading 4 | 楷体/黑体 | 小四(~11pt) | ✅ | 左对齐 |

页边距：A4，上下 2.5cm，左右 2-3cm。

### 6.3 标题编号处理

标题编号由 09-assemble 根据 `template_heading_numbering` 策略处理，11-output 不再改动。

策略含义：

| `template_heading_numbering` | 含义 | 09 输出 | 11 行为 |
|---|---|---|---|
| `false` 或缺失 | reference docx 的 Heading 样式不负责自动编号 | markdown 标题已带 `1.` / `1.1` 等编号 | 原样转换 |
| `true` | reference docx 的 Heading 样式已经绑定自动编号 | markdown 标题保持干净 | 原样转换，由 Word 样式显示编号 |

默认必须视为 `false`，也就是标题编号写入 markdown。不要假设不同用户的 Template.docx 都自带自动编号。

执行 11-output 时读取 `workflow/09_assemble/assemble_result.yaml` 中的 `assembly.heading_numbering_policy`。如果该字段缺失，只记录 warning，并按“09 已经产出最终 markdown”的原则原样转换，不在 11 阶段补编号或删编号。

### 6.3.1 申请书标题处理

09-assemble 已经负责在 `proposal_draft.md` 开头写入申请书标题，并设置为一级标题（`# 申请书标题`）。11-output 不再生成、补写或覆盖标题。

执行 pandoc 时不得传入会额外生成标题页或文档开头标题的 metadata，例如：

- 不使用 `--metadata title=...`
- 不向临时 markdown 追加 YAML front matter `title: ...`
- 不在预处理阶段手动插入新的 `# 项目名称`

如果 `proposal_draft.md` 开头缺少一级标题，只在 `output_result.yaml` 中记录 warning，提示回到 09-assemble 修复；11-output 不自行补标题。

### 6.4 Markdown 预处理

在调用 pandoc 之前，对 proposal_draft.md 做以下预处理：

**图片占位**：将 `> **[图 X：{标题}]** *{描述}*` 保留为 blockquote——pandoc 会转为 Word 中的缩进段落。

**表格**：markdown 表格直接由 pandoc 转换为 Word 表格。

**参考文献**：如果正文中有 `[1]` `[2]` 等引用标记，保持不变。pandoc 会保留为纯文本。

**未替换 citation tag 检查**：如果 `proposal_draft.md` 中仍出现 `{{cite:`，说明 09-assemble 未完成引用替换。应阻塞输出，提示先重新执行 09-assemble 修复 citation tag。

### 6.5 Pandoc 转换

```bash
# REFDOC 取值逻辑：
#   若 §6.2 样式检查全部通过 → ./references/Template.docx
#   若任何样式缺失       → {skill_references_dir}/default_reference.docx
REFDOC="./references/Template.docx"
# 或 REFDOC="{skill_references_dir}/default_reference.docx"（fallback）

pandoc workflow/09_assemble/proposal_draft.md \
  --reference-doc="$REFDOC" \
  --from=markdown \
  --to=docx \
  --output=workflow/11_output/proposal.docx \
  --standalone
```

注意：不要添加 `--metadata title=...`。申请书标题已经在 09-assemble 的 markdown 正文中，重复传入 metadata 会导致输出开头出现多余标题。

`--reference-doc` 参数使输出的 .docx 继承参考文档的全部样式：
- 页面设置（页边距、纸张大小）
- 标题样式（字体、字号、颜色、间距）
- 正文样式
- 页眉页脚
- 若使用 fallback 文档，上述设置来自内置默认值而非用户模板
- 若 Template 缺失或样式不完整，必须使用 fallback 文档；不得让 pandoc 使用默认 docx 样式

### 6.6 后处理验证

生成 .docx 后执行验证：

| 验证项 | 方法 | 不通过的后果 |
|---|---|---|
| 文件可打开 | 检查文件大小 > 0，非空白 | error |
| 标题样式正确应用 | 用 pandoc 的 `--verbose` 或检查输出日志 | warning |
| 页数在预算范围内 | 估算：总字数 ÷ 750 ≈ 页数（粗略） | info |
| 中文未乱码 | 无法直接验证，标记为需用户确认 | info |

---

## 7. 执行流程

### 第 1 步：读取草稿和模板

1. 读取 proposal_draft.md 全文
2. 检查 pandoc 可用
3. 确认 skill 内置 `references/default_reference.docx` 存在且可读
4. 确认 Template.docx 是否存在；若存在则执行样式验证，若不存在则准备 fallback

### 第 2 步：审阅门禁检查（硬阻塞）

1. 检查 `workflow/10_review/review_result.yaml` 是否存在
2. 若不存在 → **硬阻塞**，终止执行，输出："11-output 阻塞：未找到 10_review/review_result.yaml，请先完成 10-review"
3. 若存在，读取并检查：
   - `P0_count == 0` → 继续
   - `P0_count > 0` → **硬阻塞**，终止执行，输出 P0 问题数量和位置
   - `ready_for_output != true` → **硬阻塞**，终止执行
4. 阻塞不可以通过"询问用户是否继续"绕过——10-review 是 11-output 的强制前置阶段

### 第 3 步：执行预处理

对 proposal_draft.md 执行 §6.4 的预处理（写入临时文件 /tmp/proposal_preprocessed.md）。预处理不得插入新的申请书标题，不得添加 title metadata。

### 第 4 步：执行 pandoc 转换

执行 §6.5 的 pandoc 命令。`REFDOC` 必须是 Template.docx 或内置 default_reference.docx，且命令中不得包含 `--metadata title=...`。

### 第 5 步：验证输出

执行 §6.6 的验证，生成报告。

### 第 6 步：写 output_result.yaml

### 第 7 步：产出物完整性自检

1. 检查以下文件是否存在且非空：
   - `workflow/11_output/proposal.docx`
   - `workflow/11_output/output_result.yaml`
2. 将验证结果写入 `output_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. 若 `all_outputs_present: false` → 不声称阶段完成。

---

## 8. 输出文件结构

```text
workflow/11_output/
  proposal.docx
  output_result.yaml
```

---

## 9. 最终响应格式

```text
已完成第 11 阶段：文档输出。

输出文件：workflow/11_output/proposal.docx
模板参考：references/Template.docx
reference-doc：{references/Template.docx / skills/11-output/references/default_reference.docx}
总页数（估算）：X 页（目标 Y 页）

验证结果：
- 文件生成：✅
- 样式继承：✅（来自 {Template.docx / default_reference.docx}）
- 页数估算：X 页（偏差 Z%）

用户需手动确认：
- 中文未乱码
- 图片占位是否需替换为实际图片
- 页数是否在申报要求范围内

这是 grant skill 链条的终点。如需修改内容，回灌到具体 unit 重写后重新 09→10→11。
```

---

## 10. 质量要求

1. 不修改 proposal_draft.md 的内容；
2. 必须先验证 Template.docx；仅当 Template 样式完整时使用 Template.docx 作为 reference-doc；
3. Template.docx 缺失或样式不完整时，必须使用 skill 内置 `references/default_reference.docx` 作为 reference-doc；
4. 不得省略 `--reference-doc`，不得回退到 pandoc 默认 docx 样式；
5. 不得传入 `--metadata title=...`，不得在 11-output 重复插入申请书标题；
6. pandoc 不可用时硬阻塞，并给出清晰的安装指引；
7. P0 未解决时**硬阻塞**，不得输出 docx；
8. 最终响应中不要执行其他 Skill。
