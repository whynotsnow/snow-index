# 开发者文档

本文档索引面向人类开发者和运维维护者。除稳定技术标识、命令、路径、环境变量、API 名称和产品名外，`docs/developers/` 下的文档应使用中文编写。

## Plaza

- [Plaza 与 snow-index 接入说明](plaza-snow-index-integration.md)：公开 Plaza 前端 API、Portal summary API、Turnstile、附件上传、提交流程和发布检查。

## Portal

- [Portal 视觉和内容边界](portal-visual-content-boundary.md)：视觉方向、内容归属、Blog/Plaza/Admin 边界、文案规则和扩展顺序。
- [Portal 内容配置](portal-content-configuration.md)：公开静态内容配置、可编辑字段、验证和私有数据边界。
- [代码组织](code-organization.md)：静态前端组织、文件大小阈值、拆分流程和验证要求。

## 运维

- [Codex 提示音](codex-sound-cues.md)：预览、配置和检查本项目本地提示音行为。
- [排障指南](troubleshooting.md)：静态站、Plaza、路由和部署诊断路径。
- [恢复指南](recovery.md)：公开站点恢复和回滚策略。

## 部署

- [部署和路由边界](deployment-routing.md)：Cloudflare Pages 生产部署、域名路由、headers、redirects、preview 和回滚。
- [部署审批 Token 命名后续项](deployment-approval-token-naming.md)：当前通用 secret 命名和 `snow-base` 后续改动。
