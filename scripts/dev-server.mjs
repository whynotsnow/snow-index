import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public");
const requestedPort = Number.parseInt(process.env.PORT ?? "4173", 10);

const types = new Map([
	[".css", "text/css; charset=utf-8"],
	[".html", "text/html; charset=utf-8"],
	[".js", "text/javascript; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".png", "image/png"],
	[".svg", "image/svg+xml"],
	[".xml", "application/xml; charset=utf-8"],
]);

function resolveFile(url) {
	const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
	const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
	let target = path.join(root, normalized);
	if (!target.startsWith(root)) {
		return null;
	}
	if (pathname.startsWith("/plaza/t/")) {
		return path.join(root, "plaza", "topic.html");
	}
	if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
		target = path.join(target, "index.html");
	}
	return target;
}

const server = http.createServer((req, res) => {
	const target = resolveFile(req.url ?? "/");
	if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
		res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
		res.end("Not found");
		return;
	}

	const ext = path.extname(target);
	res.writeHead(200, { "content-type": types.get(ext) ?? "application/octet-stream" });
	fs.createReadStream(target).pipe(res);
});

server.listen(requestedPort, "127.0.0.1", () => {
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : requestedPort;
	console.log(`snow-index preview: http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
	if (error.code === "EADDRINUSE") {
		server.listen(0, "127.0.0.1");
		return;
	}
	throw error;
});
