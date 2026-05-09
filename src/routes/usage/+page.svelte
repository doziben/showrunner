<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import { transactionStore } from '$lib/stores/transactions';
	import { projectStore } from '$lib/stores/projects';
	import { fmtUsd } from '$lib/helpers/cost';
	import {
		KIND_META,
		spendByDay,
		spendByDayStacked,
		spendByKind,
		spendByProject,
		spendByProvider,
		spendInRange,
		totalSpend
	} from '$lib/helpers/transactions';
	import type { Transaction, TxKind, TxProvider } from '$lib/types';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import HIcon from '$lib/components/HIcon.svelte';

	type Range = '7d' | '30d' | '90d' | 'all';

	let range = $state<Range>('30d');
	let kindFilter = $state<TxKind | 'all'>('all');
	let confirmingClear = $state(false);

	const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, all: 365 };
	const DAY = 86_400_000;

	const allTxs = $derived($transactionStore.transactions);
	const successTxs = $derived(allTxs.filter((t) => t.status === 'success'));

	const rangeMs = $derived(RANGE_DAYS[range] * DAY);

	const inRange = $derived(
		range === 'all'
			? successTxs
			: successTxs.filter((t) => t.timestamp >= Date.now() - rangeMs)
	);

	const filtered = $derived(
		kindFilter === 'all' ? inRange : inRange.filter((t) => t.kind === kindFilter)
	);

	// KPIs
	const lifetime = $derived(totalSpend(successTxs));
	const last30 = $derived(spendInRange(successTxs, 30 * DAY));
	const last7 = $derived(spendInRange(successTxs, 7 * DAY));
	const today = $derived(spendInRange(successTxs, 1 * DAY));

	// Sparklines (30-day daily totals)
	const sparkBuckets = $derived(spendByDay(successTxs, 30));
	const sparkValues = $derived(sparkBuckets.map((b) => b.total));

	// Trend (in current range)
	const trendBuckets = $derived(spendByDayStacked(successTxs, RANGE_DAYS[range]));
	const trendTotal = $derived(trendBuckets.reduce((s, b) => s + b.total, 0));

	// Breakdowns (in current range)
	const byKind = $derived(spendByKind(inRange));
	const byKindOrdered = $derived(
		(['storyboard', 'voiceover', 'avatar-portrait', 'avatar-shot', 'lipsync'] as TxKind[])
			.map((k) => ({ kind: k, value: byKind[k] }))
			.sort((a, b) => b.value - a.value)
	);

	const byProvider = $derived(spendByProvider(inRange));
	const providerOrdered = $derived(
		(['replicate', 'fal', 'elevenlabs', 'gateway', 'anthropic'] as TxProvider[])
			.map((p) => ({ provider: p, value: byProvider[p] }))
			.filter((r) => r.value > 0)
			.sort((a, b) => b.value - a.value)
	);

	// Top projects
	const projectCosts = $derived(spendByProject(successTxs));
	const projectsRanked = $derived(
		$projectStore.projects
			.map((p) => {
				const projectTxs = successTxs.filter((t) => t.projectId === p.id);
				const spark = spendByDay(projectTxs, 30).map((b) => b.total);
				return {
					project: p,
					total: projectCosts.get(p.id) ?? 0,
					spark
				};
			})
			.sort((a, b) => b.total - a.total)
	);

	// Avg per project (lifetime, only projects that incurred cost)
	const billedProjects = $derived(projectsRanked.filter((p) => p.total > 0));
	const avgPerProject = $derived(
		billedProjects.length === 0
			? 0
			: billedProjects.reduce((s, p) => s + p.total, 0) / billedProjects.length
	);

	const recent = $derived(filtered.slice(0, 50));

	function formatRelative(ts: number): string {
		const diff = Date.now() - ts;
		const minutes = Math.floor(diff / 60_000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function projectName(id?: string) {
		if (!id) return '—';
		return $projectStore.projects.find((p) => p.id === id)?.name ?? 'Deleted';
	}

	function kindMaxValue(values: { value: number }[]): number {
		return Math.max(...values.map((v) => v.value), 0.001);
	}

	function exportCsv() {
		const headers = [
			'timestamp',
			'date',
			'project',
			'kind',
			'provider',
			'model',
			'quantity',
			'unit',
			'cost_usd',
			'status',
			'notes'
		];
		const rows = allTxs.map((t) => [
			t.timestamp,
			new Date(t.timestamp).toISOString(),
			projectName(t.projectId),
			t.kind,
			t.provider,
			t.model,
			t.quantity,
			t.unit,
			t.costUsd.toFixed(6),
			t.status,
			(t.notes ?? '').replace(/"/g, '""').replace(/\n/g, ' ')
		]);
		const csv = [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `showrunner-usage-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success('Exported to CSV');
	}

	function csvCell(v: string | number): string {
		const s = String(v);
		if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
		return s;
	}

	async function clearLog() {
		await transactionStore.clearAll();
		confirmingClear = false;
		toast.success('Transaction log cleared');
	}

	const RANGE_OPTIONS: { id: Range; label: string }[] = [
		{ id: '7d', label: '7d' },
		{ id: '30d', label: '30d' },
		{ id: '90d', label: '90d' },
		{ id: 'all', label: 'All' }
	];
</script>

<div class="flex h-full flex-col">
	<PageHeader title="Usage">
		{#snippet actions()}
			<div class="flex items-center rounded-md border border-border bg-card p-0.5">
				{#each RANGE_OPTIONS as opt}
					<button
						type="button"
						onclick={() => (range = opt.id)}
						class={cn(
							'h-7 rounded px-2.5 text-[12px] tabular-nums transition-colors',
							range === opt.id
								? 'bg-foreground text-background'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
			<Button variant="ghost" size="sm" class="h-8 text-muted-foreground" onclick={exportCsv}>
				<HIcon name="download-01" class="h-3.5 w-3.5" />
				Export CSV
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex-1 overflow-y-auto px-6 py-6">
		<div class="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
			<!-- KPI strip -->
			<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
					<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Lifetime spend</p>
					<p class="font-display text-2xl tabular-nums">{fmtUsd(lifetime)}</p>
					<Sparkline
						values={sparkValues}
						width={140}
						height={28}
						stroke="hsl(var(--foreground))"
						fill="hsl(var(--foreground) / 0.08)"
						class="-mx-1 mt-auto text-foreground"
					/>
				</div>
				<div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
					<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Last 30 days</p>
					<p class="font-display text-2xl tabular-nums">{fmtUsd(last30)}</p>
					<p class="mt-auto text-[11px] text-muted-foreground">
						{successTxs.filter((t) => t.timestamp >= Date.now() - 30 * DAY).length} transactions
					</p>
				</div>
				<div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
					<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Last 7 days</p>
					<p class="font-display text-2xl tabular-nums">{fmtUsd(last7)}</p>
					<p class="mt-auto text-[11px] text-muted-foreground">
						{fmtUsd(today)} today
					</p>
				</div>
				<div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
					<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Avg per project</p>
					<p class="font-display text-2xl tabular-nums">{fmtUsd(avgPerProject)}</p>
					<p class="mt-auto text-[11px] text-muted-foreground">
						across {billedProjects.length} projects
					</p>
				</div>
			</section>

			<!-- Trend + breakdowns -->
			<section class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
				<div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Spend over time</p>
							<p class="mt-1 font-display text-xl tabular-nums">{fmtUsd(trendTotal)}</p>
						</div>
						<div class="flex items-center gap-2 text-[11px] text-muted-foreground">
							<HIcon name="analytics-up" class="h-3.5 w-3.5" />
							<span>{range === 'all' ? '365 days' : range}</span>
						</div>
					</div>
					{#if trendTotal > 0}
						<TrendChart buckets={trendBuckets} />
						<!-- Legend -->
						<div class="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
							{#each byKindOrdered.filter((b) => b.value > 0) as item}
								<div class="flex items-center gap-1.5">
									<span class={cn('h-2 w-2 rounded-sm', KIND_META[item.kind].tone)}></span>
									<span class="text-muted-foreground">{KIND_META[item.kind].short}</span>
									<span class="tabular-nums text-foreground">{fmtUsd(item.value)}</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex h-48 flex-col items-center justify-center gap-2 text-center">
							<p class="text-[13px] text-muted-foreground">No transactions in this range yet.</p>
							<p class="text-[11px] text-muted-foreground/70">
								Generate a project to see costs roll in here.
							</p>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-4">
					<!-- Spend by step -->
					<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
						<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">By step</p>
						{#if trendTotal === 0}
							<p class="py-6 text-center text-[12px] text-muted-foreground/70">No data</p>
						{:else}
							{@const max = kindMaxValue(byKindOrdered)}
							<div class="flex flex-col gap-2.5">
								{#each byKindOrdered as item}
									<button
										type="button"
										onclick={() => (kindFilter = kindFilter === item.kind ? 'all' : item.kind)}
										class="flex w-full flex-col gap-1 text-left transition-opacity hover:opacity-90"
									>
										<div class="flex items-center justify-between text-[12px]">
											<span
												class={cn(
													'flex items-center gap-1.5',
													kindFilter === item.kind ? 'text-foreground' : 'text-muted-foreground'
												)}
											>
												<span class={cn('h-2 w-2 rounded-sm', KIND_META[item.kind].tone)}></span>
												{KIND_META[item.kind].short}
											</span>
											<span class="tabular-nums text-foreground">{fmtUsd(item.value)}</span>
										</div>
										<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
											<div
												class={cn('h-full rounded-full', KIND_META[item.kind].tone)}
												style:width="{item.value === 0 ? 0 : (item.value / max) * 100}%"
											></div>
										</div>
									</button>
								{/each}
							</div>
							{#if kindFilter !== 'all'}
								<button
									type="button"
									class="self-start text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
									onclick={() => (kindFilter = 'all')}
								>
									Clear filter
								</button>
							{/if}
						{/if}
					</div>

					<!-- Spend by provider -->
					<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
						<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">By provider</p>
						{#if providerOrdered.length === 0}
							<p class="py-6 text-center text-[12px] text-muted-foreground/70">No data</p>
						{:else}
							<div class="flex flex-col gap-1.5">
								{#each providerOrdered as item}
									<div class="flex items-center justify-between text-[12px]">
										<span class="capitalize text-muted-foreground">{item.provider}</span>
										<span class="tabular-nums text-foreground">{fmtUsd(item.value)}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</section>

			<!-- Per-project table -->
			<section class="flex flex-col gap-3 rounded-xl border border-border bg-card">
				<header class="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
					<div>
						<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Top projects</p>
						<p class="mt-0.5 text-[12px] text-muted-foreground/70">Lifetime spend per project</p>
					</div>
				</header>
				{#if projectsRanked.filter((p) => p.total > 0).length === 0}
					<p class="px-5 py-8 text-center text-[12px] text-muted-foreground/70">
						No project costs yet.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
									<th class="px-5 py-2 text-left font-medium">Project</th>
									<th class="px-5 py-2 text-left font-medium">Trend (30d)</th>
									<th class="px-5 py-2 text-right font-medium">Lifetime</th>
								</tr>
							</thead>
							<tbody>
								{#each projectsRanked as row (row.project.id)}
									{#if row.total > 0}
										<tr
											class="cursor-pointer border-b border-border/40 text-[13px] transition-colors last:border-0 hover:bg-background/40"
											onclick={() => (window.location.href = `/projects/${row.project.id}/storyboard`)}
										>
											<td class="px-5 py-3 font-medium text-foreground">{row.project.name}</td>
											<td class="px-5 py-3">
												<Sparkline
													values={row.spark}
													width={120}
													height={20}
													stroke="hsl(var(--foreground) / 0.7)"
													class="text-foreground"
												/>
											</td>
											<td class="px-5 py-3 text-right tabular-nums">{fmtUsd(row.total)}</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<!-- Activity log -->
			<section class="flex flex-col rounded-xl border border-border bg-card">
				<header class="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
					<div>
						<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Activity</p>
						<p class="mt-0.5 text-[12px] text-muted-foreground/70">
							{filtered.length} transactions
							{#if kindFilter !== 'all'}
								· filtered by <span class="text-foreground">{KIND_META[kindFilter].short}</span>
							{/if}
						</p>
					</div>
					<Dialog.Root bind:open={confirmingClear}>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button
									variant="ghost"
									size="sm"
									class="h-7 text-[11px] text-muted-foreground hover:text-destructive"
									{...props}
								>
									<HIcon name="delete-02" class="h-3 w-3" />
									Clear log
								</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Clear all transactions?</Dialog.Title>
								<Dialog.Description>
									This wipes the entire usage log. Avatars and projects are unaffected. Past costs
									already incurred at the providers are not refunded — this only clears the local
									record.
								</Dialog.Description>
							</Dialog.Header>
							<Dialog.Footer>
								<Button variant="ghost" size="sm" onclick={() => (confirmingClear = false)}>
									Cancel
								</Button>
								<Button variant="destructive" size="sm" onclick={clearLog}>Clear</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</header>
				{#if recent.length === 0}
					<p class="px-5 py-10 text-center text-[12px] text-muted-foreground/70">
						No transactions yet.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-[12px]">
							<thead>
								<tr class="border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
									<th class="px-5 py-2 text-left font-medium">When</th>
									<th class="px-5 py-2 text-left font-medium">Project</th>
									<th class="px-5 py-2 text-left font-medium">Step</th>
									<th class="px-5 py-2 text-left font-medium">Model</th>
									<th class="px-5 py-2 text-right font-medium">Qty</th>
									<th class="px-5 py-2 text-right font-medium">Cost</th>
								</tr>
							</thead>
							<tbody>
								{#each recent as tx (tx.id)}
									<tr class="border-b border-border/40 last:border-0 hover:bg-background/40">
										<td class="whitespace-nowrap px-5 py-2.5 text-muted-foreground" title={new Date(tx.timestamp).toLocaleString()}>
											{formatRelative(tx.timestamp)}
										</td>
										<td class="px-5 py-2.5">
											{#if tx.projectId}
												<a
													href={`/projects/${tx.projectId}/storyboard`}
													class="text-foreground hover:underline"
												>
													{projectName(tx.projectId)}
												</a>
											{:else}
												<span class="text-muted-foreground/70">—</span>
											{/if}
										</td>
										<td class="px-5 py-2.5">
											<span class="flex items-center gap-1.5">
												<span class={cn('h-1.5 w-1.5 rounded-full', KIND_META[tx.kind].tone)}></span>
												<span>{KIND_META[tx.kind].short}</span>
											</span>
										</td>
										<td class="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">{tx.model}</td>
										<td class="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
											{tx.quantity} {tx.unit === 'images' ? (tx.quantity === 1 ? 'img' : 'imgs') : tx.unit === 'seconds' ? 's' : tx.unit === 'tokens' ? 'tok' : tx.unit}
										</td>
										<td class="px-5 py-2.5 text-right tabular-nums text-foreground">
											{fmtUsd(tx.costUsd)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>
