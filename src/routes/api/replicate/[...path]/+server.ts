import type { RequestHandler } from './$types';
import { forwardTo } from '$lib/server/proxy';

/**
 * Proxies any path under /api/replicate/* to https://api.replicate.com/v1/*.
 * The client sends `Authorization: Bearer <user's r8_... key>`; we pass it through.
 */
const handler: RequestHandler = ({ params, request, url }) => {
	const target = `https://api.replicate.com/v1/${params.path}${url.search}`;
	return forwardTo(target, request);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
