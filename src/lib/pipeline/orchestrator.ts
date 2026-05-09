import { db } from '$lib/db';
import { projectStore } from '$lib/stores/projects';
import { transactionStore } from '$lib/stores/transactions';
import { jobStore, type Job, type JobKind } from '$lib/stores/jobs';
import type { Avatar, Config, LipsyncProvider, Scene } from '$lib/types';
import { generateVoiceover } from './voiceover';
import { generateSceneShot } from './avatar-image';
import { generateLipsync } from './lipsync';
import { buildAvatarShotPrompt } from './prompts';
import { LIPSYNC_MODELS } from './lipsync-models';
import {
	costForAvatarImage,
	costForLipsync,
	costForVoiceover
} from '$lib/helpers/transactions';
import { nanoid } from 'nanoid';

type RunContext = {
	config: Config;
	avatar: Avatar;
};

const SCENE_CONCURRENCY = 2; // hammer providers gently
const MAX_ATTEMPTS = 3;

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
	let attempt = 0;
	let lastErr: unknown;
	while (attempt < MAX_ATTEMPTS) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			attempt += 1;
			if (attempt >= MAX_ATTEMPTS) break;
			const backoff = Math.min(2 ** attempt * 500, 4000);
			console.warn(`[orchestrator] ${label} attempt ${attempt} failed, retrying in ${backoff}ms`, e);
			await new Promise((r) => setTimeout(r, backoff));
		}
	}
	throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function getFreshScene(projectId: string, sceneId: string): Promise<Scene> {
	const proj = await db.projects.get(projectId);
	const scene = proj?.scenes.find((s) => s.id === sceneId);
	if (!scene) throw new Error(`Scene ${sceneId} not found`);
	return scene;
}

async function patchScene(projectId: string, sceneId: string, partial: Partial<Scene>) {
	await projectStore.patchScene(projectId, sceneId, partial);
}

function trackJob(projectId: string, sceneId: string, kind: JobKind): Job {
	const job: Job = {
		id: nanoid(),
		projectId,
		sceneId,
		kind,
		status: 'running',
		startedAt: Date.now()
	};
	jobStore.upsert(job);
	return job;
}

function finishJob(job: Job, status: 'success' | 'failed', errorMessage?: string) {
	jobStore.upsert({ ...job, status, finishedAt: Date.now(), errorMessage });
}

/**
 * Run the full pipeline for a single scene:
 *  - voiceover (always)
 *  - if avatar: per-scene image + lipsync
 *  - b-roll: stops after voiceover (user shoots the visual)
 */
async function runScene(projectId: string, sceneId: string, ctx: RunContext): Promise<void> {
	const initial = await getFreshScene(projectId, sceneId);
	if (!initial.audioLine.trim()) {
		await patchScene(projectId, sceneId, {
			status: 'failed',
			errorMessage: 'Audio line is empty'
		});
		return;
	}

	// 1. Voiceover.
	await patchScene(projectId, sceneId, { status: 'generating-voiceover', errorMessage: undefined });
	const voJob = trackJob(projectId, sceneId, 'voiceover');
	let voiceoverBase64: string;
	try {
		voiceoverBase64 = await withRetry('voiceover', () =>
			generateVoiceover({
				text: initial.audioLine,
				voiceId:
					ctx.config.voices.find((v) => v.id === ctx.avatar.voiceId)?.elevenLabsVoiceId ?? '',
				apiKey: ctx.config.elevenLabsKey
			})
		);
		finishJob(voJob, 'success');
		await transactionStore.record({
			projectId,
			avatarId: ctx.avatar.id,
			sceneId,
			kind: 'voiceover',
			provider: 'elevenlabs',
			model: 'eleven_v3',
			quantity: initial.durationSeconds,
			unit: 'seconds',
			costUsd: costForVoiceover(initial.durationSeconds),
			status: 'success'
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		finishJob(voJob, 'failed', msg);
		await patchScene(projectId, sceneId, { status: 'failed', errorMessage: `Voiceover: ${msg}` });
		return;
	}
	await patchScene(projectId, sceneId, { voiceoverBase64 });

	const fresh = await getFreshScene(projectId, sceneId);

	if (fresh.type === 'broll') {
		await patchScene(projectId, sceneId, { status: 'complete' });
		return;
	}

	// 2. Per-scene avatar image.
	await patchScene(projectId, sceneId, { status: 'generating-image' });
	const imgJob = trackJob(projectId, sceneId, 'avatar-image');
	let avatarImageBase64: string;
	try {
		const prompt = buildAvatarShotPrompt(ctx.avatar, fresh);
		avatarImageBase64 = await withRetry('avatar-image', () =>
			generateSceneShot({ avatar: ctx.avatar, prompt, apiKey: ctx.config.replicateKey })
		);
		finishJob(imgJob, 'success');
		await transactionStore.record({
			projectId,
			avatarId: ctx.avatar.id,
			sceneId,
			kind: 'avatar-shot',
			provider: 'replicate',
			model: 'openai/gpt-image-2',
			quantity: 1,
			unit: 'images',
			costUsd: costForAvatarImage(1),
			status: 'success'
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		finishJob(imgJob, 'failed', msg);
		await patchScene(projectId, sceneId, {
			status: 'failed',
			errorMessage: `Avatar image: ${msg}`
		});
		return;
	}
	await patchScene(projectId, sceneId, { avatarImageBase64 });

	// 3. Lipsync. Provider chosen at the project level (p-video / fabric / aurora).
	await patchScene(projectId, sceneId, { status: 'generating-lipsync' });
	const lipJob = trackJob(projectId, sceneId, 'lipsync');
	try {
		const project = await db.projects.get(projectId);
		const provider: LipsyncProvider = project?.lipsyncProvider ?? 'p-video';
		const lipsyncVideoBase64 = await withRetry('lipsync', () =>
			generateLipsync({
				provider,
				avatar: ctx.avatar,
				scene: fresh,
				imageDataUrl: avatarImageBase64,
				audioDataUrl: voiceoverBase64,
				config: ctx.config
			})
		);
		finishJob(lipJob, 'success');
		const modelInfo = LIPSYNC_MODELS[provider];
		await transactionStore.record({
			projectId,
			avatarId: ctx.avatar.id,
			sceneId,
			kind: 'lipsync',
			provider: modelInfo.provider,
			model: modelInfo.label,
			quantity: fresh.durationSeconds,
			unit: 'seconds',
			costUsd: costForLipsync(provider, fresh.durationSeconds),
			status: 'success'
		});
		await patchScene(projectId, sceneId, { lipsyncVideoBase64, status: 'complete' });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		finishJob(lipJob, 'failed', msg);
		await patchScene(projectId, sceneId, { status: 'failed', errorMessage: `Lipsync: ${msg}` });
	}
}

/**
 * Bounded-parallel runner. Runs all pending or failed scenes for the project.
 */
export async function runProjectPipeline(projectId: string, ctx: RunContext): Promise<void> {
	const project = await db.projects.get(projectId);
	if (!project) throw new Error(`Project ${projectId} not found`);

	jobStore.clearForProject(projectId);

	const scenesToRun = project.scenes.filter((s) => s.status !== 'complete');
	if (scenesToRun.length === 0) return;

	await projectStore.patch(projectId, { status: 'generating' });

	// Reset their status before starting.
	for (const scene of scenesToRun) {
		await patchScene(projectId, scene.id, { status: 'pending', errorMessage: undefined });
	}

	const queue = [...scenesToRun];
	const inflight = new Set<Promise<unknown>>();

	while (queue.length > 0 || inflight.size > 0) {
		while (inflight.size < SCENE_CONCURRENCY && queue.length > 0) {
			const next = queue.shift()!;
			const p = runScene(projectId, next.id, ctx).finally(() => inflight.delete(p));
			inflight.add(p);
		}
		if (inflight.size > 0) {
			await Promise.race(inflight);
		}
	}

	const finalProject = await db.projects.get(projectId);
	const failed = finalProject?.scenes.some((s) => s.status === 'failed');
	await projectStore.patch(projectId, { status: failed ? 'failed' : 'complete' });
}

/**
 * Re-run a single scene (used by the per-card retry button).
 */
export async function retryScene(projectId: string, sceneId: string, ctx: RunContext): Promise<void> {
	await patchScene(projectId, sceneId, { status: 'pending', errorMessage: undefined });
	await projectStore.patch(projectId, { status: 'generating' });
	await runScene(projectId, sceneId, ctx);
	const finalProject = await db.projects.get(projectId);
	const failed = finalProject?.scenes.some((s) => s.status === 'failed');
	await projectStore.patch(projectId, { status: failed ? 'failed' : 'complete' });
}
