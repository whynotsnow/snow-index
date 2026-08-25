# 代码组织和文件拆分规范

本文档定义 `snow-index` 的代码组织、文件大小和模块化拆分规则。目标是让静态 Portal/Plaza 前端继续保持轻量，同时避免 `public/*.js` 和 `public/styles.css` 变成不可维护的大文件。

## 核心原则

1. 优先按页面和公共前端功能域拆分，其次才按技术类型拆分。
2. 拆分目标是降低认知负担，不是引入框架或构建复杂度。
3. 拆分应保持公开路由、DOM hooks、API 契约、SEO 元数据和样式表现稳定。
4. 不要把 `snow-base` 的 API、D1/R2、moderation、Turnstile server-side verification 或 secrets 复制到本项目。
5. 只有两个以上页面真正复用的代码，才提升到 shared 文件。

## 文件大小标准

| 行数 | 处理建议 |
| --- | --- |
| 0-300 行 | 正常范围。 |
| 300-600 行 | 检查是否存在职责混杂、重复逻辑、大段 DOM 模板或样式区块。 |
| 600-1000 行 | 应制定拆分计划，并优先拆出稳定的纯函数、渲染函数、API client、样式分层或页面域文件。 |
| 1000 行以上 | 除生成文件外，原则上必须拆分。 |

以下文件不纳入人工拆分目标：

- 依赖和构建产物，例如 `node_modules/`、`dist/`。
- 必须整体审阅的配置、fixtures、headers、redirects 或 sitemap，可按实际维护成本放宽。

## 推荐组织

当前项目没有构建步骤，拆分必须优先使用浏览器原生能力和现有静态托管边界。新增文件应继续位于 `public/` 或 `scripts/` 的明确职责路径下。

推荐静态前端结构：

```text
public/
  app.js
  plaza.js
  site-config.js
  styles.css
  scripts/
    portal-api.js
    portal-render.js
    plaza-api.js
    plaza-render.js
    plaza-topic.js
  styles/
    tokens.css
    base.css
    layout.css
    portal.css
    plaza.css
    components.css
```

这只是目标方向，不要求一次性迁移。当前静态入口可以继续保留 `app.js`、`plaza.js` 和 `styles.css`，再按需求逐步抽出稳定模块。

## JavaScript 规则

- `app.js` 只承载 Portal 首页启动、数据获取编排和 DOM 挂载，不长期承载所有 rendering 和 formatting。
- `plaza.js` 应按 Plaza feed、topic detail、submission form、attachment handling、API/fallback、render helpers 拆分。
- API fetch、fixture fallback、error normalization 和 DOM rendering 应分清职责。
- Topic ID parsing、canonical URL 更新、form serialization 和 attachment validation 应靠近 Plaza domain，不提升到泛用 `utils.js`。
- 新增 DOM hook 必须保持稳定命名，并同步 `pnpm check` 中的必要检查。

## CSS 规则

- `styles.css` 超过 600 行后应制定拆分计划。
- 优先拆分为 tokens、base、layout、components、Portal page、Plaza page。
- 不在同一次变更中混入大规模视觉重设计和文件拆分。
- 保持 CSS custom properties、responsive constraints、CSP 允许的资源和 existing class names 稳定，除非需求明确要求改动。

## 新增文件准入

新增文件至少应满足一个条件：

- 表达明确页面、功能域或样式层。
- 隔离 API/fallback、rendering、form、topic、attachment 或 SEO update 流程。
- 消除真实重复逻辑。
- 降低超过阈值文件的维护成本。

不建议新增无领域限定的文件名：

```text
common.js
data.js
helpers.js
misc.js
utils.js
```

可以使用带领域语义的名称：

```text
portal-api.js
portal-render.js
plaza-topic.js
plaza-form.js
plaza-attachments.js
styles/plaza.css
```

## 拆分流程

1. 先识别文件内职责分区和 DOM/API 依赖。
2. 先移动纯函数、常量、formatters 和 render helpers。
3. 再移动页面启动、form、topic 或 attachment 流程。
4. 保持公开路径、HTML script loading、DOM hooks、API response handling 和 fallback 行为稳定。
5. 不在同一次变更中混入功能改动、样式重做或部署流程变化。
6. 运行与变更范围匹配的检查。
7. 最后再做命名整理和死代码清理。

推荐提交粒度：

```text
docs(frontend): define static code organization rules
refactor(portal): split portal rendering helpers
refactor(plaza): split feed and topic rendering
refactor(styles): split portal and plaza styles
```

## 当前优先级

当前优先处理以下人工维护的大文件：

1. `public/styles.css`：按 tokens/base/layout/components/portal/plaza 拆分。
2. `public/plaza.js`：按 feed、topic、form、attachment、API/fallback、render helpers 拆分。
3. `public/app.js`：拆出 Portal API/fallback、summary rendering、Blog rendering 和 link/status helpers。

## 验证要求

拆分后按影响范围选择最小有效验证：

- 文档规范变更：运行 Agent Docs validation。
- 前端静态文件变更：运行 `pnpm check`。
- 页面交互、布局或动态数据行为变更：运行本地 preview 和浏览器 smoke。
- Pages routing、headers、redirects 或 function 变更：检查 HTTP status、headers 和 `url_effective`。

不要声明检查通过，除非命令已经在本仓库实际运行并成功返回。
