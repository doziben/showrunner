import type { Transaction, TxKind, TxProvider } from '$lib/types';
import { PRICING } from './cost';
import { LIPSYNC_MODELS } from '$lib/pipeline/lipsync-models';
import type { LipsyncProvider } from '$lib/types';

/**
 * Claude Opus 4.7 token pricing on Anthropic's published rates.
 * Used for storyboard cost when AI SDK returns usage.
 */
export const OPUS_PRICING = {
	inputPerToken: 15 / 1_000_000, // $15 / MTok
	outputPerToken: 75 / 1_000_000 // $75 / MTok
};

export function costForVoiceover(seconds: number): number {
	return (seconds / 60) * PRICING.voiceoverPerMinute;
}

export function costForAvatarImage(count: number = 1): number {
	return count * PRICING.imagePerShot;
}

export function costForLipsync(provider: LipsyncProvider, seconds: number): number {
	return seconds * LIPSYNC_MODELS[provider].pricePerSecond;
}

export function costForStoryboard(inputTokens: number, outputTokens: number): number {
	return inputTokens * OPUS_PRICING.inputPerToken + outputTokens * OPUS_PRICING.outputPerToken;
}

/* ------------------------------- aggregations ------------------------------- */

export function totalSpend(txs: Transaction[]): number {
	return txs.reduce((sum, t) => sum + (t.status === 'success' ? t.costUsd : 0), 0);
}

export function spendInRange(txs: Transaction[], rangeMs: number): number {
	const cutoff = Date.now() - rangeMs;
	return txs.reduce(
		(sum, t) => sum + (t.timestamp >= cutoff && t.status === 'success' ? t.costUsd : 0),
		0
	);
}

export function spendByKind(txs: Transaction[]): Record<TxKind, number> {
	const out: Record<TxKind, number> = {
		storyboard: 0,
		voiceover: 0,
		'avatar-portrait': 0,
		'avatar-shot': 0,
		lipsync: 0
	};
	for (const t of txs) if (t.status === 'success') out[t.kind] += t.costUsd;
	return out;
}

export function spendByProvider(txs: Transaction[]): Record<TxProvider, number> {
	const out: Record<TxProvider, number> = {
		gateway: 0,
		anthropic: 0,
		elevenlabs: 0,
		replicate: 0,
		fal: 0
	};
	for (const t of txs) if (t.status === 'success') out[t.provider] += t.costUsd;
	return out;
}

export function spendByProject(txs: Transaction[]): Map<string, number> {
	const out = new Map<string, number>();
	for (const t of txs) {
		if (t.status !== 'success' || !t.projectId) continue;
		out.set(t.projectId, (out.get(t.projectId) ?? 0) + t.costUsd);
	}
	return out;
}

/**
 * Group spend by calendar day in the user's local timezone.
 * Returns N daily buckets ending today (oldest first), even if there were no
 * transactions on a given day (zero-fills for clean charts).
 */
export function spendByDay(txs: Transaction[], days: number): { day: number; total: number }[] {
	const buckets: { day: number; total: number }[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayMs = today.getTime();
	const dayMs = 86_400_000;
	for (let i = days - 1; i >= 0; i--) {
		buckets.push({ day: todayMs - i * dayMs, total: 0 });
	}
	for (const t of txs) {
		if (t.status !== 'success') continue;
		const d = new Date(t.timestamp);
		d.setHours(0, 0, 0, 0);
		const stamp = d.getTime();
		const idx = buckets.findIndex((b) => b.day === stamp);
		if (idx >= 0) buckets[idx].total += t.costUsd;
	}
	return buckets;
}

/**
 * Stacked daily spend by kind — used for the trend chart.
 */
export function spendByDayStacked(
	txs: Transaction[],
	days: number
): { day: number; total: number; byKind: Record<TxKind, number> }[] {
	const buckets = spendByDay(txs, days).map((b) => ({
		...b,
		byKind: {
			storyboard: 0,
			voiceover: 0,
			'avatar-portrait': 0,
			'avatar-shot': 0,
			lipsync: 0
		} as Record<TxKind, number>
	}));
	for (const t of txs) {
		if (t.status !== 'success') continue;
		const d = new Date(t.timestamp);
		d.setHours(0, 0, 0, 0);
		const stamp = d.getTime();
		const bucket = buckets.find((b) => b.day === stamp);
		if (bucket) bucket.byKind[t.kind] += t.costUsd;
	}
	return buckets;
}

export const KIND_META: Record<TxKind, { label: string; short: string; tone: string }> = {
	storyboard: { label: 'Storyboard agent', short: 'Storyboard', tone: 'bg-foreground/80' },
	voiceover: { label: 'Voiceover', short: 'Voiceover', tone: 'bg-foreground/55' },
	'avatar-portrait': { label: 'Avatar portrait', short: 'Portraits', tone: 'bg-foreground/40' },
	'avatar-shot': { label: 'Avatar scene shot', short: 'Scene shots', tone: 'bg-foreground/30' },
	lipsync: { label: 'Lipsync', short: 'Lipsync', tone: 'bg-foreground/20' }
};
