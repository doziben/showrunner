import type { Avatar } from '$lib/types';

/**
 * Avatar image generation — runs server-side via /api/avatars/portraits and
 * /api/avatars/scene-shot. The server uses the `replicate` npm client with
 * gpt-image-2 at quality=high.
 *
 * The user's Replicate key rides on `x-showrunner-replicate` as a fallback
 * to the deployer's REPLICATE_API_TOKEN env var.
 */

export type GenerateAvatarOptions = {
	prompt: string;
	apiKey: string;
	count?: number;
};

export async function generateAvatarPortraits({
	prompt,
	apiKey,
	count = 4
}: GenerateAvatarOptions): Promise<{ base64: string; seed: number }[]> {
	const res = await fetch('/api/avatars/portraits', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-showrunner-replicate': apiKey
		},
		body: JSON.stringify({ prompt, count })
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Portraits ${res.status}: ${text.slice(0, 240)}`);
	}
	const { images } = (await res.json()) as { images: string[] };
	// Seed is unused for gpt-image-2 (no seed parameter exposed) but kept on the
	// Avatar type for backwards compat / possible model swaps.
	return images.map((base64) => ({ base64, seed: 0 }));
}

export async function generateSceneShot({
	avatar,
	prompt,
	apiKey
}: {
	avatar: Avatar;
	prompt: string;
	apiKey: string;
}): Promise<string> {
	const res = await fetch('/api/avatars/scene-shot', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-showrunner-replicate': apiKey
		},
		body: JSON.stringify({
			prompt,
			referenceImageBase64: avatar.referenceImageBase64
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Scene shot ${res.status}: ${text.slice(0, 240)}`);
	}
	const { image } = (await res.json()) as { image: string };
	return image;
}
