/**
 * Generic upstream forwarder for SvelteKit API routes.
 *
 * Showrunner is local-first — keys live in the user's IndexedDB. But provider
 * APIs CORS-block direct browser calls, so we route every provider request
 * through a thin SvelteKit `+server.ts` proxy. The proxy:
 *  - reads whatever auth headers the client sent (so the user's key flows through)
 *  - rewrites the URL to the upstream provider
 *  - streams the response back
 *
 * The server never persists keys or request bodies. It's a pure pass-through
 * with CORS-allowed status. If the deploy moves to a hosted SaaS later, this
 * is also where central auth + rate limiting would slot in.
 */

const HOP_BY_HOP_REQUEST = new Set([
	'host',
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'content-length'
]);

const HOP_BY_HOP_RESPONSE = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade'
]);

export interface ForwardOptions {
	/** Extra headers to inject (e.g. anthropic-version). */
	extraHeaders?: Record<string, string>;
	/** Optional auth-injection: sets the header if the client didn't send one. */
	authHeader?: { name: string; value: string };
}

export async function forwardTo(
	targetUrl: string,
	request: Request,
	opts: ForwardOptions = {}
): Promise<Response> {
	const headers = new Headers();
	request.headers.forEach((value, name) => {
		if (!HOP_BY_HOP_REQUEST.has(name.toLowerCase())) headers.set(name, value);
	});
	if (opts.extraHeaders) {
		for (const [k, v] of Object.entries(opts.extraHeaders)) headers.set(k, v);
	}
	if (opts.authHeader && !headers.has(opts.authHeader.name)) {
		headers.set(opts.authHeader.name, opts.authHeader.value);
	}

	let body: BodyInit | undefined;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		body = await request.arrayBuffer();
	}

	const upstream = await fetch(targetUrl, {
		method: request.method,
		headers,
		body
	});

	const outHeaders = new Headers();
	upstream.headers.forEach((value, name) => {
		if (!HOP_BY_HOP_RESPONSE.has(name.toLowerCase())) outHeaders.set(name, value);
	});

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: outHeaders
	});
}
