import { fal } from '@fal-ai/client';
import { base64ToBlob, urlToBase64 } from '$lib/helpers/image';

let cachedKey: string | null = null;

function ensureFalConfigured(apiKey: string) {
	if (cachedKey === apiKey) return;
	fal.config({ credentials: apiKey });
	cachedKey = apiKey;
}

async function uploadDataUrl(dataUrl: string): Promise<string> {
	const blob = base64ToBlob(dataUrl);
	// @fal-ai/client accepts File/Blob; cast to File for type compatibility.
	const file = new File([blob], 'asset', { type: blob.type });
	return await fal.storage.upload(file);
}

export type GenerateLipsyncOptions = {
	imageDataUrl: string;
	audioDataUrl: string;
	apiKey: string;
	resolution?: '480p' | '720p';
};

/**
 * fal.ai Veed Fabric 1.0 lipsync. Returns base64 data URL of the resulting MP4.
 * Uploads inputs to fal storage first since Fabric expects URLs.
 */
export async function generateLipsync({
	imageDataUrl,
	audioDataUrl,
	apiKey,
	resolution = '480p'
}: GenerateLipsyncOptions): Promise<string> {
	ensureFalConfigured(apiKey);

	const [image_url, audio_url] = await Promise.all([
		uploadDataUrl(imageDataUrl),
		uploadDataUrl(audioDataUrl)
	]);

	const result = await fal.subscribe('veed/fabric-1.0', {
		input: { image_url, audio_url, resolution },
		logs: false
	});

	const data = result.data as { video?: { url?: string } } | undefined;
	const videoUrl = data?.video?.url;
	if (!videoUrl) throw new Error('fal.ai response missing video url');

	return urlToBase64(videoUrl);
}
