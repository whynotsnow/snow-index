# Portal 内容配置

`public/site-config.js` 拥有公开且可由维护者编辑的 Portal 内容。

适合放入这里的内容：

- 顶部导航和 hero actions。
- 目录入口和项目链接。
- 稳定的 Portal、Plaza、Blog 和边界说明文案。
- 可被 metadata 复用的公开站点标题和描述。

不要放入这里的内容：

- credentials、tokens、cookies、Access JWTs 或 service keys。
- 私有 admin 工作流、moderation notes、raw logs、D1/R2 object keys 或内部 API 细节。
- Blog 长文内容；Blog 仍由 `blog.whynotsnow.com` 拥有。
- `snow-base` 拥有的后端 API contracts。

首页保留静态 fallback markup；JavaScript 加载后，`public/app.js` 会渲染配置中的内容。`pnpm check` 会验证必填字段、重复 ID 和公开 URL shape。
