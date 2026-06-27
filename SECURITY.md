# 安全声明

Grant-Master 的学术搜索模块包含 CDP Proxy，用于通过 Chrome DevTools Protocol 控制本机 Chrome，访问 Google Scholar、CNKI 等需要浏览器交互的平台。该能力很方便，但也意味着它可能携带浏览器登录态，因此必须谨慎使用。

## CDP Proxy 安全边界

- CDP Proxy 只应监听本机回环地址 `127.0.0.1`。
- 不要把 `CDP_PROXY_PORT` 暴露到公网、局域网、容器外部或共享服务器的其他用户。
- 不要使用 SSH 端口转发、反向代理、ngrok、frp 等方式暴露 CDP Proxy。
- 不要在不可信机器、共享账号、公共服务器或多人共用的浏览器配置中运行 CDP Proxy。
- 运行前请确认 `scripts/academic-search/cdp-proxy.mjs` 中 `server.listen` 绑定的是 `127.0.0.1`，而不是 `0.0.0.0`。

## 浏览器登录态风险

CDP 模式会连接用户日常 Chrome。若 Chrome 已登录 Google Scholar、CNKI、学校图书馆、出版社平台或其他网站，自动化页面可能继承这些登录态。

因此请注意：

- 不要让不可信 prompt、未知来源的 skill 或未经审查的脚本控制 CDP Proxy。
- 不要在同一浏览器配置中保存不必要的敏感账号。
- 如果担心登录态风险，建议使用单独的 Chrome profile 专门运行 Grant-Master。
- 遇到登录页、验证码、授权页面或付费墙时，应停止自动化访问并记录状态，不应尝试绕过。
- 不要把包含 cookie、session、网页截图、页面 HTML、下载清单中敏感 URL 的文件提交到公开仓库。

## 学术全文与付费墙

Grant-Master 只允许自动下载合法开放全文。对于 `needs_institution`、`no_open_pdf` 或未确认开放获取的论文：

- 不得绕过付费墙。
- 不得搜索、访问、推荐或自动化使用 Sci-Hub、LibGen 或类似未授权来源。
- 只记录 DOI、论文链接、开放获取状态和合法获取建议。

更完整的合规规则见 [COMPLIANCE.md](COMPLIANCE.md)。

## 敏感信息处理

请不要提交以下内容：

- API key、访问 token、cookie、session、密码或 `.env` 文件；
- 个人账号截图、网页登录态截图、含授权信息的 HTML；
- 机构内部模板、未公开申请书材料、真实申请人隐私信息；
- 未授权分发的论文 PDF 或出版商全文；
- 可能暴露本机路径、内网地址或私有服务地址的日志。

如果不确定某个文件是否适合公开，请先不要提交，或在 PR 中说明并请求维护者审查。

## 漏洞上报

如果你发现安全问题，请优先使用 GitHub Security Advisory 私密上报。

如果当前仓库没有开启 Security Advisory，请不要在公开 issue 中贴出可直接复现的漏洞细节、token、cookie、PoC 或利用步骤。可以先创建一个简短 issue，说明“发现潜在安全问题，希望维护者提供私密联系方式”，再通过私密渠道沟通。

上报时建议包含：

- 受影响的文件或模块；
- 风险类型，例如端口暴露、登录态泄露、任意页面操作、敏感文件提交等；
- 影响范围和触发条件；
- 建议修复方向；
- 不包含敏感凭据的最小复现描述。

## 支持版本

当前项目仍处于早期实验阶段。默认只维护最新主分支的安全修复；历史版本不承诺单独回补。
