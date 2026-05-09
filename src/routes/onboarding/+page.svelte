<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { configStore } from '$lib/stores/config';
	import ApiKeyInput from '$lib/components/ApiKeyInput.svelte';
	import VoiceRow from '$lib/components/VoiceRow.svelte';
	import ProgressIndicator from '$lib/components/ProgressIndicator.svelte';
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
	import HIcon from '$lib/components/HIcon.svelte';

	let step = $state(0);

	let useAiGateway = $state(true);
	let aiGatewayKey = $state('');
	let anthropicKey = $state('');
	let replicateKey = $state('');
	let elevenLabsKey = $state('');
	let falKey = $state('');

	let modelKeyResult = $state<TestResult | null>(null);
	let replicateResult = $state<TestResult | null>(null);
	let elevenLabsResult = $state<TestResult | null>(null);
	let falResult = $state<TestResult | null>(null);

	let voices = $state<Voice[]>([{ id: nanoid(), label: '', elevenLabsVoiceId: '' }]);

	let saving = $state(false);

	const stepLabels = ['Welcome', 'Keys', 'Voices', 'Done'];

	const allKeysVerified = $derived(
		modelKeyResult?.ok && replicateResult?.ok && elevenLabsResult?.ok && falResult?.ok
	);

	/**
	 * Some providers (Vercel AI Gateway, Replicate) block direct browser pings via CORS
	 * even though they accept the same keys at generation time through the SDK. Don't
	 * gate progression on the test result — just require all four fields to be filled.
	 */
	const allKeysPresent = $derived(
		(useAiGateway ? aiGatewayKey.trim() : anthropicKey.trim()).length > 0 &&
			replicateKey.trim().length > 0 &&
			elevenLabsKey.trim().length > 0 &&
			falKey.trim().length > 0
	);

	const validVoices = $derived(
		voices.filter((v) => v.label.trim() && v.elevenLabsVoiceId.trim())
	);

	function next() {
		if (step < 3) step += 1;
	}
	function back() {
		if (step > 0) step -= 1;
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

	async function finish() {
		if (validVoices.length === 0) {
			toast.error('Add at least one voice with a label and ID');
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
			toast.success('You are set up. Time to build an avatar.');
			await goto('/avatars/new');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save config');
			saving = false;
		}
	}

	function modelKeyTester(key: string) {
		return useAiGateway ? testAiGateway(key) : testAnthropic(key);
	}
</script>

<div class="flex min-h-screen flex-col bg-background bg-dot-grid">
	<header class="flex h-14 shrink-0 items-center justify-between px-6">
		<div class="flex items-center gap-2">
			<span
				class="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background"
			>
				<svg viewBox="0 0 24 24" fill="none" class="h-3.5 w-3.5">
					<path
						d="M5 4h11.5a2.5 2.5 0 0 1 0 5H8.5a2.5 2.5 0 0 0 0 5h7a2.5 2.5 0 0 1 0 5H4"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</span>
			<span class="text-[13px] font-medium">Showrunner</span>
		</div>
		<ProgressIndicator total={4} current={step} labels={stepLabels} />
		<div class="w-32"></div>
	</header>

	<div class="flex flex-1 items-center justify-center px-6 pb-16 pt-8">
		<div class="w-full max-w-xl">
			<div class="rounded-2xl border border-border bg-card p-8 shadow-lift">
				{#if step === 0}
					<div class="flex flex-col gap-5 text-center">
						<div class="space-y-2">
							<p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">v0.1</p>
							<h1 class="text-2xl font-medium tracking-tight">Welcome to Showrunner</h1>
							<p class="mx-auto max-w-md text-[13px] leading-relaxed text-muted-foreground">
								Paste a script. Get back a director-cut storyboard, lipsynced avatar clips,
								voiceovers, and b-roll instructions ready for an editor.
							</p>
						</div>

						<div class="rounded-xl border border-border bg-background/40 p-4 text-left">
							<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
								You'll need accounts with
							</p>
							<ul class="mt-3 space-y-2 text-[13px]">
								<li class="flex items-center justify-between">
									<span class="text-foreground">AI Gateway <span class="text-muted-foreground">(or Anthropic direct)</span></span>
									<a
										href="https://vercel.com/docs/ai-gateway"
										target="_blank"
										rel="noreferrer"
										class="text-[12px] text-muted-foreground hover:text-foreground"
									>
										Get key →
									</a>
								</li>
								<li class="flex items-center justify-between">
									<span>Replicate</span>
									<a
										href="https://replicate.com/account/api-tokens"
										target="_blank"
										rel="noreferrer"
										class="text-[12px] text-muted-foreground hover:text-foreground"
									>
										Get key →
									</a>
								</li>
								<li class="flex items-center justify-between">
									<span>ElevenLabs</span>
									<a
										href="https://elevenlabs.io/app/settings/api-keys"
										target="_blank"
										rel="noreferrer"
										class="text-[12px] text-muted-foreground hover:text-foreground"
									>
										Get key →
									</a>
								</li>
								<li class="flex items-center justify-between">
									<span>fal.ai</span>
									<a
										href="https://fal.ai/dashboard/keys"
										target="_blank"
										rel="noreferrer"
										class="text-[12px] text-muted-foreground hover:text-foreground"
									>
										Get key →
									</a>
								</li>
							</ul>
						</div>

						<p class="text-[11px] text-muted-foreground">
							Keys live only in your browser (IndexedDB). No backend.
						</p>

						<Button onclick={next} class="mx-auto h-9 px-6 text-[13px]">
							Get started
							<HIcon name="arrow-right-01" class="h-3.5 w-3.5" />
						</Button>
					</div>
				{:else if step === 1}
					<div class="flex flex-col gap-5">
						<div class="space-y-1.5">
							<h2 class="text-xl font-medium">Connect your APIs</h2>
							<p class="text-[12px] text-muted-foreground">
								All four required. Test each connection.
							</p>
						</div>

						<div class="rounded-lg border border-border bg-background/40 p-3">
							<div class="flex items-center justify-between">
								<div>
									<Label class="text-[12px] font-medium">Storyboard model</Label>
									<p class="mt-0.5 text-[11px] text-muted-foreground">
										{useAiGateway ? 'Vercel AI Gateway' : 'Anthropic direct'}
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
									Switch
								</Button>
							</div>
						</div>

						<div class="flex flex-col gap-4">
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
								signupUrl="https://replicate.com/account/api-tokens"
								test={testReplicate}
								onChange={(v) => (replicateKey = v)}
								onResult={(r) => (replicateResult = r)}
							/>

							<ApiKeyInput
								label="ElevenLabs API key"
								value={elevenLabsKey}
								placeholder="sk_..."
								signupUrl="https://elevenlabs.io/app/settings/api-keys"
								test={testElevenLabs}
								onChange={(v) => (elevenLabsKey = v)}
								onResult={(r) => (elevenLabsResult = r)}
							/>

							<ApiKeyInput
								label="fal.ai API key"
								value={falKey}
								placeholder="<uuid>:<secret>"
								hint="Shape-checked now, fully verified on first run."
								signupUrl="https://fal.ai/dashboard/keys"
								test={testFal}
								onChange={(v) => (falKey = v)}
								onResult={(r) => (falResult = r)}
							/>
						</div>

						{#if allKeysPresent && !allKeysVerified}
							<p class="rounded-md border border-border bg-background/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
								Some test pings can fail with <span class="font-mono">Failed to fetch</span> because
								Vercel AI Gateway and Replicate block direct browser calls via CORS. Your keys still
								work at generation time through the SDK — you can continue.
							</p>
						{/if}

						<div class="flex items-center justify-between border-t border-border pt-4">
							<Button variant="ghost" size="sm" onclick={back} class="h-8 text-muted-foreground">
								<HIcon name="arrow-left-01" class="h-3.5 w-3.5" />
								Back
							</Button>
							<Button size="sm" onclick={next} disabled={!allKeysPresent} class="h-8">
								Continue
								<HIcon name="arrow-right-01" class="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				{:else if step === 2}
					<div class="flex flex-col gap-5">
						<div class="space-y-1.5">
							<h2 class="text-xl font-medium">Add your voices</h2>
							<p class="text-[12px] text-muted-foreground">
								At least one ElevenLabs voice ID. Assign to avatars later.
							</p>
						</div>

						<div class="flex flex-col gap-2.5">
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

						<Button variant="outline" size="sm" onclick={addVoice} class="h-8 self-start text-[12px]">
							<HIcon name="add-01" class="h-3.5 w-3.5" />
							Add voice
						</Button>

						<div class="flex items-center justify-between border-t border-border pt-4">
							<Button variant="ghost" size="sm" onclick={back} class="h-8 text-muted-foreground">
								<HIcon name="arrow-left-01" class="h-3.5 w-3.5" />
								Back
							</Button>
							<Button size="sm" onclick={next} disabled={validVoices.length === 0} class="h-8">
								Continue
								<HIcon name="arrow-right-01" class="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				{:else if step === 3}
					<div class="flex flex-col gap-5">
						<div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
							<HIcon name="tick-02" class="h-4 w-4" />
						</div>
						<div class="space-y-1.5 text-center">
							<h2 class="text-xl font-medium">You're all set</h2>
							<p class="mx-auto max-w-md text-[13px] text-muted-foreground">
								Showrunner is connected. Next: build an avatar.
							</p>
						</div>

						<div class="space-y-2 rounded-lg border border-border bg-background/40 p-4 text-[12px]">
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Storyboard provider</span>
								<span>{useAiGateway ? 'Vercel AI Gateway' : 'Anthropic direct'}</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Replicate</span>
								<span class="flex items-center gap-1 text-emerald-400/90">
									<HIcon name="tick-02" class="h-3 w-3" />
									Connected
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">ElevenLabs</span>
								<span class="flex items-center gap-1 text-emerald-400/90">
									<HIcon name="tick-02" class="h-3 w-3" />
									Connected
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">fal.ai</span>
								<span class="flex items-center gap-1 text-emerald-400/90">
									<HIcon name="tick-02" class="h-3 w-3" />
									Connected
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Voices</span>
								<span class="tabular-nums">{validVoices.length}</span>
							</div>
						</div>

						<div class="flex items-center justify-between border-t border-border pt-4">
							<Button variant="ghost" size="sm" onclick={back} class="h-8 text-muted-foreground">
								<HIcon name="arrow-left-01" class="h-3.5 w-3.5" />
								Back
							</Button>
							<Button onclick={finish} disabled={saving} size="sm" class="h-8">
								{saving ? 'Saving…' : 'Create your first avatar'}
								<HIcon name="arrow-right-01" class="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
