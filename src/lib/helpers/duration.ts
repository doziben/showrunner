/**
 * Estimate spoken duration of a line at ~3 words per second (UGC pacing).
 * Strips ElevenLabs v3 audio tags like [confident] before counting.
 */
export function estimateSeconds(text: string): number {
	const stripped = text.replace(/\[[^\]]+\]/g, ' ');
	const words = stripped.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 3));
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s.toString().padStart(2, '0')}s`;
}
