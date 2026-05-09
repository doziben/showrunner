import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { resolveKey } from '$lib/server/keys';
import { runReplicate, extractFirstUrl, urlToDataUrl } from '$lib/server/replicate';

const PORTRAIT_BACKDROP =
	'Filmed on iPhone in vertical portrait format, natural daylight from a window to the left, slight grain, authentic UGC aesthetic, not overly polished. Sitting at a small wooden desk in a cozy home office. Blurred background shows a plant, a bookshelf, and soft warm lighting. Holding her phone in selfie position at chest level, looking directly into the lens. Medium shot, framed from chest up. No text on screen. Single still frame.';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = resolveKey('replicate', request);
	if (!apiKey) return json({ error: 'No Replicate key' }, { status: 401 });

	const body = (await request.json()) as { prompt?: string; count?: number };
	if (!body.prompt) return json({ error: 'Missing prompt' }, { status: 400 });
	const count = Math.max(1, Math.min(8, body.count ?? 4));
	const fullPrompt = `${body.prompt}\n\n${PORTRAIT_BACKDROP}`;

	try {
		const tasks = Array.from({ length: count }, async () => {
			const output = await runReplicate({
				model: 'openai/gpt-image-2',
				input: {
					prompt: fullPrompt,
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
			return urlToDataUrl(url);
		});
		const images = await Promise.all(tasks);
		return json({ images });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
