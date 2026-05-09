import type { RequestHandler } from './$types';
import { forwardTo } from '$lib/server/proxy';

/**
 * Proxies /api/gateway/* to https://ai-gateway.vercel.sh/*.
 * Used by the AI SDK when configured with baseURL pointing here.
 */
const handler: RequestHandler = ({ params, request, url }) => {
	const target = `https://ai-gateway.vercel.sh/${params.path}${url.search}`;
	return forwardTo(target, request);
};

export const GET = handler;
export const POST = handler;
