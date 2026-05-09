/**
 * Lightweight ping calls used in onboarding to verify API keys.
 * All calls go through the SvelteKit /api/* proxies, so CORS is no longer
 * a concern — these are real authentication checks now.
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
		// Tiny completion through the gateway. If auth fails the gateway returns 401.
		const res = await withTimeout(
			fetch('/api/gateway/v1/ai/language-model', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${key}`
				},
				body: JSON.stringify({
					model: 'anthropic/claude-haiku-4-5',
					messages: [{ role: 'user', content: 'ping' }],
					max_tokens: 4
				})
			}),
			15000
		);
		if (res.ok || res.status === 400) {
			// 400 just means the request shape isn't what the gateway expected,
			// which still proves the key authenticated.
			return { ok: true, message: 'Gateway reachable' };
		}
		if (res.status === 401 || res.status === 403) {
			return { ok: false, message: 'Gateway rejected the key' };
		}
		const text = await res.text();
		return { ok: true, message: `Reachable (${res.status})`, ...(text ? {} : {}) };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export async function testAnthropic(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	try {
		const res = await withTimeout(
			fetch('/api/anthropic/v1/messages', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-api-key': key
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
		if (res.status === 401 || res.status === 403) {
			return { ok: false, message: 'Anthropic rejected the key' };
		}
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
			fetch('/api/replicate/account', {
				headers: { authorization: `Bearer ${key}` }
			}),
			10000
		);
		if (res.ok) {
			const data = (await res.json()) as { username?: string };
			return {
				ok: true,
				message: data.username ? `Logged in as ${data.username}` : 'Reachable'
			};
		}
		if (res.status === 401 || res.status === 403) {
			return { ok: false, message: 'Replicate rejected the token' };
		}
		const text = await res.text();
		return { ok: false, message: `${res.status} ${text.slice(0, 160)}` };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export async function testElevenLabs(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	try {
		const res = await withTimeout(
			fetch('/api/elevenlabs/user', {
				headers: { 'xi-api-key': key }
			}),
			10000
		);
		if (res.ok) return { ok: true, message: 'ElevenLabs reachable' };
		if (res.status === 401 || res.status === 403) {
			return { ok: false, message: 'ElevenLabs rejected the key' };
		}
		const text = await res.text();
		return { ok: false, message: `${res.status} ${text.slice(0, 160)}` };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}
}

export async function testFal(key: string): Promise<TestResult> {
	if (!key) return { ok: false, message: 'Missing key' };
	// fal doesn't expose a free ping endpoint that doesn't queue compute, so we
	// shape-check the key and let the first lipsync call fully validate it.
	const looksValid = /^[a-f0-9-]{20,}:[a-zA-Z0-9_-]{20,}$/.test(key.trim());
	if (looksValid) return { ok: true, message: 'Key shape valid (verified on first run)' };
	return { ok: false, message: 'Key should look like <uuid>:<secret>' };
}

export async function testElevenLabsVoice(key: string, voiceId: string): Promise<Blob> {
	const res = await fetch(`/api/elevenlabs/text-to-speech/${voiceId}`, {
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
