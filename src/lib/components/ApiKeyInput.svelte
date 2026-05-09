<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import HIcon from '$lib/components/HIcon.svelte';
	import type { TestResult } from '$lib/pipeline/test-connections';

	interface Props {
		label: string;
		value: string;
		placeholder?: string;
		hint?: string;
		signupUrl?: string;
		test: (key: string) => Promise<TestResult>;
		onChange: (value: string) => void;
		onResult: (result: TestResult | null) => void;
	}

	let {
		label,
		value,
		placeholder = '',
		hint,
		signupUrl,
		test,
		onChange,
		onResult
	}: Props = $props();

	let revealed = $state(false);
	let testing = $state(false);
	let result = $state<TestResult | null>(null);

	async function runTest() {
		if (!value.trim()) return;
		testing = true;
		result = null;
		onResult(null);
		try {
			const r = await test(value.trim());
			result = r;
			onResult(r);
		} finally {
			testing = false;
		}
	}

	function handleInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		onChange(v);
		if (result) {
			result = null;
			onResult(null);
		}
	}
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-center justify-between">
		<Label class="text-[12px] font-medium">{label}</Label>
		{#if signupUrl}
			<a
				href={signupUrl}
				target="_blank"
				rel="noreferrer"
				class="text-[11px] text-muted-foreground hover:text-foreground"
			>
				Get key →
			</a>
		{/if}
	</div>
	<div class="flex items-stretch gap-1.5">
		<div class="relative flex-1">
			<Input
				type={revealed ? 'text' : 'password'}
				value={value}
				oninput={handleInput}
				placeholder={placeholder}
				autocomplete="off"
				spellcheck={false}
				class="h-9 pr-9 font-mono text-[12px]"
			/>
			<button
				type="button"
				onclick={() => (revealed = !revealed)}
				class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label={revealed ? 'Hide' : 'Show'}
			>
				{#if revealed}
					<HIcon name="view-off-slash" class="h-3.5 w-3.5" />
				{:else}
					<HIcon name="eye" class="h-3.5 w-3.5" />
				{/if}
			</button>
		</div>
		<Button
			variant="outline"
			size="sm"
			onclick={runTest}
			disabled={!value.trim() || testing}
			class="h-9 min-w-[88px] text-[12px]"
		>
			{#if testing}
				<HIcon name="loading-03" class="h-3.5 w-3.5 animate-spin" />
				Testing
			{:else if result?.ok}
				<HIcon name="tick-02" class="h-3.5 w-3.5 text-emerald-400" />
				Verified
			{:else}
				Test
			{/if}
		</Button>
	</div>
	{#if hint && !result}
		<p class="text-[11px] text-muted-foreground">{hint}</p>
	{/if}
	{#if result?.ok}
		<p class="flex items-center gap-1 text-[11px] text-emerald-400/90">
			<HIcon name="tick-02" class="h-3 w-3" />
			{result.message}
		</p>
	{:else if result && !result.ok}
		<p class="flex items-start gap-1 text-[11px] text-destructive">
			<HIcon name="cancel-01" class="mt-0.5 h-3 w-3 shrink-0" />
			<span>{result.message}</span>
		</p>
	{/if}
</div>
