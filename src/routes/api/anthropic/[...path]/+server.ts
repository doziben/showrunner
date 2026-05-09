import type { RequestHandler } from './$types';
import { forwardTo } from '$lib/server/proxy';

/**
 * Proxies /api/anthropic/* to https://api.anthropic.com/*.
 * Client sends `x-api-key` directly. No more `anthropic-dangerous-direct-browser-access`
 * hack needed since we're now a proper server-side caller.
 */
const handler: RequestHandler = ({ params, request, url }) => {
	const target = `https://api.anthropic.com/${params.path}${url.search}`;
	return forwardTo(target, request, {
		extraHeaders: { 'anthropic-version': '2023-06-01' }
	});
};

export const GET = handler;
export const POST = handler;
