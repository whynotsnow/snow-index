# 部署审批 Token 命名

本文记录 `snow-index` 的命名清理结果，以及需要在 `snow-base` 中另行完成的后续改动。

## 当前决策

在 `snow-index` 中使用 `DEPLOY_APPROVAL_TOKEN` 作为 GitHub `production` Environment secret 名称。

理由：

- 该凭据由 `snow-index` 生产 workflow 消费。
- 权限用途是 deployment approval，不是通用 `snow-base` access。
- 签发系统是 `snow-base`，但仓库 secret 名称应描述本地 workflow contract。
- CI client 已读取通用环境变量 `DEPLOY_APPROVAL_TOKEN`。

本地 CI client 使用通用 `DEPLOY_APPROVAL_TOKEN`。旧 `SNOW_BASE_DEPLOY_APPROVAL_TOKEN` 只作为 snow-base 侧迁移窗口内的兼容 alias，不再作为本仓库推荐配置。

## snow-index 改动

- `.github/workflows/production-deploy.yml` 从 `${{ secrets.DEPLOY_APPROVAL_TOKEN }}` 映射 `DEPLOY_APPROVAL_TOKEN`。
- `scripts/verify-deployment-approval.mjs` 优先报告通用变量名，并把旧 `SNOW_BASE_*` 名称仅视作兼容路径。
- `docs/developers/deployment-routing.md` 将 `DEPLOY_APPROVAL_TOKEN` 记录为必需的 production Environment secret。

## 必需 GitHub 配置

在 `whynotsnow/snow-index` -> `Settings` -> `Environments` -> `production` 中配置：

```text
DEPLOY_APPROVAL_TOKEN
```

该值应是 `snow-base` Admin 创建的 service token，并且只具备：

```text
deployments:request
deployments:verify
deployments:run-update
```

其中 `deployments:run-update` 只用于 `snow-index/pages` 的 Candidate Run 和 deployment run 状态回写。不要为 snow-index token 添加 `deployments:artifact-promote`、`deployments:artifact-download`、API Worker、D1 或 R2 操作权限。

不要把 token 值写入 Git、docs、issues、sidecar records、logs 或 chat。

## snow-base 后续项，不在本仓库修改

以下改动应在 `snow-base` 项目中通过单独 scoped task 完成：

1. 在 `scripts/verify-deployment-approval.mjs` 中，继续优先读取通用变量：
   - `DEPLOY_APPROVAL_TOKEN`
   - `DEPLOY_APPROVAL_COMMIT_SHA`
   - `DEPLOY_APPROVAL_TARGET`
   - `DEPLOY_APPROVAL_REQUEST_SOURCE`
   - `DEPLOY_APPROVAL_REQUEST_URL`
   - `DEPLOY_APPROVAL_WAIT_SECONDS`
   - `DEPLOY_APPROVAL_POLL_SECONDS`

2. 保留旧 `SNOW_BASE_*` 变量作为一个迁移窗口内的 backwards-compatible fallback。

3. 更新脚本错误信息，优先提示通用 `DEPLOY_APPROVAL_*` 名称，旧名称只描述为兼容 alias。

4. 更新 `docs/developers/deployment-approval-integration.md`，让外部项目配置 `DEPLOY_APPROVAL_TOKEN`，而不是 `SNOW_BASE_DEPLOY_APPROVAL_TOKEN`；统一 Candidate Run / deployment run callback 的项目还需要最小 `deployments:run-update` scope。

5. 更新 `docs/developers/deployment.md`，区分：
   - `snow-base` internal workflow compatibility，如果仍然需要。
   - 使用通用 `DEPLOY_APPROVAL_TOKEN` 的 external project integration。

6. 更新 Admin token template UI：
   - `apps/admin/src/pages/tokens/tokenTemplates.ts`
   - `apps/admin/src/pages/tokens/components/CreatedTokenModal.tsx`

   复制出的 GitHub CLI 命令应为外部项目仓库设置 `DEPLOY_APPROVAL_TOKEN`。

7. 如果 `SNOW_BASE_DEPLOY_APPROVAL_TOKEN` 对 `snow-base` 仓库自身仍有用，把它标记为 legacy 或 internal alias，而不是推荐的集成名称。
