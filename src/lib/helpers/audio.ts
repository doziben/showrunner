import { base64ToBlob } from './image';

export function audioObjectUrl(base64: string): string {
	const blob = base64ToBlob(base64);
	return URL.createObjectURL(blob);
}

export function arrayBufferToBase64(buffer: ArrayBuffer, mime = 'audio/mpeg'): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
	}
	return `data:${mime};base64,${btoa(binary)}`;
}
