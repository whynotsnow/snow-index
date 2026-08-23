export async function onRequest({ env, request }) {
	const shellUrl = new URL("/plaza/topic", request.url);
	const shellRequest = new Request(shellUrl, request);
	return env.ASSETS.fetch(shellRequest);
}
