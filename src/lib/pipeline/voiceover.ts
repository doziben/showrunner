/**
 * ElevenLabs TTS — runs server-side via /api/voiceover.
 * The user's key (from IndexedDB) rides on the `x-showrunner-elevenlabs` header
 * as a fallback if the deployer hasn't set ELEVEN_LABS_API_KEY in env.
 */
export type GenerateVoiceoverOptions = {
	text: string;
	voiceId: string;
	apiKey: string;
	modelId?: string;
};

export async function generateVoiceover({
	text,
	voiceId,
	apiKey,
	modelId
}: GenerateVoiceoverOptions): Promise<string> {
	const res = await fetch('/api/voiceover', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-showrunner-elevenlabs': apiKey
		},
		body: JSON.stringify({ text, voiceId, modelId })
	});
	if (!res.ok) {
		const errBody = await res.text();
		throw new Error(`Voiceover ${res.status}: ${errBody.slice(0, 240)}`);
	}
	const { audio } = (await res.json()) as { audio: string };
	return audio;
}
