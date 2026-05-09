import type { Avatar } from '$lib/types';
import { urlToBase64 } from '$lib/helpers/image';

/** Replicate prediction lifecycle. */
type Prediction = {
	id: string;
	status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
	output?: string | string[] | null;
	error?: string | null;
	urls: { get: string; cancel?: string };
};

const REPLICATE_API = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

async function poll(predictionUrl: string, key: string): Promise<Prediction> {
	const start = Date.now();
	while (true) {
		const res = await fetch(predictionUrl, { headers: { authorization: `Bearer ${key}` } });
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Replicate poll failed: ${res.status} ${text.slice(0, 200)}`);
		}
		const data = (await res.json()) as Prediction;
		if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
			return data;
		}
		if (Date.now() - start > POLL_TIMEOUT_MS) {
			throw new Error('Replicate prediction timed out after 5 minutes');
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
}

async function createPrediction(
	model: string,
	input: Record<string, unknown>,
	key: string
): Promise<Prediction> {
	const res = await fetch(`${REPLICATE_API}/models/${model}/predictions`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${key}`,
			'content-type': 'application/json',
			prefer: 'wait=0'
		},
		body: JSON.stringify({ input })
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Replicate create failed: ${res.status} ${text.slice(0, 200)}`);
	}
	return (await res.json()) as Prediction;
}

const PORTRAIT_BACKDROP =
	'Filmed on iPhone in vertical 9:16 format, natural daylight from a window to the left, slight grain, authentic UGC aesthetic, not overly polished. Sitting at a small wooden desk in a cozy home office. Blurred background shows a plant, a bookshelf, and soft warm lighting. Holding her phone in selfie position at chest level, looking directly into the lens. Medium shot, framed from chest up. No text on screen. Single still frame.';

export type GenerateAvatarOptions = {
	prompt: string;
	apiKey: string;
	count?: number;
	model?: string;
};

/**
 * Generate N portrait variations from a prompt. Returns base64 data URLs.
 * Uses flux-1.1-pro by default (best identity quality for the locked reference).
 */
export async function generateAvatarPortraits({
	prompt,
	apiKey,
	count = 4,
	model = 'black-forest-labs/flux-1.1-pro'
}: GenerateAvatarOptions): Promise<{ base64: string; seed: number }[]> {
	const fullPrompt = `${prompt}\n\n${PORTRAIT_BACKDROP}`;
	const tasks = Array.from({ length: count }, async () => {
		const seed = Math.floor(Math.random() * 2_000_000_000);
		const created = await createPrediction(
			model,
			{
				prompt: fullPrompt,
				aspect_ratio: '9:16',
				output_format: 'png',
				safety_tolerance: 2,
				prompt_upsampling: true,
				seed
			},
			apiKey
		);
		const final = await poll(created.urls.get, apiKey);
		if (final.status !== 'succeeded' || !final.output) {
			throw new Error(final.error ?? `Prediction ${created.id} did not succeed`);
		}
		const url = Array.isArray(final.output) ? final.output[0] : final.output;
		const base64 = await urlToBase64(url);
		return { base64, seed };
	});
	return Promise.all(tasks);
}

/**
 * For per-scene shots (used in Phase 6). Uses flux-dev img2img with low denoising
 * to preserve identity from the locked reference.
 */
export async function generateSceneShot({
	avatar,
	prompt,
	apiKey,
	model = 'black-forest-labs/flux-dev'
}: {
	avatar: Avatar;
	prompt: string;
	apiKey: string;
	model?: string;
}): Promise<string> {
	const created = await createPrediction(
		model,
		{
			prompt,
			image: avatar.referenceImageBase64,
			prompt_strength: 0.55,
			aspect_ratio: '9:16',
			output_format: 'png',
			num_inference_steps: 28,
			seed: avatar.seed
		},
		apiKey
	);
	const final = await poll(created.urls.get, apiKey);
	if (final.status !== 'succeeded' || !final.output) {
		throw new Error(final.error ?? `Scene shot prediction ${created.id} did not succeed`);
	}
	const url = Array.isArray(final.output) ? final.output[0] : final.output;
	return urlToBase64(url);
}
