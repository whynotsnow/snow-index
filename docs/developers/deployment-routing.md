# 部署和路由边界

本文档记录 `snow-index` 当前可部署边界。

## 托管目标

生产版本使用静态 Cloudflare Pages project。

- 项目源码：本仓库。
- Build command：`pnpm check`。
- Publish directory：`public`。
- Runtime secrets：`snow-index` 不持有。
- Public API owner：`snow-base`，通过 `https://api.whynotsnow.com` 暴露。

当前输出将静态资源保留在 `public/`，并为 `/plaza/t/*` 使用一个 Pages Function，使 topic URL 在服务静态 topic shell 时仍保留原始路径。Pages canonical artifact 的 payload 根固定包含 `public/` 和 `functions/` 两棵目录树；归档只保存 regular files，解包后仍从 `public` 执行 Wrangler Pages deploy。

## 生产部署

遵循与 `snow-base` 一致的部署边界：生产部署必须通过 GitHub Actions 执行，来源必须是已经推送到远端仓库的 commit，并且必须通过部署审批门禁后才能发布到 Cloudflare Pages。

不要部署本地 working-tree 状态、未推送 commit、手工拼装的 artifacts，也不要用本地 `wrangler pages deploy` 作为常规发布路径。没有特殊情况或维护者书面说明时，必须遵守 GitHub Actions + 审批门禁路径。

Workflow：

```text
.github/workflows/production-deploy.yml
```

生产 workflow 固定使用公开 `snow-base` deployment approval Action 的完整 commit SHA：
`whynotsnow/snow-base-deployment-approval-action@76c3396eaa0635ef8de2c8668b77d939a292cbac`。
`v1.0.1` 仅是可读版本别名，不作为生产供应链边界；旧 `v1.0.0` pin 不再使用。

该 workflow 同时承载 candidate 和 selected-artifact 两条路径：

- `main` push 或 `snow-base` deployment intent 触发 candidate：运行 `pnpm check`，冻结唯一的 `pages-dist.tar.gz`，上传并下载 round-trip，再计算并登记 canonical digest，然后用 request id 回写标准 Candidate Run。
- Admin 的常规入口是一条 `snow-index/pages` deployment intent。控制面内部负责复用或准备 candidate、绑定 artifact、进入审批并 dispatch `mode=selected-artifact`；用户不需要手工执行“创建 Candidate → 选择 Artifact”两步。
- Admin selected-artifact dispatch 传递 immutable deployment artifact id/digest、GitHub artifact id/run/name、request id 和 exact commit。
- 两条路径先用固定 SHA 的 Action 读取 `snow-index/pages` contract；candidate 还用该 Action 登记 artifact、回写 Candidate Run，selected-artifact 用该 Action 回写 deployment run、请求/等待/消费 owner approval。
- selected-artifact 先回写 deployment run 已开始，再做公开 `snow-base/api` 兼容性 preflight，然后按 GitHub artifact id 和 source run id 下载归档，复验 `sha256:<64 位小写十六进制>`，解包到临时 Pages payload，再请求、等待和消费 owner approval。
- owner approval 消费成功后，只从已复验的临时 payload 执行 Wrangler，不重新 build、不使用工作区 `public/`，也不按 mutable artifact name 取得授权。
- selected-artifact workflow 在 Pages 部署成功或失败后回写 deployment run 结果。该回写只用于中心生命周期状态，不授予 snow-index 读取、提升或重新组装中心 artifact 的能力。
- snow-base control plane 在 Admin selected dispatch 前负责 GitHub artifact 获取、canonical 校验和 durable R2 promotion；snow-index 不请求 `deployments:artifact-promote` 或 `deployments:artifact-download`。

该 workflow 的通用步骤包括：

- 需要名为 `production` 的 GitHub Environment。
- candidate 路径使用 push event 的 exact commit；selected-artifact 路径校验输入 commit 与 checked-out commit 一致。
- 通过 Corepack 使用 Node.js 22 和 pnpm。
- 运行 `pnpm install --frozen-lockfile`。
- 运行 `pnpm check`。
- candidate 路径使用 `scripts/deployment-artifact.mjs` 生成和 round-trip 校验 archive，再由固定 SHA 的 Action 登记 metadata 并回写 Candidate Run。
- selected-artifact 路径使用 `scripts/check-api-compatibility.mjs` 做公开 API preflight，使用 `scripts/deployment-artifact.mjs` 下载后复验 canonical digest，再由固定 SHA 的 Action 分阶段请求/等待/消费审批并回写部署结果。
- 旧的本地 API client 脚本已删除；workflow 不通过 PAT checkout 私有 `snow-base`，也不复制中心协议实现。
- 最终使用 Wrangler 将解包 payload 中的 `public/` 和同级 Pages Functions Direct Upload 到 Cloudflare Pages project `snow-index`。

必需 GitHub Environment secrets：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `DEPLOY_APPROVAL_TOKEN`

Cloudflare API token 应使用能部署 `snow-index` Pages project 并读取 account context 的最小权限。不要把 token、account ID、dashboard URLs、cookies 或 raw deployment logs 写入 sidecar records。

`DEPLOY_APPROVAL_TOKEN` 是在 `snow-base` Admin 中创建的 service token，只应具备以下最小 scopes：

```text
deployments:request
deployments:verify
deployments:run-update
```

其中 `deployments:run-update` 只用于 Candidate Run 和 deployment run 的标准状态回写。虽然签发系统是 `snow-base`，但该 token 是 `snow-index` 的 deployment-approval client credential，因此本仓库使用通用 GitHub secret 名称。

candidate registration 和 selected dispatch 的 artifact envelope 固定为：

```text
artifact type: pages-dist
canonical archive: pages-dist.tar.gz
GitHub artifact name: snow-index-pages-candidate
payload roots: public/, functions/
digest: sha256:<64 lowercase hex>
candidate retention: 7 days
```

candidate 注册 metadata 必须同时保留 `githubArtifactId`、`githubArtifactRunId`、`githubArtifactName` 和 `canonicalArchiveName`。selected workflow 必须使用同一 `artifact_id`/digest/commit/request；任何下载失败、过期、归档缺失、身份不一致或 digest mismatch 都在 approval consume 前 fail closed。审批 token 仍不得包含 `deployments:artifact-promote`、`deployments:artifact-download`、API Worker、D1 或 R2 操作权限。

`scripts/check-api-compatibility.mjs` 只访问公开的 `https://api.whynotsnow.com/api/v1/portal/summary` 和 `https://api.whynotsnow.com/api/v1/plaza/topics?type=all&limit=20&offset=0`，用于在 selected-artifact 审批前确认当前 snow-index 静态前端依赖的公开 API contract 可读、返回 JSON 且 shape 未明显破坏。该 preflight 不创建、审批、触发或消费 `snow-base/api` deployment run，也不携带 API/D1/R2 credential。

一次性 Cloudflare 配置：

- 创建或确认名为 `snow-index` 的 Cloudflare Pages project。
- 确认 production branch 是 `main`。
- 将 `whynotsnow.com` 绑定为 production custom domain。
- 将 `www.whynotsnow.com` 配置为 host-level redirect，目标是 `https://whynotsnow.com`。
- 在 `snow-base` Admin deployment projects 中注册 `snow-index`，并允许 target `pages`。
- 将 `DEPLOY_APPROVAL_TOKEN` 添加到 GitHub `production` Environment secrets。

异常路径不是常规发布手段。只有维护者在执行前明确批准，并写明为什么不能使用 GitHub Actions 审批路径时，才可以考虑异常部署。即使进入异常处理，也应优先把修复提交推送到远端并重新运行 production workflow。

如果维护者特别授权绕过 GitHub Actions，执行记录必须写清楚特殊原因、source commit、验证结果、残余风险和审批上下文，并且不得记录 secrets、raw logs 或 private resource IDs。

## 域名

生产环境应绑定 apex domain：

```text
whynotsnow.com
```

`www.whynotsnow.com` 只作为 redirecting alias 使用。`www` 到 apex 的重定向应在 Cloudflare Bulk Redirects 或等价 zone rule 中配置，不应放在本仓库 `_redirects` 中，因为 `_redirects` 是部署站点内部的 path routing。

现有服务边界保持为外部链接或 API origins：

- `blog.whynotsnow.com`：Blog 长文内容。
- `api.whynotsnow.com`：公开 `snow-base` API。
- `admin.whynotsnow.com`：受保护 Admin 入口。
- 图片、评论和其他 service hostnames 继续由既有项目拥有。

## 路由

`snow-index` 拥有的静态路由：

| Route | Owner | Behavior |
| --- | --- | --- |
| `/` | `snow-index` | Portal 首页。 |
| `/plaza/` | `snow-index` | Plaza public list shell。 |
| `/plaza/t/:id` | `snow-index` | Topic detail shell，由 Pages Function 服务并保留原始 URL。 |
| `/assets/*` | `snow-index` | 静态 assets，使用 immutable cache。 |
| `/data/*` | `snow-index` | 公开 fixture/fallback JSON，使用 short cache。 |

明确不属于 `snow-index` 的路由：

| Route/Host | Owner |
| --- | --- |
| `/api/*` or `api.whynotsnow.com` | `snow-base` |
| `/admin/*` or `admin.whynotsnow.com` | `snow-base` / protected Admin |
| Blog article routes | Blog project |
| D1/R2/Admin moderation internals | `snow-base` |

## 路由文件

`public/_redirects`:

- 将 `/plaza` 规范化到 `/plaza/`。

`public/_routes.json`:

- 将 Pages Function invocation 限制到 `/plaza/t/*`。

`functions/plaza/t/[[topic]].js`:

- 通过 `env.ASSETS.fetch()` 服务静态 Plaza topic shell，同时保留 requested topic URL，供客户端解析 topic ID。

`public/_headers`:

- 为静态页面添加 security headers。
- 仅允许 frontend fetch same-origin 和 `https://api.whynotsnow.com`。
- 为未来 public submit flow 预先允许 Cloudflare Turnstile script/frame origins。
- 为 `/assets/*` 设置 long immutable cache，为 `/data/*` 设置 short cache。

## Preview

Preview deployments 不得依赖 private tokens 或 protected APIs。当 `api.whynotsnow.com` 不可用、被 CORS 阻止或尚未有数据时，Plaza 和 Portal 页面必须保留 fixture fallback 行为。

## 回滚

可用时，rollback 应优先使用托管平台的 previous deployment rollback。避免把 DNS 改动作为第一步；解绑或重指向 custom domain 可能产生额外生效延迟。如果新的 Plaza path 行为失败，回滚包含 `_redirects` 的 deployment，并保持 `/` 作为最小可用 Portal。

## 生产检查清单

- `pnpm check` 通过。
- GitHub Actions `Production Deploy` 从 `origin/main` 成功运行。
- `/`、`/plaza/` 和 `/plaza/t/<known-topic>` 在 preview 中渲染。
- custom domain `whynotsnow.com` 已绑定到静态托管项目。
- `www.whynotsnow.com` 重定向到 `https://whynotsnow.com`。
- `api.whynotsnow.com` 的 public Plaza endpoints 允许 production origin CORS。
- `snow-index` environment variable 不包含 secrets、service tokens、Turnstile secret、cookies、raw logs 或 private hostnames。
