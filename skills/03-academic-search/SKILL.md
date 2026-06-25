---
name: 03-academic-search
description: >
  中文项目申请书写作流程第 03 阶段工具：文献查找。
  根据 02-literature-plan 生成的本轮搜索目标，执行学术论文检索、筛选候选论文集合、判断开放获取状态，并下载可公开获取的核心论文 PDF。

  当用户输入 /grant-master:03-academic-search，或在 grant 工作流中需要执行本轮文献查找任务时，使用本 Skill。也用于独立的学术论文搜索、引用分析、开放获取 PDF 判定与结构化元数据提取。

  本 Skill 是 02-literature-plan 的下游、04-paper-digest 的上游。
  它只负责搜索和筛选候选论文，不精读论文、不综合论文结论、不判断 gap、不生成创新点、不写申请书正文。
---

# 03-academic-search：批量 Searcher Agent 调度

## 1. 阶段定位

本 Skill 负责中文项目申请书 workflow 的第 03 阶段：**批量 searcher agent 调度与结果合并**。

核心职责：

```text
02_literature_plan（round_goal.md + search_queries.yaml）
    ↓
03_academic_search（本 Skill）——Coordinator
  ├── 读取 search_queries.yaml，获取本轮所有查询
  ├── 为每条 query 构建输入包（query_spec + round_goal + selection_policy）
  ├── Dispatch searcher agents：多条 query 并行执行
  ├── 收集所有 agent 结果
  ├── 合并去重（按 DOI/arXiv ID/标题+年份）
  ├── 全局排序（时效性 + 引用数 + venue 等级）
  ├── 判断 OA 状态，下载可获取的 PDF
  ├── 生成 search_summary.md + candidate_papers.md
  └── 输出结构化结果供 04_paper_digest 使用
    ↓
04_paper_digest
```

本 Skill 支持两种执行模式：

- **小批量模式（1 个 query）**：直接搜索，不创建 subagent。读 `references/academic-search/search-protocol.md` 获取完整搜索规范，自行执行。（由auto自动模式调用执行长任务时不应进入小批量模式）
- **批量模式（2+ queries）**：作为 Coordinator 调度 grant-searcher subagents 并行搜索。subagent 自行读取共享参考文件。

**搜索规则不通过调用参数传递**——03 和 grant-searcher 各自独立读取以下共享文件：
- `references/academic-search/search-protocol.md`（搜索宪法）

- `references/academic-search/api-cookbook.md`（API 模板）
- `references/academic-search/disciplines/*.md`（学科规则）
- `references/academic-search/site-patterns/*.md`（站点经验）

Searcher agent 的定义见 `agents/searcher.md`。

---

## 2. 输入文件规则

### 2.1 必须读取

执行前必须读取本轮 02-literature-plan 的输出：

```text
workflow/02_literature_plan/round_XX/round_goal.md       # 本轮执行说明
workflow/02_literature_plan/round_XX/search_queries.yaml # 结构化查询计划
```

从 `round_goal.md` 中获取：本轮 goal、要查什么 / 不查什么、核心问题、筛选标准。

从 `search_queries.yaml` 中获取：`queries` 列表（关键词、查询式）、`selection_policy`（论文数量、年份偏好、优先 venue）、`expected_academic_search_outputs.output_dir`（本轮输出目录）。

### 2.2 建议读取

```text
workflow/02_literature_plan/long_plan.yaml  # 了解整体任务背景，避免查偏
```

### 2.3 轮次判断

优先从 `workflow/02_literature_plan/latest_plan.yaml` 获取当前轮次，对应创建 `workflow/03_academic_search/round_XX/`，轮次编号与 02-literature-plan 保持一致。

---


## 3. 共享参考文件

本 Skill **不内嵌搜索规则**。所有规则从以下共享文件获取。

### 重要信息

> **`references/academic-search/search-protocol.md` 是学术搜索的完整权威参考。**
> 
> 无论是小批量模式（03 自己搜）还是批量模式（dispatch agents），**必须在执行任何搜索操作前完整读取此文件**。该文件包含搜索哲学、平台选择矩阵、学科路由、核心能力（关键词搜索/筛选/精确查找/引用链/元数据/PDF获取/BibTeX）、CDP 模式、并行分治策略、信息核实、站点经验、职责边界——共 400+ 行的完整搜索规范。任何跳过或忽略其中规则的行为都将直接影响搜索结果质量。

### 文件清单

| 文件 | 何时读 | 内容 |
|------|--------|------|
| `references/academic-search/search-protocol.md` | **每次必读（重要）** | 完整搜索规范：哲学、矩阵、路由、核心能力、CDP、分治、核实、站点经验、边界 |
| `references/academic-search/api-cookbook.md` | 按需 | 详细 API 调用模板与参数说明 |
| `references/academic-search/disciplines/*.md` | 按需 | 学科特定规则（CS/医学/物理/化学/社科/人文） |
| `references/academic-search/site-patterns/*.md` | 按需 | 特定平台的访问经验与陷阱 |
| `references/academic-search/venue-rankings.md` | 按需 | CS 会议/期刊 CCF 分级 |
| `references/academic-search/metadata-schema.md` | 按需 | 标准元数据 schema、去重合并规则 |
| `references/academic-search/cdp-api.md` | 按需 | CDP 浏览器操作完整 API |

---

## 4. 前置检查

环境就绪状态检查：

```bash
bash scripts/academic-search/check-deps.sh
```

- **Node.js 22+**：CDP 浏览器模式必需。仅 API 平台时可不检查。
- **Chrome remote-debugging**：仅 Google Scholar / CNKI 必需。
- **curl**：必需。
- **S2 API Key（强烈建议）**：无 Key 时速率极低。免费注册：https://www.semanticscholar.org/product/api#api-key-form

---

## 5. Coordinator Dispatch 完整流程

### 第 0 步：读取共享规则 + 模式选择

1. 读取 `references/academic-search/search-protocol.md` —— 完整搜索规范（重要信息，必须完整读取）
2. 读取 `search_queries.yaml` + `round_goal.md` + `long_plan.yaml`
3. 统计 query 数量：

| queries 数量 | 模式 | 说明 |
|---|---|---|
| 1 | 小批量模式 | 03 自己搜索，不创建 subagent |
| 2+ | 批量模式 | Coordinator dispatch grant-searcher subagents |

### 第 1 步（通用）：构建 query 输入包

对每条 query 构建输入：

```yaml
query_spec:
  query_id: "{从 search_queries 继承}"
  query_text: "{查询式}"
  platforms: ["arxiv", "semantic_scholar"]
  year_range: [2020, 2026]
  target_count: 15
  venue_preference: "CCF-A/B"

round_goal_excerpt:
  goal: "{从 round_goal.md 提取}"
  what_to_find: "{round_goal.md §2}"
  what_not_to_find: "{round_goal.md §3}"
  core_question: "{核心问题}"

selection_policy:
  authority_weight: "high"
  recency_boost: true
  min_citations: 0
  diversity: true
```

### 第 2 步（小批量模式）：直接搜索

**当只有 1 个 query 时，03 需要直接执行搜索，不创建 subagent。**
此时必须按 `references/academic-search/search-protocol.md` 的完整规范自行搜索——包括两遍策略、平台选择、筛选排序、链接约束、信息核实。该文件是搜索规则的唯一权威来源。

### 第 2 步（批量模式）：Dispatch Searcher Agents

所有 query 的 grant-searcher subagent 同时 dispatch。

**Dispatch prompt 只含数据和指令，不含搜索规则**：

```
按照 agents/searcher.md 的流程执行此 query。
必须先读取 references/academic-search/search-protocol.md（完整搜索规范）。
数据：{query_spec + round_goal_excerpt + selection_policy}
返回结构化论文列表。不要执行其他 query，不要做去重合并。
```

### 第 3 步（批量模式）：收集并合并结果

1. 收集各 agent 返回的论文列表
2. **去重合并**（按 metadata-schema.md 规则）：
   - DOI 精确匹配（最高优先级）
   - arXiv ID 匹配
   - 标题 + 第一作者 + 年份模糊匹配
3. 跨 query relevance 融合：取最高值
4. **全局排序**：近 6 个月 [新] 置顶 → 引用数降序 → venue 等级

### 第 4 步：生成输出文件

Coordinator 基于合并后的论文列表生成：
1. **search_results.yaml** — 结构化论文列表（供 04-paper-digest 读取）
2. **search_summary.md** — 调研报告（每篇重要论文 2-4 句简介，按重要/一般分组）
3. **candidate_papers.md** — 优先级排序表（标注 PDF 下载状态）
4. **download_queue.yaml** — PDF 下载清单

### 第 5 步：PDF 下载

对 relevance=core 且 oa_status=open_pdf 的论文：

1. 优先从 arXiv 直链下载（`https://arxiv.org/pdf/{arxiv_id}`）
2. 下载到 `papers/inbox/`（完整论文标题命名）
3. 更新 download_queue.yaml 和 search_results.yaml 的 local_pdf
4. 无法获取的标注 needs_manual: true
5. 可使用 Sci-Hub / LibGen 尝试获取

详细 PDF 下载策略见 search-protocol.md §5 与 api-cookbook.md。

### 第 6 步：写 search_result.yaml + 完整性自检

（同 §产出物完整性自检）

---

## 6. 输出文件结构

每轮输出到 `workflow/03_academic_search/round_XX/`：

```text
workflow/03_academic_search/round_XX/
  search_summary.md      # 调研报告（给人看）
  candidate_papers.md    # 候选论文优先级排序表
  search_results.yaml    # 结构化结果（给 04-paper-digest 读）
  download_queue.yaml    # PDF 下载状态
  search_result.yaml     # 阶段状态（供 auto 读）
```

详细 schema 见 `references/academic-search/metadata-schema.md`。

---

## 7. 论文文件管理

所有 PDF 存放在项目根目录的 `papers/` 文件夹下：

```text
papers/
  ├── inbox/      # 本 Skill 下载的 PDF，供 04-paper-digest 读取
  └── proceeded/  # 已被 04 精读的论文（由 04 管理）
```

- 文件命名必须使用完整论文标题，不允许 arXiv ID 或内部编号
- 非法文件名字符（`/ \ : * ? " < > |`）替换为 `_`
- 超过 120 字符时截断保留扩展名

---

## 8. PDF 下载策略

### 重要论文（relevance: core）

1. 判断 full_text_status
2. 若 open_pdf → 下载到 papers/inbox/
3. 若无法获取 → 标注 needs_manual: true，不纠结
4. 可尝试 Sci-Hub / LibGen

### 一般论文（relevance: general）

不自动下载。若恰好开放获取可酌情下载。

### full_text_status 枚举

| 状态 | 含义 |
|------|------|
| open_pdf | 找到可公开访问 PDF |
| needs_institution | 需要机构权限 |
| no_open_pdf | 无合法开放全文 |
| anti_bot_blocked | 被 Cloudflare/验证码拦截 |
| html_not_pdf | PDF 路由返回 HTML |
| unknown | 证据不足 |

---

## 9. 最终响应格式

```text
已完成第 XX 轮文献查找：

输出文件：
- workflow/03_academic_search/round_XX/search_summary.md
- workflow/03_academic_search/round_XX/candidate_papers.md
- workflow/03_academic_search/round_XX/search_results.yaml
- workflow/03_academic_search/round_XX/download_queue.yaml
- workflow/03_academic_search/round_XX/search_result.yaml

共检索到 X 篇候选论文：重要 X 篇，一般 X 篇。
已自动下载 PDF：X 篇（papers/inbox/）
需手动下载：X 篇（见 download_queue.yaml）

下一步建议：进入 04-paper-digest，精读重要论文。
```

---

## 10. 产出物完整性自检

本阶段所有文件写入完成后，执行以下自检：

1. 检查以下文件是否存在且非空：
   - `workflow/03_academic_search/round_XX/search_summary.md`
   - `workflow/03_academic_search/round_XX/candidate_papers.md`
   - `workflow/03_academic_search/round_XX/search_results.yaml`
   - `workflow/03_academic_search/round_XX/search_result.yaml`
2. 将验证结果写入 `search_result.yaml` 的 `integrity` 字段：

```yaml
integrity:
  all_outputs_present: true/false
  checked_at: "<当前时间>"
  missing_outputs: []
  warnings: []
```

3. 若 `all_outputs_present: false` → 不声称阶段完成，在最终响应中说明缺失文件。

---

## 11. 质量要求

1. 搜索规则从 `references/academic-search/search-protocol.md` 获取——不在本 Skill 中重复定义
2. 搜索和平台选择规则从 `references/academic-search/search-protocol.md` 获取
3. 1 个 query 用小批量模式（自己搜），2+ 用批量模式（dispatch agents）
4. Dispatch 时只传数据和指令，不传搜索规则——subagent 自己读共享文件
5. 合并去重按 DOI → arXiv ID → 标题+年份优先级
6. 首次调研至少 20 篇（重要 ≥10，一般 ≥10）
7. 不读取、修改、创建 ./workflow/proposal_state.yaml
8. 最终响应中不要执行其他 Skill
