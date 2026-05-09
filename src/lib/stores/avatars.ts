import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { nanoid } from 'nanoid';
import { db } from '$lib/db';
import type { Avatar } from '$lib/types';

type AvatarState = {
	avatars: Avatar[];
	loaded: boolean;
};

function createAvatarStore() {
	const { subscribe, set, update } = writable<AvatarState>({ avatars: [], loaded: false });

	async function load() {
		if (!browser) return;
		const all = await db.avatars.orderBy('createdAt').reverse().toArray();
		set({ avatars: all, loaded: true });
	}

	async function create(input: Omit<Avatar, 'id' | 'createdAt'>) {
		const next: Avatar = { id: nanoid(), createdAt: Date.now(), ...input };
		await db.avatars.put(next);
		update((s) => ({ avatars: [next, ...s.avatars], loaded: true }));
		return next;
	}

	async function get(id: string) {
		return db.avatars.get(id);
	}

	async function patch(id: string, partial: Partial<Avatar>) {
		const existing = await db.avatars.get(id);
		if (!existing) throw new Error(`Avatar ${id} not found`);
		const next = { ...existing, ...partial };
		await db.avatars.put(next);
		update((s) => ({
			avatars: s.avatars.map((a) => (a.id === id ? next : a)),
			loaded: true
		}));
		return next;
	}

	async function remove(id: string) {
		await db.avatars.delete(id);
		update((s) => ({ avatars: s.avatars.filter((a) => a.id !== id), loaded: true }));
	}

	return { subscribe, load, create, get, patch, remove };
}

export const avatarStore = createAvatarStore();
