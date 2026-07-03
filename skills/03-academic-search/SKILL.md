---
name: 03-academic-search
description: >
  中文项目申请书写作流程第 03 阶段工具：文献查找 Coordinator。
  根据 02-literature-plan 的本轮搜索目标，为每条 query 生成 instruction sheet（说明书），
  dispatch 给 grant-searcher worker agent 并行执行搜索+下载，
  收集所有局部报告，检查下载状态，合并去重，生成最终报告供 04-paper-digest 和 auto 使用。

  当用户输入 /grant-master:03-academic-search，或在 grant 工作流中需要执行本轮文献查找时，使用本 Skill。

  本 Skill 是 02-literature-plan 的下游、04-paper-digest 的上游。
  它只负责编排、合并和报告生成，不执行搜索、不下载 PDF、不精读论文。
---

# 03-academic-search：搜索 Coordinator

## 1. 阶段定位

本 Skill 是第 03 阶段的 **Coordinator**——不执行搜索，只编排和汇总。

```
02_literature_plan（round_goal.md + search_queries.yaml）
    ↓
03_academic_search（本 Skill / Coordinator）
  ├── 读取 search_queries.yaml，获取本轮所有 query
  ├── 为每条 query 生成 instruction sheet（说明书）
  ├── 并行 dispatch grant-searcher agents（每个 agent 独立搜索+下载+局部报告）
  ├── 收集所有 agent 的局部报告和结构化摘要
  ├── 检查所有 query 的下载状态，汇总 PDF 清单
  ├── 合并去重（DOI → arXiv ID → 标题+年份）
  ├── 全局排序（时效性 + 引用数 + venue 等级）
  ├── 生成 search_summary.md + candidate_papers.md
  ├── 生成 search_results.yaml（给 04-paper-digest）
  └── 生成 search_result.yaml（给 auto）
    ↓
04_paper_digest
```

**角色边界**：

| 谁 | 做什么 |
|----|--------|
| Coordinator（本 Skill） | 读计划 → 生成说明书 → dispatch → 收报告 → 检查下载 → 合并去重 → 生成最终报告 |
| grant-searcher（worker agent） | 收说明书 → 读 search-protocol.md → 搜索 → 筛选排序 → 下载 OA PDF → 写局部报告+manifest → 返回摘要 |

**Coordinator 不执行搜索、不下载 PDF。searcher 不做去重合并、不生成最终报告。**

---

## 2. 输入文件规则

### 2.1 必须读取

```text
workflow/02_literature_plan/round_XX/round_goal.md       # 本轮执行说明
workflow/02_literature_plan/round_XX/search_queries.yaml # 结构化查询计划
```

从 `round_goal.md` 获取：本轮 goal、要查什么 / 不查什么、核心问题、筛选标准。

从 `search_queries.yaml` 获取：`queries` 列表、`selection_policy`、`expected_academic_search_outputs.output_dir`。

### 2.2 建议读取

```text
workflow/02_literature_plan/long_plan.yaml  # 了解整体任务背景
```

### 2.3 轮次判断

从 `workflow/02_literature_plan/latest_plan.yaml` 获取当前轮次，对应创建 `workflow/03_academic_search/round_XX/`。

---

## 3. 共享参考文件

搜索规则不内嵌在本 Skill 中。Coordinator 在生成 instruction sheet 时引用以下文件路径，searcher agent 自行读取：

| 文件 | 谁读 | 内容 |
|------|------|------|
| `references/academic-search/search-protocol.md` | searcher（必读） | 完整搜索规范 |
| `references/academic-search/api-cookbook.md` | searcher（按需） | API 模板 |
| `references/academic-search/disciplines/*.md` | searcher（按需） | 学科规则 |
| `references/academic-search/site-patterns/*.md` | searcher（按需） | 站点经验 |
| `references/academic-search/venue-rankings.md` | searcher（按需） | CCF 分级 |
| `references/academic-search/metadata-schema.md` | coordinator（按需） | 去重合并规则 |

---

## 4. 前置检查

```bash
bash scripts/academic-search/check-deps.sh
```

- **curl**：必需
- **Node.js 22+**：CDP 模式必需
- **Chrome remote-debugging**：仅 Google Scholar/CNKI 必需

---

## 5. Coordinator 执行流程

### 第 1 步：读取本轮计划

读取 `round_goal.md` + `search_queries.yaml` + `long_plan.yaml`。

提取：
- 本轮 query 列表（`search_queries.yaml` 的 `queries`）
- 本轮核心问题与目标（`round_goal.md`）
- selection_policy（从 `search_queries.yaml` 或使用默认值）
- 轮次编号和输出目录

### 第 2 步：写入 Instruction Sheet 文件

为每条 query 生成 instruction sheet YAML，**写入磁盘**到 `workflow/03_academic_search/round_{XX}/instructions/{query_id}.yaml`。

先创建目录：`mkdir -p workflow/03_academic_search/round_{XX}/instructions`

文件格式（与 `agents/searcher.md` §4 一致）：

```yaml
instruction_id: "{query_id}"
round_dir: "workflow/03_academic_search/round_{XX}"

query_spec:
  query_id: "{从 search_queries 继承}"
  query_text: "{查询式}"
  query_type: "keyword"
  platforms: ["arxiv", "semantic_scholar"]     # 从 search_queries 或默认
  year_range: [2020, 2026]                      # 从 selection_policy
  target_count: 15
  venue_preference: "CCF-A/B"

round_goal_excerpt:
  goal: "{从 round_goal.md §1}"
  what_to_find: "{从 round_goal.md §2}"
  what_not_to_find: "{从 round_goal.md §3}"
  core_question: "{核心问题}"

selection_policy:
  authority_weight: "high"     # 从 search_queries 或默认
  recency_boost: true
  min_citations: 0
  diversity: true

download_policy:
  download_core_oa: true
  do_not_bypass_paywalls: true
  max_total_downloads: 10
  target_dir: "papers/inbox/"

output:
  local_report: "workflow/03_academic_search/round_{XX}/reports/{query_id}_report.md"
  download_manifest: "workflow/03_academic_search/round_{XX}/reports/{query_id}_manifest.yaml"
```

**关键原则**：instruction sheet 文件是 coordinator 和 searcher 之间的**唯一信息契约**。searcher 不读 search_queries.yaml 或 round_goal.md——所有需要的信息都在文件中。文件落盘后审计可追溯。

### 第 3 步：并行 Dispatch Searcher Agents

所有 query 的 `grant-searcher` agent 同时 dispatch。

**宿主 agent 名称**：

| 宿主 | 必须使用的 worker |
|------|-------------------|
| Claude Code plugin | `grant-master:grant-searcher` |
| Codex multi-agent | `grant_searcher`（由 `.codex/config.toml` 注册，配置文件 `.codex/agents/grant-searcher.toml`） |

如果当前运行环境无法确认上述 worker 已注册，**不得回退到 general-purpose / 通用 agent**；生成 blocked 版 `search_result.yaml`，并提示用户先运行 `bash scripts/codex/check-agents.sh`。

**Dispatch prompt 模板**（只传文件路径，不贴 YAML 正文）：

```
你是 grant-searcher。按照 agents/searcher.md 的流程执行。

instruction_sheet_path: workflow/03_academic_search/round_{XX}/instructions/{query_id}.yaml

流程：
1. 先 Read instruction_sheet_path（你的任务规格）
2. 再 Read references/academic-search/search-protocol.md（搜索宪法）
3. 按说明书执行搜索、筛选、下载、局部报告
4. 返回结构化摘要。不要做跨 query 去重合并。
```

- `grant-searcher` 标记为 `parallel_safe: true`，全部并行执行
- 每个 searcher 独立：读说明书 → 读宪法 → 搜索 → 筛选排序 → 下载 OA PDF → 写局部报告 → 写 manifest → 返回摘要

### 第 4 步：收集 Searcher 结果

等待所有 searcher 返回。对每个 searcher 的返回：

1. **验证结构化摘要完整**：papers 列表非空、stats 字段齐全、output_files 路径存在
2. **验证局部报告已写入**：检查 `output.local_report` 文件存在且非空
3. **验证下载 manifest 已写入**：检查 `output.download_manifest` 文件存在且非空
4. **检查下载状态**：汇总各 query 的 `stats.downloaded_count`、`stats.download_failed_count`、`stats.paywalled_skipped_count`

若某 searcher 返回空或报错：记录到 `errors` 列表，继续处理其余。

### 第 5 步：合并去重与全局排序

对所有 searcher 返回的 papers 列表：

1. **去重合并**（按 metadata-schema.md 规则）：
   - DOI 精确匹配（最高优先级）
   - arXiv ID 匹配
   - 标题 + 第一作者 + 年份模糊匹配
2. **跨 query relevance 融合**：取最高值
3. **全局排序**：近 6 个月 [新] 置顶 → 引用数降序 → venue 等级

### 第 6 步：生成最终输出文件

Coordinator 基于合并后的论文列表和所有局部报告生成：

1. **search_summary.md** — 综合调研报告（给人看）
   - 调研概览（总 query 数、总论文数、core/general 分布）
   - 各 query 摘要（从局部报告提取）
   - 重要论文（core）摘要（合并后，每篇 2-4 句）
   - 一般论文清单
   - PDF 下载总览（已下载 OA PDF / 非 OA 需合法获取 / 下载失败）
   - 跨 query 发现与建议

2. **candidate_papers.md** — 优先级排序表（标注 PDF 下载状态、来源 query）

3. **search_results.yaml** — 结构化论文列表（给 04-paper-digest 读取）
   - 每篇完整元数据 + local_pdf 路径 + download_source
   - **保留 `query_id`**：每篇论文标注来源 query_id，供 04-paper-digest 按标签分组
   - 遵守 `references/academic-search/metadata-schema.md`

4. **download_queue.yaml** — PDF 下载状态汇总（从各 manifest 合并）

### 第 7 步：写 search_result.yaml + 完整性自检

1. 验证所有输出文件存在且非空：
   - `workflow/03_academic_search/round_XX/search_summary.md`
   - `workflow/03_academic_search/round_XX/candidate_papers.md`
   - `workflow/03_academic_search/round_XX/search_results.yaml`
   - `workflow/03_academic_search/round_XX/search_result.yaml`
2. 将验证结果写入 `search_result.yaml` 的 `integrity` 字段

---

## 6. 输出文件结构

```text
workflow/03_academic_search/round_XX/
  instructions/
    Q1.yaml                # Coordinator 写入的说明书（→ searcher 读取）
    Q2.yaml
  reports/
    Q1_report.md           # grant-searcher 产出的局部报告
    Q1_manifest.yaml       # grant-searcher 产出的下载清单
    Q2_report.md
    Q2_manifest.yaml
  search_summary.md        # Coordinator 产出的综合调研报告
  candidate_papers.md      # Coordinator 产出的优先级排序表
  search_results.yaml      # Coordinator 产出的结构化结果（→ 04-paper-digest）
  download_queue.yaml      # Coordinator 产出的下载状态汇总
  search_result.yaml       # Coordinator 产出的阶段状态（→ auto）
```

---

## 7. 论文文件管理

PDF 由 grant-searcher agent 直接下载到：

```text
papers/
  ├── inbox/      # searcher 下载的 PDF，供 04-paper-digest 读取
  └── proceeded/  # 被 04 精读后移入（由 04 管理）
```

Coordinator 不移动 PDF，只汇总各 searcher 的下载清单到 `download_queue.yaml`。

---

## 8. 最终响应格式

```text
已完成第 XX 轮文献查找（Coordinator 模式）：

调度 query 数：{N} 条
并行 searcher agent 数：{N}

搜索统计：
- 候选论文总数：{N} 篇（core {N}，general {N}）
- 已自动下载 PDF：{N} 篇（papers/inbox/）
- 非 OA 需合法获取：{N} 篇（见 download_queue.yaml）
- 需用户手动提供 PDF：{N} 篇（见 download_queue.yaml）

输出文件：
- workflow/03_academic_search/round_XX/search_summary.md
- workflow/03_academic_search/round_XX/candidate_papers.md
- workflow/03_academic_search/round_XX/search_results.yaml
- workflow/03_academic_search/round_XX/download_queue.yaml
- workflow/03_academic_search/round_XX/search_result.yaml
- workflow/03_academic_search/round_XX/reports/（{N} 份局部报告）

各 query 局部报告：
- Q1：{core_count} core + {general_count} general，下载 {downloaded_count} 篇
- Q2：...

下一步建议：进入 04-paper-digest，精读重要论文。
```

---

## 9. search_result.yaml 结构

```yaml
stage: "ACADEMIC_SEARCH"
round: 1
status: "completed"
can_continue: true
recommended_next_stage: "PAPER_DIGEST"

query_stats:
  total_queries: 3
  completed_queries: 3
  failed_queries: 0

paper_counts:
  total_candidates: 35
  core: 18
  general: 17
  recent_count: 12

download_summary:
  total_eligible: 18
  downloaded: 12
  paywalled_skipped: 3
  failed: 2
  skipped: 0

outputs:
  search_summary: "workflow/03_academic_search/round_01/search_summary.md"
  candidate_papers: "workflow/03_academic_search/round_01/candidate_papers.md"
  search_results: "workflow/03_academic_search/round_01/search_results.yaml"
  download_queue: "workflow/03_academic_search/round_01/download_queue.yaml"
  instructions_dir: "workflow/03_academic_search/round_01/instructions/"
  reports_dir: "workflow/03_academic_search/round_01/reports/"

integrity:
  all_outputs_present: true
  checked_at: "{timestamp}"
  missing_outputs: []
  warnings: []

errors: []
```

---

## 10. 质量要求

1. Coordinator 不执行搜索——只编排和汇总
2. Coordinator 不下载 PDF——searcher 负责下载
3. 每条 query 生成的 instruction sheet 必须完整（含全部 7 个 top-level key）
4. dispatch 时只传数据和指令，不传搜索规则——searcher 自己读共享文件
5. 所有 searcher 并行 dispatch（parallel_safe: true）
6. 合并去重按 DOI → arXiv ID → 标题+年份优先级
7. 收集完所有 searcher 结果后，检查每个局部报告和 manifest 是否存在
8. 首次调研至少 20 篇候选论文（core ≥10，general ≥10）
9. 不读取、修改、创建 ./workflow/proposal_state.yaml
10. 最终响应中不要执行其他 Skill
