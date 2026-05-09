export async function fileToBase64(file: File | Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export async function urlToBase64(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	const blob = await res.blob();
	return fileToBase64(blob);
}

export function base64ToBlob(dataUrl: string): Blob {
	const [meta, data] = dataUrl.split(',');
	const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
	const bytes = atob(data);
	const buf = new Uint8Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
	return new Blob([buf], { type: mime });
}
