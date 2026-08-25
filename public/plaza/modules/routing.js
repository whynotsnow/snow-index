import { typeLabels, validTypes } from "./constants.js";

export function getSelectedType() {
	const type = new URLSearchParams(window.location.search).get("type") ?? "all";
	return validTypes.has(type) ? type : "all";
}

export function topicIdFromPath() {
	const match = window.location.pathname.match(/\/plaza\/t\/([^/?#]+)/);
	return match ? decodeURIComponent(match[1]) : new URLSearchParams(window.location.search).get("id");
}

export function wireFilters(selectedType) {
	for (const button of document.querySelectorAll("[data-plaza-type]")) {
		const type = button.getAttribute("data-plaza-type") ?? "all";
		button.setAttribute("aria-pressed", String(type === selectedType));
		button.addEventListener("click", () => {
			const next = new URL(window.location.href);
			if (type === "all") {
				next.searchParams.delete("type");
			} else {
				next.searchParams.set("type", type);
			}
			window.location.href = next.toString();
		});
	}
}

export function selectedTypeLabel(type) {
	return typeLabels[type] ?? typeLabels.all;
}
