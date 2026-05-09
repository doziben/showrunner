import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { resolveKey } from '$lib/server/keys';
import { generateStoryboardServer } from '$lib/server/storyboard';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { script?: string; useGateway?: boolean };
	if (!body.script) return json({ error: 'Missing script' }, { status: 400 });

	const useGateway = body.useGateway !== false; // default to gateway
	const provider = useGateway ? 'gateway' : 'anthropic';
	const apiKey = resolveKey(provider, request);
	if (!apiKey) {
		return json({ error: `No ${provider} key. Set the env var or provide one in onboarding.` }, { status: 401 });
	}

	try {
		const result = await generateStoryboardServer({
			script: body.script,
			useGateway,
			apiKey
		});
		return json(result);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
