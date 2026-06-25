# Academic-Search 面向多学科用户的完善建议

## 背景

当前 `academic-search` 项目已经具备清晰的 API-first 检索思路、跨平台元数据合并机制和 CDP 浏览器兜底能力。它对 CS/AI 研究任务比较友好，但如果希望服务不同学科的研究人员，还需要进一步处理各学科在检索源、评价标准、元数据字段和全文访问规则上的差异。

核心判断：当前项目不是“不能搜”，而是还没有足够的学科化路由和评价体系。

## 当前优势

1. 已有清晰的 API-first 思路和失败处理框架。
2. 平台覆盖了 arXiv、Semantic Scholar、PubMed、ACM DL、IEEE Xplore、Google Scholar、Papers with Code、CNKI 等主流入口。
3. 已有统一 metadata schema，便于跨平台合并、去重和导出。
4. 已有 `site-patterns` 机制，适合继续沉淀不同平台的操作经验。
5. CDP proxy 能利用用户自己的浏览器登录态，适合处理 Google Scholar、CNKI 等无公开 API 或强反爬平台。

## 主要短板

### 1. 从平台矩阵升级为学科路由

当前平台选择主要围绕 CS/ML、生物医学和中文文献。如果面向多学科用户，应新增 `discipline profiles`，让不同学科有自己的首选平台、查询扩展规则、排序标准和输出模板。

建议新增目录：

```text
references/disciplines/
├── computer-science.md
├── biomedicine.md
├── physics-math.md
├── chemistry-materials.md
├── economics-social-science.md
├── humanities-law.md
└── chinese-scholarship.md
```

学科路由示例：

| 学科 | 首选平台 |
|------|----------|
| 计算机 | arXiv、Semantic Scholar、ACM DL、IEEE Xplore、Papers with Code、DBLP |
| 医学/生命科学 | PubMed、PMC、Europe PMC、ClinicalTrials、bioRxiv、medRxiv |
| 化学/材料 | Crossref、OpenAlex、ChemRxiv、ACS、RSC、Springer、Wiley |
| 物理/天文 | arXiv categories、NASA ADS、INSPIRE HEP |
| 经济/社科 | RePEc、NBER、SSRN、OSF、PsyArXiv |
| 人文/法律 | JSTOR、Project MUSE、HeinOnline、Google Scholar、图书馆目录 |
| 中文文献 | CNKI、万方、维普、国家哲社、学位论文入口 |

### 2. 评价标准不能只依赖 CCF 和引用数

当前 `venue-rankings.md` 主要服务 CS 领域。跨学科后，排序逻辑应按学科拆分。

建议拆分为：

```text
references/rankings/
├── cs-ranking.md
├── biomed-evidence-ranking.md
├── social-science-ranking.md
├── chemistry-journal-ranking.md
└── humanities-source-ranking.md
```

不同学科的评价重点不同：

| 学科 | 推荐评价维度 |
|------|--------------|
| 医学 | 系统综述、RCT、队列研究、病例报告、MeSH 词、样本量、临床指南 |
| 生命科学 | peer-reviewed 状态、实验对象、数据集、预印本状态、期刊影响力 |
| 化学/材料 | 期刊、材料体系、实验/计算类型、表征方法、数据可复现性 |
| 社科/经济 | 工作论文 vs 期刊论文、JEL 分类、方法类型、数据来源、机构来源 |
| 人文 | 专著、章节、档案来源、版本、出版社和引用传统 |
| CS/AI | CCF、顶会、引用数、代码可用性、数据集和 benchmark |

### 3. Metadata schema 需要扩展

当前 schema 是通用论文字段，但跨学科使用时字段不足。建议新增：

| 字段 | 用途 |
|------|------|
| `publication_date` | 精确到日，适合预印本和医学文献 |
| `publication_type` | review、clinical trial、case report、book chapter、preprint 等 |
| `open_access_status` | gold、green、hybrid、closed、unknown |
| `license` | CC-BY、CC-BY-NC 等开放许可 |
| `pmcid` | PubMed Central 全文标识 |
| `isbn` / `issn` | 图书、期刊识别 |
| `orcid` | 作者身份消歧 |
| `mesh_terms` | 医学主题词 |
| `jel_codes` | 经济学分类 |
| `msc_codes` | 数学分类 |
| `acm_ccs` | 计算机分类 |
| `study_type` | 医学/社科研究类型 |
| `sample_size` | 医学/社科研究样本量 |
| `population` | 研究对象或人群 |
| `data_availability` | 数据是否可得 |
| `code_url` | 代码仓库 |
| `full_text_status` | 全文访问状态 |

`full_text_status` 建议使用枚举：

```text
open_pdf
needs_institution
no_open_pdf
anti_bot_blocked
html_not_pdf
unknown
```

### 4. 全文获取应从下载成功/失败改为可访问性判定

多学科用户经常会遇到 Elsevier、Wiley、Springer、ACS、Taylor & Francis、JSTOR 等平台的访问限制。项目需要明确区分“没有开放全文”和“下载器失败”。

建议输出以下状态：

| 状态 | 含义 |
|------|------|
| `open_pdf` | 找到可公开访问 PDF |
| `needs_institution` | 论文页可访问，但全文需要机构权限 |
| `no_open_pdf` | 未找到开放 PDF |
| `anti_bot_blocked` | 被 Cloudflare、验证码或反爬限制拦截 |
| `html_not_pdf` | PDF 路由返回 HTML 页面而非 PDF |
| `unknown` | 无法可靠判断 |

同时，应调整 README 中容易造成误解的表述。例如将“PDF 级联获取”改成“开放获取 PDF 级联获取”，明确项目不绕过付费墙，也不保证下载所有 DOI。

### 5. 补充 OpenAlex / Crossref / Unpaywall 作为跨学科底座

Semantic Scholar 对 CS/AI 场景很好，但跨学科覆盖不均衡。面向多学科时，建议补充：

| 平台 | 价值 |
|------|------|
| Crossref | DOI、期刊、出版商、引用元数据基础 |
| OpenAlex | 跨学科覆盖、机构、作者、概念、引用关系 |
| Unpaywall | 开放获取状态和 OA URL |
| ORCID | 作者身份消歧 |
| Europe PMC | 生命科学开放全文补充 |
| NASA ADS | 天文和物理文献 |
| RePEc | 经济学工作论文和期刊 |
| DBLP | CS 作者、会议和论文索引 |

这些平台比继续扩大网页抓取更稳定，也更适合学科覆盖。

### 6. Query expansion 需要学科化

当前 query expansion 示例偏 CS/LLM。跨学科检索需要支持受控词表和学科分类体系。

| 学科 | 推荐扩展方式 |
|------|--------------|
| 医学 | MeSH 词、同义疾病名、药物通用名/商品名 |
| 经济学 | JEL 代码、政策术语、国家/地区实体 |
| 数学 | MSC 代码、定理名、问题名 |
| 计算机 | ACM CCS、任务名、数据集名、benchmark 名 |
| 物理 | arXiv category、PACS、实验装置名 |
| 化学 | 化合物同义词、CAS 号、材料名、反应类型 |
| 人文 | 人名译名、作品名、时代、地区、档案关键词 |

建议在每个 `discipline profile` 中定义：

```text
query_expansion:
  - controlled_vocabulary
  - synonym_rules
  - identifier_rules
  - exclusion_terms
```

### 7. 增加研究工作流，而不仅是搜索

多学科用户常见需求不是单篇查找，而是完整研究流程。

建议新增：

```text
references/workflows/
├── quick-literature-scan.md
├── systematic-review.md
├── seminal-papers.md
├── latest-progress.md
├── author-institution-analysis.md
├── dataset-code-search.md
└── annotated-bibliography.md
```

可支持的工作流：

1. 快速领域综述。
2. 系统综述 / PRISMA 风格筛选。
3. 找领域经典论文。
4. 找近 6-12 个月最新进展。
5. 生成 annotated bibliography。
6. 找数据集、代码、实验协议。
7. 作者和机构分析。
8. 导出 BibTeX、RIS、EndNote、Zotero CSV。
9. 按主题聚类论文。

## 优先级建议

### P0：修复预期和可靠性

短期最应该做：

1. README 明确“开放获取 PDF”，避免承诺任意 PDF 下载。
2. 在 SKILL 中加入全文访问失败分类。
3. 增加 publisher 站点经验文件：Elsevier、Wiley、Springer、ACS、Taylor & Francis。
4. 明确不绕过付费墙、不下载版权受限全文。

### P1：建立学科 profiles

先覆盖四类高频用户：

1. CS/AI。
2. 医学/生命科学。
3. 物理/数学。
4. 社科/经济。

每个 profile 至少包含：

1. 首选平台。
2. 查询扩展规则。
3. 排序和评价标准。
4. 输出字段。
5. 全文访问注意事项。

### P2：扩展 schema 和导出能力

1. 增加 OA 状态、publication type、学科分类码。
2. 支持 RIS、EndNote、Zotero CSV。
3. 增加 `full_text_status`。
4. 增加 ORCID、PMCID、ISSN、ISBN 等标识符。

### P3：沉淀工作流模板

1. systematic review。
2. 领域综述。
3. 核心论文清单。
4. 作者/机构分析。
5. 数据集和代码检索。

## 建议的目录结构

```text
references/
├── api-cookbook.md
├── metadata-schema.md
├── cdp-api.md
├── disciplines/
│   ├── computer-science.md
│   ├── biomedicine.md
│   ├── physics-math.md
│   ├── chemistry-materials.md
│   ├── economics-social-science.md
│   └── humanities-law.md
├── rankings/
│   ├── cs-ranking.md
│   ├── biomed-evidence-ranking.md
│   ├── social-science-ranking.md
│   └── chemistry-journal-ranking.md
├── workflows/
│   ├── quick-literature-scan.md
│   ├── systematic-review.md
│   ├── seminal-papers.md
│   └── annotated-bibliography.md
└── site-patterns/
    ├── arxiv.org.md
    ├── pubmed.ncbi.nlm.nih.gov.md
    ├── sciencedirect.com.md
    ├── onlinelibrary.wiley.com.md
    ├── link.springer.com.md
    └── pubs.acs.org.md
```

## 总结

当前项目可以定位为“CS/AI 友好的学术搜索 Skill”。如果要给各学科人员使用，关键不是简单增加更多网站，而是把以下能力做成可配置结构：

1. 学科路由。
2. 学科化 query expansion。
3. 学科评价标准。
4. 扩展 metadata schema。
5. 全文可访问性判定。
6. 跨学科基础平台。
7. 研究工作流模板。

优先从 P0 和 P1 做起，可以最快降低用户误解，并让不同学科用户获得稳定、可解释的检索结果。
