# 第 XX 轮文献查找短期目标

## 1. 本轮调研依据

说明本轮计划基于哪些文件生成。

第一轮通常基于：
- `workflow/01_topic/01_topic_card.md`
- `workflow/01_topic/01_literature_seed.yaml`

后续轮次通常基于：
- `workflow/05_synthesis/current_view.md`
- 最新 synthesis result
- 上一轮 `workflow/02_literature_plan/long_plan.yaml`
- 上一轮 `round_XX/plan_result.yaml`

## 2. 长期计划更新摘要

说明本轮对 `long_plan.yaml` 做了哪些更新：

- 新增了哪些长期任务；
- 标记了哪些任务已计划 / 已完成；
- 本轮标注为跳过的任务（如有）：
  - 任务 ID 和名称；
  - 跳过依据：来自哪个输入文件（如 `01_topic_result.yaml` 中 `background_clarity: high`）或用户何时明确指出；
  - 跳过理由：为何不需要执行；
- 为什么选择本轮任务。

## 3. 本轮短期 goal

用一句话说明本轮 academic-search 的立即目标。

- 背景轮：可以快速建立背景视野；
- 非背景轮：必须聚焦一个主任务，最多一个高度相关辅助任务。

## 4. 本轮任务边界

### 本轮要查

列出本轮要查的内容。

### 本轮不查

列出本轮暂时不查的内容，避免 academic-search 发散。

## 5. 本轮核心问题

列出 3-6 个本轮必须回答的问题。这些问题必须能通过文献查找得到候选论文线索。

## 6. 本轮关键词与检索式

包括：
- 中文关键词；
- 英文关键词；
- 英文检索式。

## 7. 候选论文筛选标准

说明 academic-search 返回论文后如何筛选。至少包括：

- 优先保留什么；
- 排除什么；
- 近 5 年与经典论文如何平衡；
- 是否优先顶会；
- 是否需要开放 PDF；
- 哪些论文可能需要用户手动下载。

## 8. 期望第 03 阶段输出

明确要求第 03 阶段输出到 `workflow/03_academic_search/round_XX/` 并生成：

- `search_results.yaml`
- `candidate_papers.md`
- `download_queue.yaml`
- `search_summary.md`

## 9. 给 academic-search 的执行说明

写一段可以直接复制给 academic-search 的任务说明。必须强调：

- 本轮只执行当前 goal；
- 不要扩展到长期计划中的其他任务；
- 不生成文献综述结论；
- 不精读论文；
- 只返回候选论文和下载状态。
