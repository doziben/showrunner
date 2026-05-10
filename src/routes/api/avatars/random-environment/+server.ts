import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGateway } from '@ai-sdk/gateway';
import { resolveKey } from '$lib/server/keys';
import { RANDOM_ENVIRONMENT_SYSTEM_PROMPT } from '$lib/pipeline/prompts';

const MODEL_ID = 'claude-opus-4-7';
const GATEWAY_MODEL_ID = 'anthropic/claude-opus-4-7';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		recentEnvironments?: string[];
		useGateway?: boolean;
	};

	const useGateway = body.useGateway !== false;
	const provider = useGateway ? 'gateway' : 'anthropic';
	const apiKey = resolveKey(provider, request);
	if (!apiKey) {
		return json(
			{ error: `No ${provider} key. Set the env var or provide one in onboarding.` },
			{ status: 401 }
		);
	}

	const recent = (body.recentEnvironments ?? []).slice(0, 5);
	const recentBlock = recent.length > 0 ? recent.map((e) => `- ${e}`).join('\n') : '- (none yet)';
	const systemPrompt = RANDOM_ENVIRONMENT_SYSTEM_PROMPT.replace('{recent_environments}', recentBlock);

	try {
		const model = useGateway
			? createGateway({ apiKey })(GATEWAY_MODEL_ID)
			: createAnthropic({ apiKey })(MODEL_ID);

		const result = await generateText({
			model,
			system: systemPrompt,
			prompt: 'Generate the setup now.',
			temperature: 0.9,
			maxRetries: 2
		});

		const description = result.text.trim().replace(/^["']|["']$/g, '');
		const usage = (result.usage ?? {}) as {
			inputTokens?: number;
			outputTokens?: number;
			promptTokens?: number;
			completionTokens?: number;
		};

		return json({
			description,
			usage: {
				inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
				outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0
			},
			model: useGateway ? GATEWAY_MODEL_ID : MODEL_ID,
			provider
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
