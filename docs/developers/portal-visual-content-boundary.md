# Portal 视觉和内容边界

本文档记录 `whynotsnow.com` Portal 的长期视觉和内容方向。

## 决策

`snow-index` 应使用独立的 Portal 视觉语言：在气质和公开身份上与 Blog 有关联，但不要复制 Blog 的文章阅读体验。

当前方向：

- Sky/cyan/navy/light cloud 色彩系统。
- 信息密度较高但平静的导航界面。
- 首屏聚焦身份、主要路径和当前状态。
- Plaza preview 作为公开活动摘要，而不是替代 Plaza list/detail 页面。
- 使用抽象 Portal map 图像作为公开入口视觉资产。

## 建议

让本项目更接近个人数字空间 dashboard，而不是营销 landing page。

具体意味着：

- 优先使用紧凑 labels、status、activity 和 route cards，而不是长段解释。
- 保持 `WhynotSnow` 作为首屏可见的身份信号。
- 核心路径不滚动也应可见：Blog、Plaza、Projects、RSS、Admin。
- 使用短的操作性文案解释公开状态和 fallback 行为。
- 视觉精致感应来自 spacing、hierarchy、color 和一个强视觉资产，而不是装饰性 sections。

## 内容归属

| 内容 | 归属 | Portal 行为 |
| --- | --- | --- |
| 站点身份 | `snow-index` | 短首屏说明和导航上下文。 |
| 长文章 | Blog | 链接到 Blog；不复制文章内容。 |
| 短公开活动 | Plaza / `snow-base` public API | 只预览公开 DTO。 |
| 项目/服务目录 | `snow-index` | 展示公开 route cards 和稳定外部入口。 |
| Admin 工作流 | `snow-base` / protected Admin | 只展示受保护入口，不展示内部工具清单。 |
| Comments/Twikoo | `snow-base` 或 Blog integration | 未来仅在 sanitized 后展示公开摘要。 |
| Status/now text | 初期由 `snow-index` 拥有，后续可由 Plaza/status 提供 | 保持简短，并可被后续公开 DTO 替换。 |

## Blog 边界

Blog 仍是长文阅读系统。

不要把这些内容移入 Portal：

- 完整文章或文章集合。
- 长篇个人简介。
- Blog theme-specific 阅读组件。
- 作为 Blog-wide community surface 的 comments。

Portal 可以链接到 Blog；如果后续有稳定 feed 或 DTO，也可以展示短的公开 recent-post summary。

## Plaza 边界

Plaza 是公开社区/活动层。

Portal 可以展示：

- pinned notices。
- recent public topics。
- public counts 和 timestamps。
- 指向 `/plaza/` 和 `/plaza/t/:id` 的入口。

Portal 不得展示：

- pending、hidden、deleted 或 moderation-only content。
- Admin review notes。
- D1/R2 internals。
- Turnstile secret、service tokens、raw logs 或 protected Access state。

## 视觉规则

- Cards 的 border radius 保持 8px 或更低。
- 在 light cloud surfaces 上使用 navy text 保证对比。
- cyan 用于公开导航、active state 和 system status。
- coral/pink 只用于 locked、pending 或 protected states 等次级强调。
- 避免长 hero copy、marketing claims、大 feature sections 和一次性装饰 sections。
- 不要直接把 Blog reference image 当作 Portal asset；只复用它的色彩语言。
- 保留 `public/assets/portal-map.png` 或未来等价视觉资产作为有主题的图像，不使用泛用 gradient 代替。

## 文案规则

使用短且具体的界面文案。

推荐：

- "Plaza 摘要已接入公开契约；Blog 和站点状态聚合后续接入。"
- "受保护入口，不展示内部工具。"
- "提交成功后进入审核队列。"

避免：

- 在首页放长篇个人叙述。
- 产品营销式承诺。
- 面向访客的文案中出现内部实现细节。
- 任何 secret、private URL、raw log、cookie、token 或 Access identifier。

## 扩展顺序

未来新增模块建议按以下顺序落地：

1. 基于现有 Blog RSS feed 的 public Blog summary，并保留 fixture fallback。
2. 来自 static config 或 public endpoint 的 public site status / now text。
3. 只有在 `snow-base` 提供 sanitized adapter 后，才考虑可选的 public comments/Twikoo summary。
4. 内容模块稳定后再刷新视觉资产。

如果新模块不符合这些归属规则，先新增或更新 sidecar item，再进入实现。
