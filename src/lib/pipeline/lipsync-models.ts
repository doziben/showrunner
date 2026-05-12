import type { LipsyncProvider } from '$lib/types';

/**
 * Public-facing catalog of the lipsync model options.
 * Costs are per second of generated video at the model's default resolution.
 * Source: provider docs as of Showrunner v0.1 — update when upstream pricing changes.
 */
export interface LipsyncModelInfo {
	id: LipsyncProvider;
	label: string;
	provider: 'replicate' | 'fal';
	defaultResolution: string;
	pricePerSecond: number;
	tagline: string;
	maxDurationSec: number;
}

export const LIPSYNC_MODELS: Record<LipsyncProvider, LipsyncModelInfo> = {
	'p-video': {
		id: 'p-video',
		label: 'PrunaAI P-Video',
		provider: 'replicate',
		defaultResolution: '1080p',
		pricePerSecond: 0.04,
		tagline: 'Cheapest. Optimized variant, 1080p.',
		maxDurationSec: 10
	},
	aurora: {
		id: 'aurora',
		label: 'Creatify Aurora',
		provider: 'fal',
		defaultResolution: '720p',
		pricePerSecond: 0.14,
		tagline: 'Reliable middle. 720p, polished output.',
		maxDurationSec: 60
	},
	fabric: {
		id: 'fabric',
		label: 'Veed Fabric 1.0',
		provider: 'fal',
		defaultResolution: '720p',
		pricePerSecond: 0.15,
		tagline: 'Highest quality. 720p, broad codec support.',
		maxDurationSec: 60
	},
	'omni-human-1.5': {
		id: 'omni-human-1.5',
		label: 'ByteDance OmniHuman 1.5',
		provider: 'replicate',
		defaultResolution: 'auto',
		pricePerSecond: 0.16,
		tagline: 'Film-grade. Cinematic motion, expressive emotion.',
		maxDurationSec: 35
	}
};

export const DEFAULT_LIPSYNC_PROVIDER: LipsyncProvider = 'p-video';

export function getLipsyncModel(provider: LipsyncProvider | undefined): LipsyncModelInfo {
	return LIPSYNC_MODELS[provider ?? DEFAULT_LIPSYNC_PROVIDER];
}
