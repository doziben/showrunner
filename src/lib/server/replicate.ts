import Replicate from 'replicate';

/**
 * Server-side Replicate runner. Uses the official `replicate` npm client which
 * handles polling internally and returns the model's output directly.
 *
 * `useFileOutput: false` keeps the API returning URLs (strings) instead of
 * FileOutput objects — easier to download + base64-encode from here.
 */
export async function runReplicate(opts: {
	model: `${string}/${string}` | `${string}/${string}:${string}`;
	input: Record<string, unknown>;
	apiKey: string;
}): Promise<unknown> {
	const replicate = new Replicate({ auth: opts.apiKey, useFileOutput: false });
	return replicate.run(opts.model, { input: opts.input });
}

/**
 * Walk a Replicate output (which can be string | string[] | nested arrays) and
 * return the first thing that looks like a downloadable URL.
 */
export function extractFirstUrl(output: unknown): string {
	const visit = (v: unknown): string | null => {
		if (typeof v === 'string') {
			const t = v.trim();
			if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) return t;
			return null;
		}
		if (Array.isArray(v)) {
			for (const item of v) {
				const found = visit(item);
				if (found) return found;
			}
		}
		return null;
	};
	const found = visit(output);
	if (!found) throw new Error('Replicate returned no usable URL');
	return found;
}

/**
 * Fetch any URL and return it as a base64 data URL with the right MIME type.
 * Used to bring Replicate-hosted output back into the response so the client
 * can store it in IndexedDB without an extra round-trip.
 */
export async function urlToDataUrl(url: string): Promise<string> {
	if (url.startsWith('data:')) return url;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	const mime = res.headers.get('content-type') ?? 'application/octet-stream';
	const buf = Buffer.from(await res.arrayBuffer());
	return `data:${mime};base64,${buf.toString('base64')}`;
}
