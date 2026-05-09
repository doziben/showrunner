import type { Config, Scene } from '$lib/types';

/**
 * Storyboard agent — runs server-side via /api/storyboard. The server uses
 * the AI SDK with either Vercel AI Gateway or Anthropic direct, picking
 * claude-opus-4-7. Token usage flows back so the caller can record cost.
 */

export type StoryboardResult = {
	scenes: Scene[];
	usage: { inputTokens: number; outputTokens: number };
	model: string;
	provider: 'gateway' | 'anthropic';
};

export async function generateStoryboard(
	config: Config,
	script: string
): Promise<StoryboardResult> {
	if (!script.trim()) throw new Error('Script is empty');

	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (config.useAiGateway && config.aiGatewayKey) {
		headers['x-showrunner-gateway'] = config.aiGatewayKey;
	} else if (!config.useAiGateway && config.anthropicKey) {
		headers['x-showrunner-anthropic'] = config.anthropicKey;
	}

	const res = await fetch('/api/storyboard', {
		method: 'POST',
		headers,
		body: JSON.stringify({ script, useGateway: config.useAiGateway })
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Storyboard ${res.status}: ${text.slice(0, 240)}`);
	}
	return (await res.json()) as StoryboardResult;
}
