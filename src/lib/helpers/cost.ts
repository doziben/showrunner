import type { Scene } from '$lib/types';

/**
 * Per-provider unit pricing (USD). Conservative estimates.
 * Update if upstream pricing changes.
 */
export const PRICING = {
	voiceoverPerMinute: 0.3, // ElevenLabs ~$0.30 / min spoken
	imagePerShot: 0.04, // Replicate Flux 1.1 Pro / Flux Dev
	lipsyncPerSecond: 0.08 // fal.ai Veed Fabric 1.0 @ 480p
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
};

export function estimateCost(scenes: Scene[]): CostBreakdown {
	const totalSeconds = scenes.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
	const avatarScenes = scenes.filter((s) => s.type === 'avatar');
	const avatarSceneSeconds = avatarScenes.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
	const brollScenes = scenes.filter((s) => s.type === 'broll');

	const voiceover = (totalSeconds / 60) * PRICING.voiceoverPerMinute;
	const image = avatarScenes.length * PRICING.imagePerShot;
	const lipsync = avatarSceneSeconds * PRICING.lipsyncPerSecond;
	const total = voiceover + image + lipsync;

	return {
		voiceover,
		image,
		lipsync,
		total,
		totalSeconds,
		avatarSceneSeconds,
		avatarSceneCount: avatarScenes.length,
		brollSceneCount: brollScenes.length
	};
}

export function fmtUsd(value: number): string {
	if (value < 0.01) return '< $0.01';
	if (value < 10) return `$${value.toFixed(2)}`;
	return `$${value.toFixed(0)}`;
}
