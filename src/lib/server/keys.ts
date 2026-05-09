import { env } from '$env/dynamic/private';

export type Provider = 'replicate' | 'elevenlabs' | 'fal' | 'gateway' | 'anthropic';

const ENV_VAR: Record<Provider, string> = {
	replicate: 'REPLICATE_API_TOKEN',
	elevenlabs: 'ELEVEN_LABS_API_KEY',
	fal: 'FAL_API_KEY',
	gateway: 'AI_GATEWAY_API_KEY',
	anthropic: 'ANTHROPIC_API_KEY'
};

const HEADER: Record<Provider, string> = {
	replicate: 'x-showrunner-replicate',
	elevenlabs: 'x-showrunner-elevenlabs',
	fal: 'x-showrunner-fal',
	gateway: 'x-showrunner-gateway',
	anthropic: 'x-showrunner-anthropic'
};

/**
 * Resolves a provider key with this priority:
 *   1. Env var (e.g. REPLICATE_API_TOKEN) — set by the deployer
 *   2. Request header (e.g. x-showrunner-replicate) — sent by the client from IndexedDB
 *   3. null — caller should return 400/401
 *
 * The hybrid lets self-hosters set keys once in .env.local while still letting
 * BYOK users paste keys at onboarding and have them ride along on each request.
 */
export function resolveKey(provider: Provider, request: Request): string | null {
	const fromEnv = env[ENV_VAR[provider]];
	if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
	const fromHeader = request.headers.get(HEADER[provider]);
	if (fromHeader && fromHeader.trim().length > 0) return fromHeader.trim();
	return null;
}

/**
 * Throws a 400 with a helpful message if the key isn't available.
 */
export function requireKey(provider: Provider, request: Request): string {
	const key = resolveKey(provider, request);
	if (!key) {
		throw new Response(
			JSON.stringify({
				error: `No ${provider} key available. Set ${ENV_VAR[provider]} in .env.local or pass ${HEADER[provider]} header.`
			}),
			{ status: 401, headers: { 'content-type': 'application/json' } }
		);
	}
	return key;
}

/**
 * Reports which providers have keys available. Used by /api/health.
 */
export function envProviderStatus(): Record<Provider, { envSet: boolean }> {
	return {
		replicate: { envSet: !!env[ENV_VAR.replicate]?.trim() },
		elevenlabs: { envSet: !!env[ENV_VAR.elevenlabs]?.trim() },
		fal: { envSet: !!env[ENV_VAR.fal]?.trim() },
		gateway: { envSet: !!env[ENV_VAR.gateway]?.trim() },
		anthropic: { envSet: !!env[ENV_VAR.anthropic]?.trim() }
	};
}
