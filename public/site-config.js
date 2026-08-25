export const siteConfig = {
	site: {
		name: "WhynotSnow",
		brandMark: "✳",
		homeUrl: "/",
		language: "zh-CN",
		description: "WhynotSnow 的主域名 Portal，连接 Blog、Plaza、Projects、RSS 和受保护 Admin。",
	},
	seo: {
		baseUrl: "https://whynotsnow.com",
		titleTemplate: "%s · WhynotSnow",
		defaultTitle: "WhynotSnow",
		defaultDescription: "WhynotSnow 的主域名 Portal，连接 Blog、Plaza、Projects、RSS 和受保护 Admin。",
		image: "/assets/portal-map.png",
		twitterCard: "summary_large_image",
		pages: {
			home: {
				title: "WhynotSnow",
				description: "WhynotSnow 的主域名 Portal，连接 Blog、Plaza、Projects、RSS 和受保护 Admin。",
				path: "/",
				type: "website",
			},
			plaza: {
				title: "Plaza · WhynotSnow",
				description: "WhynotSnow Plaza 的公开动态、讨论、问答、反馈和留言入口。",
				path: "/plaza/",
				type: "website",
			},
			plazaTopic: {
				title: "Plaza Topic · WhynotSnow",
				description: "WhynotSnow Plaza 公开主题详情。",
				path: "/plaza/",
				type: "article",
			},
		},
	},
	navigation: [
		{ id: "blog", label: "Blog", href: "https://blog.whynotsnow.com/" },
		{ id: "plaza", label: "Plaza", href: "/plaza/" },
		{ id: "projects", label: "Projects", href: "#projects" },
		{ id: "rss", label: "RSS", href: "/rss.xml" },
		{ id: "admin", label: "Admin", href: "https://admin.whynotsnow.com/", rel: "nofollow" },
	],
	hero: {
		eyebrow: "Public portal",
		title: "WhynotSnow",
		copy: "主域名入口，连接长文、广场、项目和公开动态。Blog 回到长内容，Plaza 承接短动态、留言和讨论。",
		actions: [
			{ id: "plaza", label: "进入 Plaza", href: "/plaza/", variant: "primary" },
			{ id: "blog", label: "阅读 Blog", href: "https://blog.whynotsnow.com/", variant: "secondary" },
		],
	},
	plaza: {
		turnstileSiteKey: "0x4AAAAAAEX1SgsPU7WE52tE",
	},
	status: {
		label: "Portal MVP",
		copy: "Blog 与 Plaza 摘要已接入公开契约；站点状态聚合后续接入。",
	},
	entries: [
		{
			id: "blog",
			icon: "B",
			title: "Blog",
			href: "https://blog.whynotsnow.com/",
			description: "长文章、笔记和公开写作。",
		},
		{
			id: "plaza",
			icon: "P",
			title: "Plaza",
			href: "/plaza/",
			description: "公告、短动态、留言和讨论入口。",
		},
		{
			id: "projects",
			icon: "#",
			title: "Projects",
			href: "#projects",
			description: "公开项目和服务索引。",
		},
		{
			id: "rss",
			icon: "R",
			title: "RSS",
			href: "/rss.xml",
			description: "聚合订阅入口，后续接入稳定 feed。",
		},
		{
			id: "admin",
			icon: "A",
			title: "Admin",
			href: "https://admin.whynotsnow.com/",
			description: "受保护入口，不展示内部工具。",
			protected: true,
			rel: "nofollow",
		},
	],
	sections: {
		activity: {
			eyebrow: "Activity",
			title: "近期动态",
			loading: "正在读取 Plaza 公开摘要...",
			emptyTitle: "暂无公开动态",
			emptyCopy: "公开聚合接口暂未返回可见内容，Portal 保持可用。",
			unavailable: "Plaza 摘要暂不可用，已保留静态入口。",
		},
		blog: {
			eyebrow: "Writing",
			title: "最近文章",
			loading: "正在读取 Blog 公开摘要...",
			unavailable: "Blog 摘要暂不可用，保留 Blog 入口。",
		},
		projects: {
			eyebrow: "Projects",
			title: "项目与服务",
			items: [
				{ id: "blog", title: "Blog", href: "https://blog.whynotsnow.com/", description: "公开长文系统" },
				{ id: "plaza", title: "Plaza", href: "/plaza/", description: "公共动态和讨论前端" },
				{ id: "admin", title: "Admin", href: "https://admin.whynotsnow.com/", description: "Cloudflare Access 保护", rel: "nofollow" },
			],
		},
		boundary: {
			eyebrow: "Boundary",
			title: "公开边界",
			copy: "这个仓库只承载主域名 Portal 和 Plaza 前端表面。后端 API、审核、D1/R2、Turnstile 服务端验证和私有管理流程保留在 `snow-base`。",
		},
	},
};
