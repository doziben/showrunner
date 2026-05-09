/**
 * Onboarding "Test" buttons → /api/health.
 * Server reports whether each provider has a key available — either env-set
 * by the deployer or supplied by the client in this request's headers.
 */

export type TestResult = { ok: boolean; message: string };

type Provider = 'replicate' | 'elevenlabs' | 'fal' | 'gateway' | 'anthropic';

type HealthShape = Record<Provider, { envSet: boolean; available: boolean }>;

async function fetchHealth(headers: Record<string, string>): Promise<HealthShape> {
	const res = await fetch('/api/health', { headers });
	if (!res.ok) throw new Error(`Health ${res.status}`);
	return (await res.json()) as HealthShape;
}

async function checkProvider(provider: Provider, key: string): Promise<TestResult> {
	if (!key.trim()) return { ok: false, message: 'Missing key' };
	try {
		const headers: Record<string, string> = {
			[`x-showrunner-${provider}`]: key.trim()
		};
		const health = await fetchHealth(headers);
		const status = health[provider];
		if (status.envSet) return { ok: true, message: 'Server-set via env' };
		if (status.available) return { ok: true, message: 'Key accepted' };
		return { ok: false, message: 'Key not recognized by server' };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export const testAiGateway = (key: string) => checkProvider('gateway', key);
export const testAnthropic = (key: string) => checkProvider('anthropic', key);
export const testReplicate = (key: string) => checkProvider('replicate', key);
export const testElevenLabs = (key: string) => checkProvider('elevenlabs', key);
export const testFal = (key: string) => checkProvider('fal', key);

export async function testElevenLabsVoice(key: string, voiceId: string): Promise<Blob> {
	const res = await fetch('/api/voiceover', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-showrunner-elevenlabs': key
		},
		body: JSON.stringify({
			text: 'Hi! This is a quick voice sample for Showrunner.',
			voiceId,
			modelId: 'eleven_v3'
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${res.status} ${text.slice(0, 200)}`);
	}
	const { audio } = (await res.json()) as { audio: string };
	// Convert data URL back to Blob for the existing audio playback flow.
	const [meta, b64] = audio.split(',');
	const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'audio/mpeg';
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new Blob([bytes], { type: mime });
}
