# 排障指南

本文档记录 `snow-index` 可复用的公开排障路径。不要在这里保存 raw logs、Cloudflare 私有标识、tokens、cookies、Access JWTs、本机绝对路径或私人账号信息。

## 静态检查失败

先运行：

```bash
pnpm check
```

常见原因：

- `public/` 缺少必需文件。
- `site-config.js` 缺少公开配置字段或包含非公开链接。
- HTML 缺少 SEO metadata、script hook 或 required copy。
- fixtures 不是有效 JSON，或 shape 不满足静态检查脚本。

修复时优先更新拥有该行为的源文件，不要只放宽 `scripts/check-static.mjs`。

## Plaza 页面无法显示数据

确认边界：

- `snow-index` 只负责公共前端和 fixture fallback。
- `snow-base` 负责 `/api/v1/portal/summary` 和 `/api/v1/plaza/*`。
- 本项目不保存 API secrets、D1/R2 access、moderation state 或 Turnstile secret。

排查顺序：

1. 本地确认 `pnpm check` 通过。
2. 用本地 preview 检查 fixture fallback 是否能渲染。
3. 对生产或 preview API 只记录 sanitized status、CORS/fetch failure signature 和公开路径。
4. 若 API contract 本身变化，先在 `snow-base` 确认公开 DTO，再更新本项目消费逻辑和文档。

## Topic clean URL 丢失

`/plaza/t/<topic>` 由 Pages Function 服务静态 topic shell，并保留原始 URL 给客户端解析 topic ID。

验证时不要只看 HTTP 200，还要检查：

- effective URL 仍是 `/plaza/t/<topic>`；
- `functions/plaza/t/[[topic]].js` 没有把路径重写成 `/plaza/topic.html`；
- client-side topic parser 仍能读取 topic ID。

## 生产部署审批失败

生产 workflow 先通过 candidate 路径冻结并登记 `pages-dist`，selected-artifact 路径再下载同一 GitHub artifact、复验 canonical digest，并由固定 SHA 的公开 deployment approval Action 分阶段请求、等待和消费审批。

审批失败时默认 fail closed。不要用本地 `wrangler pages deploy`、手工 artifacts 或未推送 commit 绕过审批流程；没有特殊情况或维护者书面说明时，修复配置后重新运行 GitHub Actions production workflow。

常见失败类别：

- GitHub `production` environment 缺少 `DEPLOY_APPROVAL_TOKEN`。
- `snow-base` Admin 未注册 `snow-index/pages`。
- token scope 缺少 `deployments:request`、`deployments:verify` 或标准状态回写所需的 `deployments:run-update`。
- Candidate Run 或 deployment run callback 的 request id、project、target、commit、artifact id/digest 或 GitHub run id 与中心记录不一致；应先检查 workflow 中 Action 的 immutable pin 和对应输入。
- owner 拒绝或审批等待超时。
- selected-artifact 审批前的公开 API preflight 失败：`/api/v1/portal/summary` 或 `/api/v1/plaza/topics?type=all&limit=20&offset=0` 不可访问、不是 JSON，或返回 shape 明显不符合 snow-index 预期。
- `pages-dist.tar.gz` 缺失、不是唯一归档、candidate 已过期，或 GitHub artifact id/run/name 与登记 metadata 不一致。
- 下载后的 tar 路径、mode、owner、mtime、entry type 或 digest 不符合 canonical contract。
- selected-artifact workflow 使用了错误 commit，或尝试从工作区 `public/` 重新部署。

恢复规则：artifact 过期或已消费时重新生成 candidate，不复用旧 approval；digest mismatch、artifact identity mismatch 和中心 promotion 失败时停止 workflow，交由 snow-base control plane 修复或重新 dispatch。`deployments:run-update` 只允许用于标准 Candidate Run / deployment run callback；不要向 snow-index token 增加 `deployments:artifact-promote`、`deployments:artifact-download`、API Worker、D1 或 R2 权限来绕过中心化 promotion。

不要把 token、raw response、private dashboard URL 或平台资源 ID 写入 issue、sidecar run 或文档。记录最小稳定错误签名、需要维护者执行的外部动作，以及 workflow 是否停在审批前还是审批后。

## Cloudflare Pages 路由或 headers 异常

相关文件：

- `public/_redirects`
- `public/_headers`
- `public/_routes.json`
- `functions/plaza/t/[[topic]].js`

验证时记录公开 URL、HTTP status、关键 header、redirect/effective URL 和是否命中预期页面。避免记录 dashboard 内部链接或 raw deploy logs。
