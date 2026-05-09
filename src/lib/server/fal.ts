import { fal } from '@fal-ai/client';

/**
 * Server-side fal.ai wrapper. We reset credentials per call because the fal
 * client stores them at module level and could leak between requests if
 * different callers had different keys (e.g. env-set deploy vs BYOK).
 */
export async function runFalSubscribe<T = unknown>(opts: {
	endpointId: string;
	input: Record<string, unknown>;
	apiKey: string;
}): Promise<T> {
	fal.config({ credentials: opts.apiKey });
	const result = await fal.subscribe(opts.endpointId, {
		input: opts.input,
		logs: false
	});
	return result.data as T;
}

/**
 * Upload a base64 data URL to fal storage and return the hosted URL.
 * fal's lipsync endpoints want URLs, not raw data, so we upload first.
 */
export async function uploadDataUrlToFal(dataUrl: string, apiKey: string): Promise<string> {
	fal.config({ credentials: apiKey });
	const [meta, b64] = dataUrl.split(',');
	const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
	const bytes = Buffer.from(b64, 'base64');
	const blob = new Blob([bytes], { type: mime });
	const file = new File([blob], 'asset', { type: mime });
	return fal.storage.upload(file);
}
