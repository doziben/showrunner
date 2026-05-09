import { arrayBufferToBase64 } from '$lib/helpers/audio';

// Routed through SvelteKit /api/elevenlabs/* proxy → https://api.elevenlabs.io/v1/*
const ELEVENLABS_API = '/api/elevenlabs';
const VOICEOVER_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), ms);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} finally {
		clearTimeout(timer);
	}
}

export type GenerateVoiceoverOptions = {
	text: string;
	voiceId: string;
	apiKey: string;
	modelId?: string;
	stability?: number;
	similarityBoost?: number;
};

/**
 * ElevenLabs TTS. Returns base64 data URL of the MP3.
 * Audio tags like [confident], [pause] pass through to v3 untouched.
 */
export async function generateVoiceover({
	text,
	voiceId,
	apiKey,
	modelId = 'eleven_v3',
	stability = 0.5,
	similarityBoost = 0.75
}: GenerateVoiceoverOptions): Promise<string> {
	const res = await fetchWithTimeout(
		`${ELEVENLABS_API}/text-to-speech/${voiceId}`,
		{
			method: 'POST',
			headers: {
				'xi-api-key': apiKey,
				'content-type': 'application/json',
				accept: 'audio/mpeg'
			},
			body: JSON.stringify({
				text,
				model_id: modelId,
				voice_settings: { stability, similarity_boost: similarityBoost }
			})
		},
		VOICEOVER_TIMEOUT_MS
	);
	if (!res.ok) {
		const errBody = await res.text();
		throw new Error(`ElevenLabs ${res.status}: ${errBody.slice(0, 240)}`);
	}
	const buf = await res.arrayBuffer();
	return arrayBufferToBase64(buf, 'audio/mpeg');
}
