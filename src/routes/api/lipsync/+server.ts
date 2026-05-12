import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { resolveKey } from '$lib/server/keys';
import { runReplicate, extractFirstUrl, urlToDataUrl } from '$lib/server/replicate';
import { runFalSubscribe, uploadDataUrlToFal } from '$lib/server/fal';
import type { LipsyncProvider } from '$lib/types';

interface Body {
	provider: LipsyncProvider;
	imageDataUrl: string;
	audioDataUrl: string;
	prompt?: string;
	durationSeconds?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Body;
	if (!body.imageDataUrl || !body.audioDataUrl) {
		return json({ error: 'Missing imageDataUrl or audioDataUrl' }, { status: 400 });
	}
	if (!['p-video', 'fabric', 'aurora'].includes(body.provider)) {
		return json({ error: `Unknown lipsync provider: ${body.provider}` }, { status: 400 });
	}

	try {
		if (body.provider === 'p-video') {
			const apiKey = resolveKey('replicate', request);
			if (!apiKey) return json({ error: 'No Replicate key' }, { status: 401 });
			const duration = Math.min(10, Math.max(1, body.durationSeconds ?? 5));
			const output = await runReplicate({
				model: 'prunaai/p-video',
				input: {
					prompt: body.prompt ?? 'speaking to camera, natural expression',
					image: body.imageDataUrl,
					audio: body.audioDataUrl,
					resolution: '1080p',
					aspect_ratio: '9:16',
					duration,
					draft_mode: false
				},
				apiKey
			});
			const url = extractFirstUrl(output);
			const video = await urlToDataUrl(url);
			return json({ video });
		}

		// fabric / aurora go through fal.ai
		const falKey = resolveKey('fal', request);
		if (!falKey) return json({ error: 'No fal.ai key' }, { status: 401 });

		const [image_url, audio_url] = await Promise.all([
			uploadDataUrlToFal(body.imageDataUrl, falKey),
			uploadDataUrlToFal(body.audioDataUrl, falKey)
		]);

		const endpointId = body.provider === 'fabric' ? 'veed/fabric-1.0' : 'fal-ai/creatify/aurora';

		const data = await runFalSubscribe<{ video?: { url?: string } }>({
			endpointId,
			input: { image_url, audio_url, resolution: '720p' },
			apiKey: falKey
		});

		const videoUrl = data?.video?.url;
		if (!videoUrl) return json({ error: 'fal.ai response missing video url' }, { status: 502 });

		const res = await fetch(videoUrl);
		if (!res.ok) return json({ error: `Failed to fetch fal video: ${res.status}` }, { status: 502 });
		const buf = Buffer.from(await res.arrayBuffer());
		const video = `data:video/mp4;base64,${buf.toString('base64')}`;
		return json({ video });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
