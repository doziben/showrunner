import Dexie, { type EntityTable } from 'dexie';
import type { Avatar, Config, Project, Transaction } from '$lib/types';

const LEGACY_FRAMING_MAP: Record<string, string> = {
	medium: 'medium_direct',
	'close-up': 'close-up_direct',
	wide: 'medium_direct'
};

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
		// v3 — adds avatar.environmentDescription/recentEnvironments and project
		// avatarVariant fields. Backfills existing rows so the new pipeline can
		// run against pre-v3 data without per-call fallbacks.
		this.version(3)
			.stores({
				config: 'id',
				avatars: 'id, createdAt, voiceId',
				projects: 'id, createdAt, updatedAt, avatarId, status',
				transactions: 'id, timestamp, projectId, avatarId, kind, provider, status'
			})
			.upgrade(async (tx) => {
				const avatarsTable = tx.table('avatars');
				const projectsTable = tx.table('projects');

				await avatarsTable.toCollection().modify((a: Avatar) => {
					if (typeof a.environmentDescription !== 'string') {
						a.environmentDescription = '';
					}
					if (!Array.isArray(a.recentEnvironments)) {
						a.recentEnvironments = [];
					}
				});

				const avatarsById = new Map<string, Avatar>();
				for (const a of await avatarsTable.toArray()) avatarsById.set(a.id, a);

				await projectsTable.toCollection().modify((p: Project) => {
					const avatar = avatarsById.get(p.avatarId);
					const fallbackEnv = avatar?.environmentDescription ?? '';
					const fallbackRef = avatar?.referenceImageBase64 ?? '';

					if (!p.avatarVariantMode) p.avatarVariantMode = 'default';
					if (typeof p.avatarVariantDescription !== 'string') {
						p.avatarVariantDescription = fallbackEnv;
					}
					if (typeof p.avatarVariantReferenceImage !== 'string' || !p.avatarVariantReferenceImage) {
						p.avatarVariantReferenceImage = fallbackRef;
					}

					if (Array.isArray(p.scenes)) {
						for (const s of p.scenes) {
							const legacy = s.framing as unknown as string | undefined;
							if (legacy && LEGACY_FRAMING_MAP[legacy]) {
								s.framing = LEGACY_FRAMING_MAP[legacy] as Project['scenes'][number]['framing'];
							}
						}
					}
				});
			});
	}
}

export const db = new ShowrunnerDB();
