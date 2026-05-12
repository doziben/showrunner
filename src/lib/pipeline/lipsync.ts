import type { Avatar, Config, LipsyncProvider, Scene } from '$lib/types';

/**
 * Lipsync — runs server-side via /api/lipsync. The endpoint dispatches based
 * on `provider`:
 *   - p-video / omni-human-1.5 → Replicate (uses x-showrunner-replicate)
 *   - fabric / aurora → fal.ai (uses x-showrunner-fal)
 */

export type GenerateLipsyncOptions = {
	provider: LipsyncProvider;
	avatar: Avatar;
	scene: Scene;
	imageDataUrl: string;
	audioDataUrl: string;
	config: Config;
};

export async function generateLipsync({
	provider,
	avatar: _avatar,
	scene,
	imageDataUrl,
	audioDataUrl,
	config
}: GenerateLipsyncOptions): Promise<string> {
	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (config.replicateKey) headers['x-showrunner-replicate'] = config.replicateKey;
	if (config.falKey) headers['x-showrunner-fal'] = config.falKey;

	const res = await fetch('/api/lipsync', {
		method: 'POST',
		headers,
		body: JSON.stringify({
			provider,
			imageDataUrl,
			audioDataUrl,
			prompt: scene.actionDescription ?? 'speaking to camera, natural expression',
			durationSeconds: scene.durationSeconds
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Lipsync ${res.status}: ${text.slice(0, 240)}`);
	}
	const { video } = (await res.json()) as { video: string };
	return video;
}
