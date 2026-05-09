import type { LipsyncProvider, Scene } from '$lib/types';
import { getLipsyncModel, DEFAULT_LIPSYNC_PROVIDER } from '$lib/pipeline/lipsync-models';

/**
 * Per-provider unit pricing (USD). Conservative estimates.
 * Voiceover + image are constant; lipsync depends on the chosen model.
 *
 * Image price reflects gpt-image-2 at quality=high, 2:3 portrait (~$0.19/image
 * based on the OpenAI rate Replicate passes through). Update when published
 * Replicate pricing diverges.
 */
export const PRICING = {
	voiceoverPerMinute: 0.3, // ElevenLabs ~$0.30 / min spoken
	imagePerShot: 0.19 // Replicate openai/gpt-image-2 @ quality=high, 2:3
};

export type CostBreakdown = {
	voiceover: number;
	image: number;
	lipsync: number;
	total: number;
	totalSeconds: number;
	avatarSceneSeconds: number;
	avatarSceneCount: number;
	brollSceneCount: number;
	lipsyncRatePerSecond: number;
};

export function estimateCost(
	scenes: Scene[],
	lipsyncProvider: LipsyncProvider = DEFAULT_LIPSYNC_PROVIDER
): CostBreakdown {
	const totalSeconds = scenes.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
	const avatarScenes = scenes.filter((s) => s.type === 'avatar');
	const avatarSceneSeconds = avatarScenes.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
	const brollScenes = scenes.filter((s) => s.type === 'broll');

	const lipsyncRatePerSecond = getLipsyncModel(lipsyncProvider).pricePerSecond;

	const voiceover = (totalSeconds / 60) * PRICING.voiceoverPerMinute;
	const image = avatarScenes.length * PRICING.imagePerShot;
	const lipsync = avatarSceneSeconds * lipsyncRatePerSecond;
	const total = voiceover + image + lipsync;

	return {
		voiceover,
		image,
		lipsync,
		total,
		totalSeconds,
		avatarSceneSeconds,
		avatarSceneCount: avatarScenes.length,
		brollSceneCount: brollScenes.length,
		lipsyncRatePerSecond
	};
}

export function fmtUsd(value: number): string {
	if (value < 0.01) return '< $0.01';
	if (value < 10) return `$${value.toFixed(2)}`;
	return `$${value.toFixed(0)}`;
}
