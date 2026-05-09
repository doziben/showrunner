import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { envProviderStatus, resolveKey } from '$lib/server/keys';

/**
 * Reports key availability per provider. Used by the onboarding "Test" buttons:
 *   - If the env var is set on the server, the test is instantly green
 *   - Otherwise, we check whether the user's request supplied a key
 *
 * Doesn't actually call upstream APIs — that happens at first real generation.
 */
export const GET: RequestHandler = ({ request }) => {
	const env = envProviderStatus();
	const out = {
		replicate: { ...env.replicate, available: !!resolveKey('replicate', request) },
		elevenlabs: { ...env.elevenlabs, available: !!resolveKey('elevenlabs', request) },
		fal: { ...env.fal, available: !!resolveKey('fal', request) },
		gateway: { ...env.gateway, available: !!resolveKey('gateway', request) },
		anthropic: { ...env.anthropic, available: !!resolveKey('anthropic', request) }
	};
	return json(out);
};
