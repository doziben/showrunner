import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { resolveKey } from '$lib/server/keys';
import { runReplicate, extractFirstUrl, urlToDataUrl } from '$lib/server/replicate';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = resolveKey('replicate', request);
	if (!apiKey) return json({ error: 'No Replicate key' }, { status: 401 });

	const body = (await request.json()) as { prompt?: string; referenceImageBase64?: string };
	if (!body.prompt) return json({ error: 'Missing prompt' }, { status: 400 });
	if (!body.referenceImageBase64)
		return json({ error: 'Missing referenceImageBase64' }, { status: 400 });

	try {
		const output = await runReplicate({
			model: 'openai/gpt-image-2',
			input: {
				prompt: body.prompt,
				input_images: [body.referenceImageBase64],
				aspect_ratio: '2:3',
				quality: 'high',
				output_format: 'png',
				number_of_images: 1,
				background: 'auto',
				moderation: 'auto'
			},
			apiKey
		});
		const url = extractFirstUrl(output);
		const image = await urlToDataUrl(url);
		return json({ image });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
