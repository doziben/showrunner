import type { RequestHandler } from './$types';
import { forwardTo } from '$lib/server/proxy';

/**
 * Proxies /api/elevenlabs/* to https://api.elevenlabs.io/v1/*.
 * Client sends `xi-api-key` header.
 */
const handler: RequestHandler = ({ params, request, url }) => {
	const target = `https://api.elevenlabs.io/v1/${params.path}${url.search}`;
	return forwardTo(target, request);
};

export const GET = handler;
export const POST = handler;
