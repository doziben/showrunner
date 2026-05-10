import type { Avatar, AvatarVariantMode, Config } from '$lib/types';
import { buildVariantPrompt } from './prompts';

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

/**
 * Generate a single scene shot using a specific reference image. The caller
 * passes the project's avatarVariantReferenceImage so every scene in a project
 * shares the same outfit/environment, even if the avatar's original reference
 * is different.
 */
export async function generateSceneShot({
	prompt,
	referenceImageBase64,
	apiKey
}: {
	prompt: string;
	referenceImageBase64: string;
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
			referenceImageBase64
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Scene shot ${res.status}: ${text.slice(0, 240)}`);
	}
	const { image } = (await res.json()) as { image: string };
	return image;
}

/**
 * Ask Claude to invent a fresh outfit/environment that doesn't repeat the
 * avatar's recent setups. Server-side route handles the API key.
 */
export async function generateRandomEnvironment(
	avatar: Avatar,
	config: Config
): Promise<string> {
	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (config.useAiGateway && config.aiGatewayKey) {
		headers['x-showrunner-gateway'] = config.aiGatewayKey;
	} else if (!config.useAiGateway && config.anthropicKey) {
		headers['x-showrunner-anthropic'] = config.anthropicKey;
	}

	const res = await fetch('/api/avatars/random-environment', {
		method: 'POST',
		headers,
		body: JSON.stringify({
			recentEnvironments: (avatar.recentEnvironments ?? []).slice(0, 5),
			useGateway: config.useAiGateway
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Random environment ${res.status}: ${text.slice(0, 240)}`);
	}
	const { description } = (await res.json()) as { description: string };
	return description;
}

export type AvatarVariantResult = {
	mode: AvatarVariantMode;
	environmentDescription: string;
	referenceImageBase64: string;
};

/**
 * Generate the project-specific avatar setup.
 *
 * - default: pass through the avatar's locked reference (no extra cost)
 * - custom: caller-supplied description, fresh image-to-image render
 * - random: Claude picks a fresh description, fresh image-to-image render
 *
 * The fresh render uses the avatar's reference as the identity anchor via
 * input_images; gpt-image-2 preserves the face and re-skins outfit + room.
 */
export async function generateAvatarVariant({
	avatar,
	mode,
	customDescription,
	config
}: {
	avatar: Avatar;
	mode: AvatarVariantMode;
	customDescription?: string;
	config: Config;
}): Promise<AvatarVariantResult> {
	if (mode === 'default') {
		return {
			mode,
			environmentDescription: avatar.environmentDescription,
			referenceImageBase64: avatar.referenceImageBase64
		};
	}

	let environmentDescription: string;
	if (mode === 'custom') {
		const trimmed = customDescription?.trim();
		if (!trimmed) throw new Error('Custom variant requires a description');
		environmentDescription = trimmed;
	} else {
		environmentDescription = await generateRandomEnvironment(avatar, config);
	}

	const prompt = buildVariantPrompt(avatar, environmentDescription);
	const referenceImageBase64 = await generateSceneShot({
		prompt,
		referenceImageBase64: avatar.referenceImageBase64,
		apiKey: config.replicateKey
	});

	return { mode, environmentDescription, referenceImageBase64 };
}
