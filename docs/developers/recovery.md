# 恢复指南

本文档记录 `snow-index` 的公开恢复策略。生产恢复必须优先使用已推送到 `origin` 的提交、GitHub Actions production workflow 和托管平台已有部署，不从本地 dirty working tree 拼装发布。

## 恢复原则

- 保持 `/` 可用是第一目标。
- 优先使用 Cloudflare Pages previous deployment rollback。
- 需要重新发布时，使用 GitHub Actions production workflow，并等待部署审批门禁通过。
- 避免把 DNS 改动作为第一恢复动作；自定义域 detach/repoint 可能引入额外传播时间。
- 不把 Cloudflare tokens、Access JWTs、raw logs、private resource IDs 或 maintainer 个人信息写入 tracked 文件。

## Portal 内容回滚

适用范围：

- 首页 copy、导航、SEO、公开内容配置错误。
- `site-config.js` 引入无效公开链接。
- Blog/Plaza fixture fallback 显示异常。

恢复步骤：

1. 确认最近一次可用提交或 Pages deployment。
2. 优先通过 Git revert 创建普通修复提交。
3. 运行 `pnpm check`。
4. 通过 GitHub Actions 发布已推送提交。
5. 记录 sanitized 结果到 sidecar run 或发布记录。

## Plaza 前端回滚

适用范围：

- `/plaza/` feed 渲染失败。
- `/plaza/t/<topic>` topic shell 或 topic ID 解析失败。
- public submit flow、Turnstile widget 或 attachment frontend 行为异常。

恢复步骤：

1. 如果问题来自本项目静态前端，回滚相关 `public/plaza*.html`、`public/plaza.js`、`public/styles.css` 或 Pages routing 文件。
2. 如果问题来自 API contract、moderation、D1/R2 或 Turnstile server verification，转到 `snow-base` 处理。
3. 验证 `/plaza/` 和一个已知 `/plaza/t/<topic>` 路径。
4. 不改变 API secrets 或 Cloudflare bindings。

## 部署审批或 workflow 回滚

生产 workflow 出现审批配置问题时，默认 fail closed。不要绕过审批门禁；没有特殊情况或维护者书面说明时，恢复也必须通过 GitHub Actions production workflow 和审批流程。

常规恢复：

1. 修复 GitHub environment secret、`snow-base` Admin project registration 或 token scope。
2. 重新运行 GitHub Actions workflow。
3. 本地监控审批等待时按 `docs/agents/sound-cues.md` 使用 `pnpm cue:deploy-approval`。

异常恢复：

1. 维护者在执行前明确批准异常路径，并说明为什么不能使用 GitHub Actions 审批路径。
2. 确认目标 commit 已推送到 `origin`；如果维护者要求处理未推送状态，必须单独记录该风险。
3. 运行 `pnpm check`，并根据影响范围执行必要的路由或页面验证。
4. 优先重新运行 production workflow；只有维护者特别授权时才允许绕过 workflow。
5. 记录 source commit、特殊原因、验证、残余风险和审批上下文，不记录 secrets 或 raw logs。

## 恢复完成标准

- 受影响公开路径恢复到预期行为。
- `pnpm check` 或更高层验证通过。
- 生产恢复基于已推送提交、GitHub Actions production workflow 和审批门禁；任何偏离都有明确例外记录。
- sidecar run 记录包含 changed paths、commands、results、skipped validation 和 residual risk。
