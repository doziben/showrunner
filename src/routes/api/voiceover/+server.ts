import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { resolveKey } from '$lib/server/keys';
import { generateVoiceoverServer, arrayBufferToDataUrl } from '$lib/server/elevenlabs';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = resolveKey('elevenlabs', request);
	if (!apiKey) return json({ error: 'No ElevenLabs key' }, { status: 401 });

	const body = (await request.json()) as { text?: string; voiceId?: string; modelId?: string };
	if (!body.text) return json({ error: 'Missing text' }, { status: 400 });
	if (!body.voiceId) return json({ error: 'Missing voiceId' }, { status: 400 });

	try {
		const buf = await generateVoiceoverServer({
			text: body.text,
			voiceId: body.voiceId,
			apiKey,
			modelId: body.modelId
		});
		return json({ audio: arrayBufferToDataUrl(buf, 'audio/mpeg') });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
