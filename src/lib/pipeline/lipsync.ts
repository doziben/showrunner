import { fal } from '@fal-ai/client';
import { base64ToBlob, urlToBase64 } from '$lib/helpers/image';
import type { Avatar, Config, LipsyncProvider, Scene } from '$lib/types';
import { getLipsyncModel } from './lipsync-models';

let cachedFalKey: string | null = null;

function ensureFalConfigured(apiKey: string) {
	if (cachedFalKey === apiKey) return;
	fal.config({ credentials: apiKey });
	cachedFalKey = apiKey;
}

async function uploadToFalStorage(dataUrl: string): Promise<string> {
	const blob = base64ToBlob(dataUrl);
	const file = new File([blob], 'asset', { type: blob.type });
	return await fal.storage.upload(file);
}

const REPLICATE_API = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type ReplicatePrediction = {
	id: string;
	status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
	output?: string | string[] | null;
	error?: string | null;
	urls: { get: string };
};

async function pollReplicate(predictionUrl: string, key: string): Promise<ReplicatePrediction> {
	const start = Date.now();
	while (true) {
		const res = await fetch(predictionUrl, { headers: { authorization: `Bearer ${key}` } });
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Replicate poll failed: ${res.status} ${text.slice(0, 200)}`);
		}
		const data = (await res.json()) as ReplicatePrediction;
		if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
			return data;
		}
		if (Date.now() - start > POLL_TIMEOUT_MS) {
			throw new Error('Replicate prediction timed out after 5 minutes');
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
}

export type GenerateLipsyncOptions = {
	provider: LipsyncProvider;
	avatar: Avatar;
	scene: Scene;
	imageDataUrl: string;
	audioDataUrl: string;
	config: Config;
};

/**
 * Dispatch lipsync to the chosen provider. Returns a base64 data URL of the resulting MP4.
 */
export async function generateLipsync(opts: GenerateLipsyncOptions): Promise<string> {
	switch (opts.provider) {
		case 'p-video':
			return generateLipsyncPVideo(opts);
		case 'fabric':
			return generateLipsyncFabric(opts);
		case 'aurora':
			return generateLipsyncAurora(opts);
		default:
			throw new Error(`Unknown lipsync provider: ${opts.provider}`);
	}
}

/**
 * PrunaAI P-Video on Replicate. Cheapest option. Requires a text prompt; we use the
 * avatar's locked description plus the scene's action so the model has a coherent
 * generation target alongside the image+audio inputs.
 */
async function generateLipsyncPVideo({
	avatar,
	scene,
	imageDataUrl,
	audioDataUrl,
	config
}: GenerateLipsyncOptions): Promise<string> {
	const prompt = [
		avatar.description?.trim(),
		scene.actionDescription?.trim() ?? 'speaking to camera, natural expression'
	]
		.filter(Boolean)
		.join('. ');

	const duration = Math.min(getLipsyncModel('p-video').maxDurationSec, scene.durationSeconds || 5);

	const create = await fetch(`${REPLICATE_API}/models/prunaai/p-video/predictions`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${config.replicateKey}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			input: {
				prompt,
				image: imageDataUrl,
				audio: audioDataUrl,
				resolution: '720p',
				aspect_ratio: '9:16',
				duration,
				draft_mode: false
			}
		})
	});
	if (!create.ok) {
		const text = await create.text();
		throw new Error(`Replicate p-video create failed: ${create.status} ${text.slice(0, 200)}`);
	}
	const created = (await create.json()) as ReplicatePrediction;
	const final = await pollReplicate(created.urls.get, config.replicateKey);
	if (final.status !== 'succeeded' || !final.output) {
		throw new Error(final.error ?? `p-video prediction ${created.id} did not succeed`);
	}
	const url = Array.isArray(final.output) ? final.output[0] : final.output;
	return urlToBase64(url);
}

/**
 * Veed Fabric 1.0 on fal.ai. The default we shipped with — solid middle option.
 */
async function generateLipsyncFabric({
	imageDataUrl,
	audioDataUrl,
	config
}: GenerateLipsyncOptions): Promise<string> {
	ensureFalConfigured(config.falKey);

	const [image_url, audio_url] = await Promise.all([
		uploadToFalStorage(imageDataUrl),
		uploadToFalStorage(audioDataUrl)
	]);

	const result = await fal.subscribe('veed/fabric-1.0', {
		input: { image_url, audio_url, resolution: '480p' },
		logs: false
	});

	const data = result.data as { video?: { url?: string } } | undefined;
	const videoUrl = data?.video?.url;
	if (!videoUrl) throw new Error('fal.ai (fabric) response missing video url');
	return urlToBase64(videoUrl);
}

/**
 * Creatify Aurora on fal.ai. Highest quality, defaults to 720p.
 */
async function generateLipsyncAurora({
	imageDataUrl,
	audioDataUrl,
	config
}: GenerateLipsyncOptions): Promise<string> {
	ensureFalConfigured(config.falKey);

	const [image_url, audio_url] = await Promise.all([
		uploadToFalStorage(imageDataUrl),
		uploadToFalStorage(audioDataUrl)
	]);

	const result = await fal.subscribe('fal-ai/creatify/aurora', {
		input: { image_url, audio_url, resolution: '720p' },
		logs: false
	});

	const data = result.data as { video?: { url?: string } } | undefined;
	const videoUrl = data?.video?.url;
	if (!videoUrl) throw new Error('fal.ai (aurora) response missing video url');
	return urlToBase64(videoUrl);
}
