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

生产 workflow 在 Cloudflare Pages deploy 前调用 `scripts/verify-deployment-approval.mjs`。

常见失败类别：

- GitHub `production` environment 缺少 `DEPLOY_APPROVAL_TOKEN`。
- `snow-base` Admin 未注册 `snow-index/pages`。
- token scope 缺少 `deployments:request` 或 `deployments:verify`。
- owner 拒绝或审批等待超时。

不要把 token、raw response、private dashboard URL 或平台资源 ID 写入 issue、sidecar run 或文档。记录最小稳定错误签名和需要维护者执行的外部动作。

## Cloudflare Pages 路由或 headers 异常

相关文件：

- `public/_redirects`
- `public/_headers`
- `public/_routes.json`
- `functions/plaza/t/[[topic]].js`

验证时记录公开 URL、HTTP status、关键 header、redirect/effective URL 和是否命中预期页面。避免记录 dashboard 内部链接或 raw deploy logs。
