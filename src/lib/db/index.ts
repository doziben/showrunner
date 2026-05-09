import Dexie, { type EntityTable } from 'dexie';
import type { Avatar, Config, Project, Transaction } from '$lib/types';

class ShowrunnerDB extends Dexie {
	config!: EntityTable<Config, 'id'>;
	avatars!: EntityTable<Avatar, 'id'>;
	projects!: EntityTable<Project, 'id'>;
	transactions!: EntityTable<Transaction, 'id'>;

	constructor() {
		super('showrunner');
		// v1 — initial schema
		this.version(1).stores({
			config: 'id',
			avatars: 'id, createdAt, voiceId',
			projects: 'id, createdAt, updatedAt, avatarId, status'
		});
		// v2 — adds transaction log for the usage dashboard
		this.version(2).stores({
			config: 'id',
			avatars: 'id, createdAt, voiceId',
			projects: 'id, createdAt, updatedAt, avatarId, status',
			transactions: 'id, timestamp, projectId, avatarId, kind, provider, status'
		});
	}
}

export const db = new ShowrunnerDB();
