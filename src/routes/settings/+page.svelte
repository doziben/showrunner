<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { configStore } from '$lib/stores/config';
	import ApiKeyInput from '$lib/components/ApiKeyInput.svelte';
	import VoiceRow from '$lib/components/VoiceRow.svelte';
	import {
		testAiGateway,
		testAnthropic,
		testReplicate,
		testElevenLabs,
		testFal,
		type TestResult
	} from '$lib/pipeline/test-connections';
	import type { Voice } from '$lib/types';
	import { nanoid } from 'nanoid';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
	import Trash from '@lucide/svelte/icons/trash-2';

	const config = $derived($configStore.config);

	let useAiGateway = $state(true);
	let aiGatewayKey = $state('');
	let anthropicKey = $state('');
	let replicateKey = $state('');
	let elevenLabsKey = $state('');
	let falKey = $state('');
	let voices = $state<Voice[]>([]);
	let modelKeyResult = $state<TestResult | null>(null);
	let saving = $state(false);
	let confirmingReset = $state(false);

	let initialized = $state(false);
	$effect(() => {
		if (!config || initialized) return;
		useAiGateway = config.useAiGateway;
		aiGatewayKey = config.aiGatewayKey ?? '';
		anthropicKey = config.anthropicKey ?? '';
		replicateKey = config.replicateKey;
		elevenLabsKey = config.elevenLabsKey;
		falKey = config.falKey;
		voices = config.voices.map((v) => ({ ...v }));
		initialized = true;
	});

	function modelKeyTester(key: string) {
		return useAiGateway ? testAiGateway(key) : testAnthropic(key);
	}

	function addVoice() {
		voices = [...voices, { id: nanoid(), label: '', elevenLabsVoiceId: '' }];
	}
	function removeVoice(id: string) {
		voices = voices.filter((v) => v.id !== id);
	}
	function updateVoice(updated: Voice) {
		voices = voices.map((v) => (v.id === updated.id ? updated : v));
	}

	const validVoices = $derived(
		voices.filter((v) => v.label.trim() && v.elevenLabsVoiceId.trim())
	);

	async function save() {
		if (validVoices.length === 0) {
			toast.error('Keep at least one voice');
			return;
		}
		saving = true;
		try {
			await configStore.save({
				useAiGateway,
				aiGatewayKey: useAiGateway ? aiGatewayKey.trim() : undefined,
				anthropicKey: useAiGateway ? undefined : anthropicKey.trim(),
				replicateKey: replicateKey.trim(),
				elevenLabsKey: elevenLabsKey.trim(),
				falKey: falKey.trim(),
				voices: validVoices
			});
			toast.success('Settings saved');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save');
		} finally {
			saving = false;
		}
	}

	async function resetEverything() {
		await configStore.clear();
		confirmingReset = false;
		toast.success('Configuration cleared. Re-running onboarding.');
		window.location.href = '/onboarding';
	}
</script>

<div class="flex h-full flex-col">
	<PageHeader title="Settings">
		{#snippet actions()}
			<Button size="sm" onclick={save} disabled={saving} class="h-8">
				{saving ? 'Saving…' : 'Save changes'}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto w-full max-w-3xl px-6 py-10">
			<div class="space-y-10">
				<section class="flex flex-col gap-5">
					<header class="flex items-end justify-between border-b border-border pb-3">
						<div>
							<h2 class="text-[15px] font-medium">API keys</h2>
							<p class="mt-1 text-[12px] text-muted-foreground">
								Keys live in your browser only. Test each connection to confirm.
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 text-[11px]"
							onclick={() => {
								useAiGateway = !useAiGateway;
								modelKeyResult = null;
							}}
						>
							<RefreshCcw class="h-3 w-3" />
							{useAiGateway ? 'Use Anthropic direct' : 'Use AI Gateway'}
						</Button>
					</header>

					<div class="flex flex-col gap-5">
						{#if useAiGateway}
							<ApiKeyInput
								label="AI Gateway API key"
								value={aiGatewayKey}
								placeholder="vck_..."
								signupUrl="https://vercel.com/docs/ai-gateway"
								test={modelKeyTester}
								onChange={(v) => (aiGatewayKey = v)}
								onResult={(r) => (modelKeyResult = r)}
							/>
						{:else}
							<ApiKeyInput
								label="Anthropic API key"
								value={anthropicKey}
								placeholder="sk-ant-..."
								signupUrl="https://console.anthropic.com/settings/keys"
								test={modelKeyTester}
								onChange={(v) => (anthropicKey = v)}
								onResult={(r) => (modelKeyResult = r)}
							/>
						{/if}

						<ApiKeyInput
							label="Replicate API token"
							value={replicateKey}
							placeholder="r8_..."
							test={testReplicate}
							signupUrl="https://replicate.com/account/api-tokens"
							onChange={(v) => (replicateKey = v)}
							onResult={() => {}}
						/>

						<ApiKeyInput
							label="ElevenLabs API key"
							value={elevenLabsKey}
							placeholder="sk_..."
							test={testElevenLabs}
							signupUrl="https://elevenlabs.io/app/settings/api-keys"
							onChange={(v) => (elevenLabsKey = v)}
							onResult={() => {}}
						/>

						<ApiKeyInput
							label="fal.ai API key"
							value={falKey}
							placeholder="<uuid>:<secret>"
							test={testFal}
							signupUrl="https://fal.ai/dashboard/keys"
							onChange={(v) => (falKey = v)}
							onResult={() => {}}
						/>
					</div>
				</section>

				<section class="flex flex-col gap-4">
					<header class="flex items-end justify-between border-b border-border pb-3">
						<div>
							<h2 class="text-[15px] font-medium">Voices</h2>
							<p class="mt-1 text-[12px] text-muted-foreground">
								ElevenLabs voice IDs available to assign to avatars.
							</p>
						</div>
						<Button variant="outline" size="sm" onclick={addVoice} class="h-7 text-[11px]">
							<Plus class="h-3 w-3" />
							Add voice
						</Button>
					</header>
					<div class="flex flex-col gap-3">
						{#each voices as voice (voice.id)}
							<VoiceRow
								voice={voice}
								elevenLabsKey={elevenLabsKey.trim()}
								canRemove={voices.length > 1}
								onChange={updateVoice}
								onRemove={() => removeVoice(voice.id)}
							/>
						{/each}
					</div>
				</section>

				<section class="flex items-center justify-between border-t border-border pt-6">
					<div>
						<h3 class="text-[13px] font-medium">Reset configuration</h3>
						<p class="mt-1 text-[12px] text-muted-foreground">
							Clear API keys and voices. Avatars and projects stay.
						</p>
					</div>
					<Dialog.Root bind:open={confirmingReset}>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button variant="outline" size="sm" class="h-8 text-destructive" {...props}>
									<Trash class="h-3.5 w-3.5" />
									Reset
								</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Wipe configuration?</Dialog.Title>
								<Dialog.Description>
									This clears your API keys and voice library. Avatars and projects stay.
								</Dialog.Description>
							</Dialog.Header>
							<Dialog.Footer>
								<Button variant="ghost" size="sm" onclick={() => (confirmingReset = false)}>Cancel</Button>
								<Button variant="destructive" size="sm" onclick={resetEverything}>Reset</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</section>
			</div>
		</div>
	</div>
</div>
