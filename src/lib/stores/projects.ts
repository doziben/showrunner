import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { nanoid } from 'nanoid';
import { db } from '$lib/db';
import { toPlain } from '$lib/helpers/clone';
import type { LipsyncProvider, Project, Scene } from '$lib/types';
import { DEFAULT_LIPSYNC_PROVIDER } from '$lib/pipeline/lipsync-models';

type ProjectState = {
	projects: Project[];
	loaded: boolean;
};

function createProjectStore() {
	const { subscribe, set, update } = writable<ProjectState>({ projects: [], loaded: false });

	async function load() {
		if (!browser) return;
		const all = await db.projects.orderBy('updatedAt').reverse().toArray();
		set({ projects: all, loaded: true });
	}

	async function create(input: {
		name: string;
		avatarId: string;
		script: string;
		lipsyncProvider?: LipsyncProvider;
	}) {
		const now = Date.now();
		const next: Project = toPlain({
			id: nanoid(),
			name: input.name,
			avatarId: input.avatarId,
			script: input.script,
			scenes: [],
			status: 'draft',
			lipsyncProvider: input.lipsyncProvider ?? DEFAULT_LIPSYNC_PROVIDER,
			createdAt: now,
			updatedAt: now
		});
		await db.projects.put(next);
		update((s) => ({ projects: [next, ...s.projects], loaded: true }));
		return next;
	}

	async function get(id: string) {
		return db.projects.get(id);
	}

	async function patch(id: string, partial: Partial<Project>) {
		const existing = await db.projects.get(id);
		if (!existing) throw new Error(`Project ${id} not found`);
		const next: Project = toPlain({ ...existing, ...partial, updatedAt: Date.now() });
		await db.projects.put(next);
		update((s) => ({
			projects: s.projects.map((p) => (p.id === id ? next : p)),
			loaded: true
		}));
		return next;
	}

	async function setScenes(id: string, scenes: Scene[]) {
		return patch(id, { scenes });
	}

	async function patchScene(id: string, sceneId: string, partial: Partial<Scene>) {
		const existing = await db.projects.get(id);
		if (!existing) throw new Error(`Project ${id} not found`);
		const scenes = existing.scenes.map((s) => (s.id === sceneId ? { ...s, ...partial } : s));
		return patch(id, { scenes });
	}

	async function remove(id: string) {
		await db.projects.delete(id);
		update((s) => ({ projects: s.projects.filter((p) => p.id !== id), loaded: true }));
	}

	return { subscribe, load, create, get, patch, setScenes, patchScene, remove };
}

export const projectStore = createProjectStore();
