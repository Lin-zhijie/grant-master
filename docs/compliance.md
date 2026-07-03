# 合规政策

Grant-Master 旨在支持合法的学术搜索、证据整理和项目申请书初稿写作。

## 学术全文访问

学术搜索工作流只能自动下载合法可访问的开放全文，包括：

- arXiv PDF
- PubMed Central / Europe PMC 开放全文
- Semantic Scholar `openAccessPdf`
- OpenAlex 开放获取位置
- Unpaywall 开放获取位置
- 出版商明确标记为 Open Access 的 PDF
- 用户手动放入 `papers/inbox/` 的本地 PDF

## 付费墙边界

对于标记为 `needs_institution`、`no_open_pdf`，或未确认开放获取的论文：

- 不得绕过付费墙。
- 不得搜索、访问、推荐或自动化使用 Sci-Hub、LibGen 或类似未授权来源。
- 遇到 HTTP 403、登录跳转、授权页面、验证码或反爬拦截后，不得反复重试出版商 PDF 端点。
- 应记录 DOI、出版社 URL、开放获取状态，以及明确原因，例如 `paywalled_do_not_bypass`。
- 只能建议合法替代方式，例如机构图书馆访问、馆际互借、作者公开稿、开放仓储版本，或用户手动提供的本地 PDF。

## 实现约束

权威执行规则位于：

- `references/academic-search/search-protocol.md`
- `agents/searcher.md`
- `skills/03-academic-search/SKILL.md`
- `scripts/academic-search/oa-pdf-download.mjs`

如果这些文件之间存在冲突，应采用更严格的规则：避免绕过付费墙，避免未授权全文访问。
