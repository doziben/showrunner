import Dexie, { type EntityTable } from 'dexie';
import type { Avatar, Config, Project } from '$lib/types';

class ShowrunnerDB extends Dexie {
	config!: EntityTable<Config, 'id'>;
	avatars!: EntityTable<Avatar, 'id'>;
	projects!: EntityTable<Project, 'id'>;

	constructor() {
		super('showrunner');
		this.version(1).stores({
			config: 'id',
			avatars: 'id, createdAt, voiceId',
			projects: 'id, createdAt, updatedAt, avatarId, status'
		});
	}
}

export const db = new ShowrunnerDB();
