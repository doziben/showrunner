import type { RequestHandler } from './$types';
import { forwardTo } from '$lib/server/proxy';

/**
 * Implements the fal.ai client proxy protocol — reads `x-fal-target-url`
 * from the incoming request, validates the host, and forwards.
 *
 * Auth: the client (configured with `fal.config({ credentials, proxyUrl })`)
 * sends `Authorization: Key <credentials>` along with the request, which we
 * pass through unchanged. Unlike fal's official server proxy (which expects
 * FAL_KEY in env), Showrunner uses the user's own key from IndexedDB.
 */

const ALLOWED_HOSTS = new Set([
	'fal.run',
	'queue.fal.run',
	'rest.alpha.fal.ai',
	'rest.fal.ai',
	'fal.media'
]);

const handler: RequestHandler = async ({ request }) => {
	const target = request.headers.get('x-fal-target-url');
	if (!target) return new Response('Missing x-fal-target-url header', { status: 400 });

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return new Response('Invalid x-fal-target-url', { status: 400 });
	}
	if (!ALLOWED_HOSTS.has(parsed.hostname)) {
		return new Response(`Host ${parsed.hostname} not allowed`, { status: 403 });
	}

	return forwardTo(target, request);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
