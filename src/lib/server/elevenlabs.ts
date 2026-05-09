/**
 * Server-side ElevenLabs TTS. Returns the raw MP3 bytes; the endpoint converts
 * to base64 for the JSON response.
 */
export async function generateVoiceoverServer(opts: {
	text: string;
	voiceId: string;
	apiKey: string;
	modelId?: string;
	stability?: number;
	similarityBoost?: number;
}): Promise<ArrayBuffer> {
	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`, {
		method: 'POST',
		headers: {
			'xi-api-key': opts.apiKey,
			'content-type': 'application/json',
			accept: 'audio/mpeg'
		},
		body: JSON.stringify({
			text: opts.text,
			model_id: opts.modelId ?? 'eleven_v3',
			voice_settings: {
				stability: opts.stability ?? 0.5,
				similarity_boost: opts.similarityBoost ?? 0.75
			}
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`ElevenLabs ${res.status}: ${text.slice(0, 240)}`);
	}
	return res.arrayBuffer();
}

export function arrayBufferToDataUrl(buf: ArrayBuffer, mime = 'audio/mpeg'): string {
	const b64 = Buffer.from(buf).toString('base64');
	return `data:${mime};base64,${b64}`;
}
