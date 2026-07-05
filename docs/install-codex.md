# 在 Codex Desktop 中安装 Grant-Master

本仓库推荐让 Codex 自己完成安装。

新开一个 Codex 对话，把下面这段话发给 Codex：

```text
请从 https://github.com/Lin-zhijie/grant-master 安装 Grant-Master Codex plugin。请 clone 仓库后运行 scripts/install-codex.sh（Windows 则运行 scripts/install-codex.ps1），完成后告诉我是否安装成功。
```

如果仓库已经在本地 clone，可以在仓库根目录直接运行：

```bash
bash scripts/install-codex.sh
```

Windows PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-codex.ps1
```

安装器会完成以下操作：

1. 把插件复制到 `~/plugins/grant-master`；
2. 创建或更新 `~/.agents/plugins/marketplace.json`；
3. 注册 `grant_searcher`、`grant_digester`、`grant_writer` 三个 Codex worker roles；
4. 执行 `codex plugin add grant-master@personal --json` 并确认插件已激活。

不要把仓库直接复制到 `~/.codex/plugins/grant-master`。那不是 Codex Desktop personal marketplace 的完整安装路径，可能导致插件管理页提示 `Failed to load plugin connection`。

如果插件文件和 marketplace 条目都已经存在，但 `codex plugin list` 仍显示 `grant-master@personal` 未安装，问题通常在最后的 Codex CLI 激活步骤。Windows 上可能出现 PowerShell 能解析 `codex` shim 或 alias，但 Node.js 不能直接启动同一命令的情况。安装器会依次尝试直接 `codex`、Windows shim 和 shell 激活；如果都失败，会以非 0 状态退出并打印每条命令的错误输出。

Grant-Master worker roles 默认声明 `model = "gpt-5.5"`，因为 Codex 在启动子 agent 前会先校验 child model。如果你的 Codex 账号或部署使用不同模型名，可以在运行安装器前设置 `GRANT_MASTER_CODEX_WORKER_MODEL`。

调试时可以使用：

```bash
node scripts/codex/install-codex.mjs --allow-partial
```

这个模式只保留已复制的文件和 marketplace 条目，不要求 CLI 激活成功。正常安装不建议使用。
