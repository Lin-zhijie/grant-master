# Grant Writing Plugin

中文项目申请书全流程写作工具链。从课题分析到成稿输出，11 个阶段 + auto（共 12 个 skill）。

## 安装


参考 [在 skills 目录中开发插件](https://code.claude.com/docs/zh-CN/plugins#develop-a-plugin-in-your-skills-directory)：

```bash
# 1. 初始化插件骨架
claude plugin init grant-master

# 2. 将本插件所有内容直接复制到初始化目录中
cp -r grant-master/* ~/.claude/skills/grant-master/
```

> **注意：** 运行 `claude plugin init` 后会在 `~/.claude/skills/` 下生成插件目录。本仓库所有文件（skills/、agents/ 等）应直接复制到该目录中，覆盖初始化生成的骨架文件。

系统依赖：

```bash
sudo apt install pandoc
pip install weasyprint        # 可选，用于 PDF 输出
pip install python-docx       # 可选，用于模板填充式 docx
```


### 关于 `.plugins` 文件夹

`.plugins` 文件夹（位于 `~/.claude/.plugins/`）存储的是从 Marketplace 下载的插件。`claude plugins install` 命令会自动将插件下载到该目录进行管理。由于我们是本地创建的，所以放到/.plugins文件夹是识别不到的。


## Pipeline

```
01_topic          课题初始理解
  ↓
02_literature_plan → 03_academic_search → 04_paper_digest → 05_synthesis
  ↑                                                              │
  └──────── 调研循环（可回环多轮）───────────────────────────────┘
                                                                  ↓
06_helm           整体方案规划与主线收敛
  ↓
07_outline        申请书内容架构与体量规划
  ↓
08_section_write  逐 unit 写作 ←─────────────────────┐
  ↓                                                   │
09_assemble       合并组装 + PDF 输出                  │
  ↓                                                   │
10_review         全局审阅 ──── P0 > 0 ───────────────┘
  ↓
11_output         md → docx 输出
```

## 快速开始

```bash
# 方式 1：手动逐阶段执行
/01-topic
/02-literature-plan
/03-academic-search
# ...

# 方式 2：自动编排（推荐）
/auto              # 协作模式，逐步推进
/auto --auto       # 自动模式，连续执行
/auto 状态         # 查看当前进度
/auto 继续         # 从中断处续跑
```

## 项目目录结构

插件期望在项目根目录有以下文件：

```
./
├── topic.md                         # 课题描述（必需）
├── requirements.md                  # 申报要求（可选）
├── applicant_profile.md             # 申请人信息（可选）
├── references/
│   └── Template.docx                # 申请书模板（可选，影响 07/11）
├── papers/
│   ├── inbox/                       # 待精读论文
│   └── proceeded/                   # 已精读论文
└── workflow/
    ├── proposal_state.yaml          # auto 状态文件（自动创建）
    ├── 01_topic/
    │   └── 01_topic_card.md         # 课题初始理解卡片
    ├── 02_literature_plan/
    ├── 03_academic_search/
    ├── 04_paper_digest/
    ├── 05_synthesis/
    ├── 06_helm/
    ├── 07_outline/
    ├── 08_section_write/
    ├── 09_assemble/
    ├── 10_review/
    └── 11_output/
```

## 两个模式

| | 协作模式 `/auto` | 自动模式 `/auto --auto` |
|---|---|---|
| 调研循环 | 每轮结束询问用户 | 达到条件自动跳出 |
| 写作循环 | 每 unit 可暂停 | 连续写完全部 |
| P0 修复 | 列出建议，等用户确认 | 自动回灌 → 重写 → 再审阅 |
| 阻塞 | 暂停并提示 | 暂停（阻塞不可自动解决） |

## 许可证

MIT
