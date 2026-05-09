import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { db } from '$lib/db';
import type { Config, Voice } from '$lib/types';

type ConfigState = {
	config: Config | null;
	loaded: boolean;
};

const initial: ConfigState = { config: null, loaded: false };

function createConfigStore() {
	const { subscribe, set, update } = writable<ConfigState>(initial);

	async function load() {
		if (!browser) return;
		const existing = await db.config.get('singleton');
		set({ config: existing ?? null, loaded: true });
	}

	async function save(partial: Omit<Config, 'id' | 'createdAt' | 'updatedAt'>) {
		const now = Date.now();
		const existing = await db.config.get('singleton');
		const next: Config = {
			id: 'singleton',
			...partial,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now
		};
		await db.config.put(next);
		set({ config: next, loaded: true });
		return next;
	}

	async function patch(patch: Partial<Omit<Config, 'id' | 'createdAt'>>) {
		const existing = await db.config.get('singleton');
		if (!existing) throw new Error('Config not initialized; complete onboarding first.');
		const next: Config = { ...existing, ...patch, updatedAt: Date.now() };
		await db.config.put(next);
		set({ config: next, loaded: true });
		return next;
	}

	async function clear() {
		await db.config.delete('singleton');
		set({ config: null, loaded: true });
	}

	function isComplete(c: Config | null): c is Config {
		if (!c) return false;
		const hasModelKey = c.useAiGateway ? !!c.aiGatewayKey : !!c.anthropicKey;
		return (
			hasModelKey && !!c.replicateKey && !!c.elevenLabsKey && !!c.falKey && c.voices.length > 0
		);
	}

	function findVoice(c: Config | null, voiceId: string): Voice | undefined {
		return c?.voices.find((v) => v.id === voiceId);
	}

	return { subscribe, load, save, patch, clear, isComplete, findVoice };
}

export const configStore = createConfigStore();
