import type { Avatar } from '$lib/types';
import { urlToBase64 } from '$lib/helpers/image';

/**
 * Avatar image generation using OpenAI's gpt-image-2 on Replicate.
 *
 * Why gpt-image-2: better identity preservation across edits than Flux for
 * UGC avatars where the same person needs to appear consistently across
 * many scenes. Aspect ratio is capped at 2:3 (closest vertical to UGC's 9:16).
 *
 * Quality is locked to "high" — Showrunner's whole product is the avatar
 * looking like the same real person every time, so we don't try to save
 * pennies on quality here.
 */

const MODEL = 'openai/gpt-image-2';
const QUALITY = 'high' as const;
const ASPECT_RATIO = '2:3' as const; // closest vertical to 9:16 that this model supports

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
	'Filmed on iPhone in vertical portrait format, natural daylight from a window to the left, slight grain, authentic UGC aesthetic, not overly polished. Sitting at a small wooden desk in a cozy home office. Blurred background shows a plant, a bookshelf, and soft warm lighting. Holding her phone in selfie position at chest level, looking directly into the lens. Medium shot, framed from chest up. No text on screen. Single still frame.';

export type GenerateAvatarOptions = {
	prompt: string;
	apiKey: string;
	count?: number;
};

/**
 * Generate N portrait variations from a prompt. Returns base64 data URLs.
 * Uses gpt-image-2 at quality=high for the locked reference image.
 *
 * Note: gpt-image-2 doesn't expose a seed parameter. Variations are produced
 * by issuing N parallel calls — the model's stochasticity gives natural variety.
 */
export async function generateAvatarPortraits({
	prompt,
	apiKey,
	count = 4
}: GenerateAvatarOptions): Promise<{ base64: string; seed: number }[]> {
	const fullPrompt = `${prompt}\n\n${PORTRAIT_BACKDROP}`;
	const tasks = Array.from({ length: count }, async () => {
		const created = await createPrediction(
			MODEL,
			{
				prompt: fullPrompt,
				aspect_ratio: ASPECT_RATIO,
				quality: QUALITY,
				output_format: 'png',
				number_of_images: 1,
				background: 'auto',
				moderation: 'auto'
			},
			apiKey
		);
		const final = await poll(created.urls.get, apiKey);
		if (final.status !== 'succeeded' || !final.output) {
			throw new Error(final.error ?? `Prediction ${created.id} did not succeed`);
		}
		const url = Array.isArray(final.output) ? final.output[0] : final.output;
		const base64 = await urlToBase64(url);
		// Seed is unused for gpt-image-2 but kept on the Avatar type for backwards
		// compat and possible future model swaps.
		return { base64, seed: 0 };
	});
	return Promise.all(tasks);
}

/**
 * Per-scene avatar shot. gpt-image-2's edit mode preserves identity from the
 * reference image extremely well — exactly the property we need for UGC where
 * the same person must appear in every avatar scene. The locked reference is
 * passed via input_images and the prompt describes the new pose / expression.
 */
export async function generateSceneShot({
	avatar,
	prompt,
	apiKey
}: {
	avatar: Avatar;
	prompt: string;
	apiKey: string;
}): Promise<string> {
	const created = await createPrediction(
		MODEL,
		{
			prompt,
			input_images: [avatar.referenceImageBase64],
			aspect_ratio: ASPECT_RATIO,
			quality: QUALITY,
			output_format: 'png',
			number_of_images: 1,
			background: 'auto',
			moderation: 'auto'
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
