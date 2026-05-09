import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { nanoid } from 'nanoid';
import { db } from '$lib/db';
import { toPlain } from '$lib/helpers/clone';
import type { Transaction, TxInput } from '$lib/types';

type TxState = {
	transactions: Transaction[];
	loaded: boolean;
};

function createTransactionStore() {
	const { subscribe, set, update } = writable<TxState>({ transactions: [], loaded: false });

	async function load() {
		if (!browser) return;
		const all = await db.transactions.orderBy('timestamp').reverse().toArray();
		set({ transactions: all, loaded: true });
	}

	async function record(input: TxInput): Promise<Transaction> {
		const tx: Transaction = toPlain({
			id: nanoid(),
			timestamp: Date.now(),
			...input
		});
		await db.transactions.put(tx);
		update((s) => ({ transactions: [tx, ...s.transactions], loaded: true }));
		return tx;
	}

	async function clearAll() {
		await db.transactions.clear();
		set({ transactions: [], loaded: true });
	}

	async function clearForProject(projectId: string) {
		await db.transactions.where('projectId').equals(projectId).delete();
		update((s) => ({
			transactions: s.transactions.filter((t) => t.projectId !== projectId),
			loaded: true
		}));
	}

	return { subscribe, load, record, clearAll, clearForProject };
}

export const transactionStore = createTransactionStore();
