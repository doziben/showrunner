import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Config, Scene } from '$lib/types';
import { STORYBOARD_SYSTEM_PROMPT } from './prompts';

const sceneSchema = z.object({
	type: z.enum(['avatar', 'broll']),
	audioLine: z.string().min(1),
	durationSeconds: z.number().int().positive().max(30),
	actionDescription: z.string().optional(),
	framing: z.enum(['medium', 'close-up', 'wide']).optional(),
	shotDescription: z.string().optional(),
	recordingInstructions: z.string().optional()
});

const storyboardSchema = z.object({
	scenes: z.array(sceneSchema).min(1)
});

export type StoryboardOutput = z.infer<typeof storyboardSchema>;

const STORYBOARD_MODEL_ID = 'claude-opus-4-7';
const GATEWAY_MODEL_ID = 'anthropic/claude-opus-4-7';

function getModel(config: Config) {
	if (config.useAiGateway) {
		if (!config.aiGatewayKey) throw new Error('AI Gateway key missing');
		const gateway = createGateway({ apiKey: config.aiGatewayKey });
		return gateway(GATEWAY_MODEL_ID);
	}
	if (!config.anthropicKey) throw new Error('Anthropic key missing');
	const anthropic = createAnthropic({
		apiKey: config.anthropicKey,
		headers: { 'anthropic-dangerous-direct-browser-access': 'true' }
	});
	return anthropic(STORYBOARD_MODEL_ID);
}

/**
 * Run the storyboard agent. Returns Scene[] ready for editing.
 * Caller is responsible for persisting to the project store.
 */
export async function generateStoryboard(config: Config, script: string): Promise<Scene[]> {
	if (!script.trim()) throw new Error('Script is empty');

	const model = getModel(config);

	const { object } = await generateObject({
		model,
		schema: storyboardSchema,
		system: STORYBOARD_SYSTEM_PROMPT,
		prompt: script.trim(),
		temperature: 0.7,
		maxRetries: 2
	});

	return object.scenes.map((s, index) => ({
		id: nanoid(),
		order: index,
		type: s.type,
		audioLine: s.audioLine,
		durationSeconds: s.durationSeconds,
		actionDescription: s.type === 'avatar' ? s.actionDescription : undefined,
		framing: s.type === 'avatar' ? s.framing : undefined,
		shotDescription: s.type === 'broll' ? s.shotDescription : undefined,
		recordingInstructions: s.type === 'broll' ? s.recordingInstructions : undefined,
		status: 'pending'
	}));
}
