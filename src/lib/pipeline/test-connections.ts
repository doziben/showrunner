/**
 * Lightweight ping calls used in onboarding to verify API keys.
 * Each returns { ok: boolean; message: string }.
 */

export type TestResult = { ok: boolean; message: string };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
	return await Promise.race([
		p,
		new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Timed out after ${ms}ms`)), ms))
	]);
}

export async function testAiGateway(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	try {
		// Vercel AI Gateway exposes Anthropic-compatible /v1/messages.
		const res = await withTimeout(
			fetch('https://ai-gateway.vercel.sh/v1/messages', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-api-key': key,
					'anthropic-version': '2023-06-01',
					authorization: `Bearer ${key}`
				},
				body: JSON.stringify({
					model: 'anthropic/claude-haiku-4-5',
					max_tokens: 4,
					messages: [{ role: 'user', content: 'ping' }]
				})
			}),
			15000
		);
		if (res.ok) return { ok: true, message: 'Gateway reachable' };
		const text = await res.text();
		return { ok: false, message: `${res.status} ${text.slice(0, 160)}` };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export async function testAnthropic(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	try {
		const res = await withTimeout(
			fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-api-key': key,
					'anthropic-version': '2023-06-01',
					'anthropic-dangerous-direct-browser-access': 'true'
				},
				body: JSON.stringify({
					model: 'claude-haiku-4-5',
					max_tokens: 4,
					messages: [{ role: 'user', content: 'ping' }]
				})
			}),
			15000
		);
		if (res.ok) return { ok: true, message: 'Anthropic reachable' };
		const text = await res.text();
		return { ok: false, message: `${res.status} ${text.slice(0, 160)}` };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export async function testReplicate(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	try {
		const res = await withTimeout(
			fetch('https://api.replicate.com/v1/account', {
				headers: { authorization: `Bearer ${key}` }
			}),
			10000
		);
		if (res.ok) {
			const data = (await res.json()) as { username?: string; type?: string };
			return { ok: true, message: data.username ? `Logged in as ${data.username}` : 'Reachable' };
		}
		const text = await res.text();
		return { ok: false, message: `${res.status} ${text.slice(0, 160)}` };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		const hint = msg.toLowerCase().includes('cors')
			? 'CORS blocked by Replicate. The browser cannot ping their account endpoint directly.'
			: msg;
		return { ok: false, message: hint };
	}
}

export async function testElevenLabs(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	try {
		const res = await withTimeout(
			fetch('https://api.elevenlabs.io/v1/user', {
				headers: { 'xi-api-key': key }
			}),
			10000
		);
		if (res.ok) return { ok: true, message: 'ElevenLabs reachable' };
		const text = await res.text();
		return { ok: false, message: `${res.status} ${text.slice(0, 160)}` };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export async function testFal(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	// fal.ai has no public ping endpoint that doesn't queue compute; we shape-check the key
	// instead. fal keys are formatted "<uuid>:<secret>".
	const looksValid = /^[a-f0-9-]{20,}:[a-zA-Z0-9_-]{20,}$/.test(key.trim());
	if (looksValid) return { ok: true, message: 'Key shape valid (will fully verify on first run)' };
	return { ok: false, message: 'Key should look like <uuid>:<secret>' };
}

export async function testElevenLabsVoice(key: string, voiceId: string): Promise<Blob> {
	const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
		method: 'POST',
		headers: {
			'xi-api-key': key,
			'content-type': 'application/json',
			accept: 'audio/mpeg'
		},
		body: JSON.stringify({
			text: 'Hi! This is a quick voice sample for Showrunner.',
			model_id: 'eleven_v3',
			voice_settings: { stability: 0.5, similarity_boost: 0.75 }
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`${res.status} ${text.slice(0, 200)}`);
	}
	return await res.blob();
}
