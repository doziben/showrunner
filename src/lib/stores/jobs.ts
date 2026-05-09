import { writable } from 'svelte/store';

export type JobKind = 'voiceover' | 'avatar-image' | 'lipsync';

export interface Job {
	id: string;
	projectId: string;
	sceneId: string;
	kind: JobKind;
	status: 'queued' | 'running' | 'success' | 'failed';
	startedAt?: number;
	finishedAt?: number;
	errorMessage?: string;
	progress?: number;
}

type JobState = {
	jobs: Job[];
};

function createJobStore() {
	const { subscribe, set, update } = writable<JobState>({ jobs: [] });

	function upsert(job: Job) {
		update((s) => {
			const i = s.jobs.findIndex((j) => j.id === job.id);
			if (i === -1) return { jobs: [...s.jobs, job] };
			const next = [...s.jobs];
			next[i] = job;
			return { jobs: next };
		});
	}

	function clearForProject(projectId: string) {
		update((s) => ({ jobs: s.jobs.filter((j) => j.projectId !== projectId) }));
	}

	function reset() {
		set({ jobs: [] });
	}

	return { subscribe, upsert, clearForProject, reset };
}

export const jobStore = createJobStore();
