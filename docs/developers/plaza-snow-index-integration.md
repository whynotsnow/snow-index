# Plaza 与 snow-index 接入说明

本文档面向后续 `snow-index` 开发，定义公开 Plaza 页面如何消费 `snow-base` API，以及公开提交如何接入 Cloudflare Turnstile。

## 边界

`snow-base` 拥有 Plaza 后端能力：

- D1 表、公开 API、审核状态、Turnstile 服务端校验、限流和审计。
- Admin 审核页面和 `/admin/plaza/*` 管理 API。
- `TURNSTILE_SECRET` 只存放在 `snow-base-api` Worker secret store。

`snow-index` 只拥有公开前端体验：

- 渲染 `/plaza` 和 `/plaza/t/:id`。
- 调用 `https://api.whynotsnow.com/api/v1/plaza/*`。
- 首页/Portal 首屏调用 `https://api.whynotsnow.com/api/v1/portal/summary`。
- 在公开提交表单中嵌入 Turnstile widget，并把一次性 token 传给 `snow-base`。
- 附件上传必须走 Plaza 专用附件接口，不调用 Twikoo/Lsky-compatible `/api/v1/upload`。
- 不保存 Turnstile secret，不直接访问 D1/R2，不调用 `/admin/*`，不持有 service token。

## Plaza 公开 API

API base URL：

```text
https://api.whynotsnow.com
```

### 主题列表

```http
GET /api/v1/plaza/topics?type=all&limit=20&offset=0
```

Query：

- `type`：`all`、`notice`、`status`、`discussion`、`question`、`feedback`、`guestbook`。
- `limit`：1-50，默认 20。
- `offset`：非负整数，默认 0。

只返回 `visible` 主题，不返回 `pending`、`hidden` 或 `deleted`。

主题列表每条记录会返回 `attachmentCount`。列表不返回附件 URL，详情页再读取附件。

### 主题详情

```http
GET /api/v1/plaza/topics/:topicId
```

只返回 `visible` 主题。待审核、隐藏、删除或不存在的主题统一按公开 not found 处理。

主题详情中的 `attachments` 只包含可见附件。主题未审核、隐藏或删除时，附件不会通过公开 API 返回。

### 回复列表

```http
GET /api/v1/plaza/topics/:topicId/replies?limit=50&offset=0
```

只返回 `visible` 回复。主题不可见时返回公开 not found。

回复列表中的每条回复会包含 `attachments`。只返回可见回复的可见附件。

## Portal 聚合 API

首页或 Portal 首屏使用专门的聚合接口：

```http
GET /api/v1/portal/summary
```

第一版只返回 Plaza 摘要，不包含 Twikoo 评论、Blog 最近文章、站点状态或附件。

响应结构：

```json
{
  "ok": true,
  "data": {
    "generatedAt": "2026-08-22T00:00:00.000Z",
    "cacheTtlSeconds": 60,
    "plaza": {
      "pinnedNotices": [],
      "recentTopics": []
    }
  }
}
```

`pinnedNotices` 是置顶且可见的 `notice` 主题，最多 3 条。`recentTopics` 是最新可见 Plaza 主题，最多 8 条。每条记录包含：

- `id`
- `type`
- `title`
- `excerpt`
- `url`：形如 `/plaza/t/:id`
- `replyCount`
- `reactionCount`
- `pinned`
- `locked`
- `lastActivityAt`
- `createdAt`

聚合接口只返回 `visible` 内容。待审核、隐藏和删除内容不会出现在 Portal 摘要中。接口响应带短缓存头，前端可以按 `cacheTtlSeconds` 做轻缓存；如果请求失败，Portal 应展示空 Plaza 区块或上一次成功缓存，不应退回读取 Admin API。

### 上传附件

Plaza 附件使用专用公开接口：

```http
POST /api/v1/plaza/attachments
Content-Type: multipart/form-data
```

Form fields：

- `file`：图片文件，也兼容 `image` 或 `upload` 字段名。
- `turnstileToken`：Turnstile 一次性 token，action 必须是 `plaza_attachment`。

限制：

- 只支持 `image/jpeg`、`image/png`、`image/webp`、`image/avif`。
- 单文件最大 2 MB。
- 不支持 gif、视频、大文件或任意附件。

成功响应为 `201`。响应只返回 `id` 和文件元数据，不返回可展示的 public URL。前端应把返回的 `id` 放入后续主题或回复创建请求的 `attachmentIds`。

### 创建主题

```http
POST /api/v1/plaza/topics
Content-Type: application/json

{
  "type": "discussion",
  "title": "标题",
  "body": "正文",
  "authorName": "可选昵称",
  "attachmentIds": ["plaza_att_xxx"],
  "turnstileToken": "<token>"
}
```

成功响应为 `202`，内容状态固定为 `pending`。前端应展示“已提交，等待审核”，不要把提交内容立即插入公开列表。

主题最多绑定 3 个附件。附件必须由同一访问来源刚上传、尚未绑定、状态为 `pending`。

### 创建回复

```http
POST /api/v1/plaza/topics/:topicId/replies
Content-Type: application/json

{
  "body": "回复正文",
  "authorName": "可选昵称",
  "parentId": "可选父回复 ID",
  "attachmentIds": ["plaza_att_xxx"],
  "turnstileToken": "<token>"
}
```

成功响应为 `202`，内容状态固定为 `pending`。如果主题已锁定，返回 `topic_locked`。

回复最多绑定 1 个附件。附件必须由同一访问来源刚上传、尚未绑定、状态为 `pending`。

## Turnstile 配置

需要一个 Cloudflare Turnstile widget。建议名称：

```text
snow-index-plaza
```

Widget domain 至少包含：

```text
whynotsnow.com
www.whynotsnow.com
localhost
127.0.0.1
```

生产 `snow-base-api` 的 `PLAZA_TURNSTILE_HOSTNAMES` 只允许：

```text
whynotsnow.com,www.whynotsnow.com
```

不要把 `localhost` 或 `127.0.0.1` 加入生产 Worker 的 hostname allowlist。它们只用于 widget 本身和本地开发。

Widget secret 写入生产 Worker：

```bash
pnpm --filter @snow-base/api exec wrangler secret put TURNSTILE_SECRET --env production
```

不要把 secret 写入 Git、文档、issue、sidecar、截图、聊天记录或前端环境变量。`snow-index` 只需要 sitekey。

## snow-index 前端提交流程

1. 在 Plaza 发主题表单中渲染 Turnstile widget，action 使用：

   ```text
   plaza_topic
   ```

2. 在 Plaza 发回复表单中渲染 Turnstile widget，action 使用：

   ```text
   plaza_reply
   ```

3. 在附件上传控件中渲染或执行 Turnstile，action 使用：

   ```text
   plaza_attachment
   ```

4. 用户提交时读取 Turnstile 一次性 token。
5. 把 token 放入 `turnstileToken` 字段提交给 `snow-base`。
6. 附件需要先上传，再把返回的 `id` 放入创建主题或回复的 `attachmentIds`。
7. 提交成功后 reset widget，避免重复提交同一个 token。
8. 提交失败、网络失败或服务端返回 Turnstile 错误时，也 reset widget，让用户重新验证。

示例请求：

```ts
async function createPlazaTopic(input: {
  type: string;
  title: string;
  body: string;
  authorName?: string;
  turnstileToken: string;
}) {
  const response = await fetch("https://api.whynotsnow.com/api/v1/plaza/topics", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  return response.json();
}
```

## 错误码展示建议

| code                       | 前端建议文案                 |
| -------------------------- | ---------------------------- |
| `missing_turnstile`        | 请先完成人机验证。           |
| `invalid_turnstile`        | 验证失败，请重试。           |
| `turnstile_unavailable`    | 验证服务暂时不可用，请稍后。 |
| `turnstile_not_configured` | Plaza 提交暂未开放。         |
| `rate_limited`             | 提交过于频繁，请稍后再试。   |
| `invalid_type`             | 请选择有效类型。             |
| `invalid_title`            | 标题长度不符合要求。         |
| `invalid_body`             | 正文长度不符合要求。         |
| `invalid_author_name`      | 昵称长度不符合要求。         |
| `too_many_links`           | 链接数量过多。               |
| `invalid_attachments`      | 附件数量或附件 ID 无效。     |
| `missing_file`             | 请选择图片。                 |
| `file_too_large`           | 图片不能超过 2 MB。          |
| `unsupported_mime`         | 图片格式不支持。             |
| `topic_not_found`          | 主题不存在或不可见。         |
| `topic_locked`             | 该主题已锁定，不能回复。     |
| `parent_reply_not_found`   | 父回复不存在或不可见。       |

## 发布前检查

`snow-index` 接入 Plaza 提交前确认：

- Turnstile widget 已创建，sitekey 只放在公开前端配置中。
- `TURNSTILE_SECRET` 已写入 `snow-base-api` production Worker secret store。
- 生产 `PLAZA_TURNSTILE_HOSTNAMES` 只包含公开生产 hostname。
- Portal 首页优先使用 `/api/v1/portal/summary`，Plaza 列表页再使用 `/api/v1/plaza/topics`。
- 主题、回复、附件分别使用 `plaza_topic`、`plaza_reply`、`plaza_attachment` action。
- 前端提交成功后显示待审核状态，不直接展示为公开内容。
- 附件上传成功后只保存 `attachmentId`，不要直接展示上传接口返回结果为公开内容。
- `Production Smoke full` 通过。
- Plaza Admin 页面可打开，owner/admin 能处理 pending 内容。

## 当前限制

- 第一版只支持小图片附件，不支持 gif、视频、大文件或通用文件。
- 不支持反应、账号系统、实时 timeline 或全文搜索。
- 匿名提交全部进入审核队列。
- 公开 API 不暴露审核备注、内部 actor、请求来源 hash 或 D1 row 内部字段。
