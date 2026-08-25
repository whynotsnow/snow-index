import { initDetail, initList } from "./plaza/modules/page.js";
import { createStateCard } from "./plaza/modules/render.js";

const page = document.body.dataset.plazaPage;

if (page === "list") {
	initList().catch(() => {
		const feed = document.querySelector("[data-plaza-feed]");
		feed?.replaceChildren(createStateCard("Plaza 暂不可用", "公开 API 和本地降级数据都无法读取。"));
	});
}

if (page === "topic") {
	initDetail();
}
