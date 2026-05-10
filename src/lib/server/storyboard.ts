import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Scene } from '$lib/types';
import { STORYBOARD_SYSTEM_PROMPT } from '$lib/pipeline/prompts';

const sceneSchema = z.object({
	type: z.enum(['avatar', 'broll']),
	audioLine: z.string().min(1),
	durationSeconds: z.number().int().positive().max(30),
	actionDescription: z.string().optional(),
	framing: z
		.enum([
			'medium_direct',
			'close-up_direct',
			'medium_off-axis',
			'low_angle',
			'high_angle',
			'leaning_forward',
			'leaning_back'
		])
		.optional(),
	shotDescription: z.string().optional(),
	recordingInstructions: z.string().optional()
});

const storyboardSchema = z.object({
	scenes: z.array(sceneSchema).min(1)
});

const STORYBOARD_MODEL_ID = 'claude-opus-4-7';
const GATEWAY_MODEL_ID = 'anthropic/claude-opus-4-7';

export type StoryboardServerResult = {
	scenes: Scene[];
	usage: { inputTokens: number; outputTokens: number };
	model: string;
	provider: 'gateway' | 'anthropic';
};

export async function generateStoryboardServer(opts: {
	script: string;
	useGateway: boolean;
	apiKey: string;
}): Promise<StoryboardServerResult> {
	if (!opts.script.trim()) throw new Error('Script is empty');

	const model = opts.useGateway
		? createGateway({ apiKey: opts.apiKey })(GATEWAY_MODEL_ID)
		: createAnthropic({ apiKey: opts.apiKey })(STORYBOARD_MODEL_ID);

	const result = await generateObject({
		model,
		schema: storyboardSchema,
		system: STORYBOARD_SYSTEM_PROMPT,
		prompt: opts.script.trim(),
		temperature: 0.7,
		maxRetries: 2
	});

	const scenes: Scene[] = result.object.scenes.map((s, index) => ({
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

	const usage = (result.usage ?? {}) as {
		inputTokens?: number;
		outputTokens?: number;
		promptTokens?: number;
		completionTokens?: number;
	};

	return {
		scenes,
		usage: {
			inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
			outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0
		},
		model: opts.useGateway ? GATEWAY_MODEL_ID : STORYBOARD_MODEL_ID,
		provider: opts.useGateway ? 'gateway' : 'anthropic'
	};
}
