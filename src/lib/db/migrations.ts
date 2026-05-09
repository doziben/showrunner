/*
 * Schema versions live alongside the Dexie definition in ./index.ts.
 * Future versions: bump the version number and call .upgrade() with a transformer.
 *
 * Example for a future v2:
 *   db.version(2).stores({ avatars: 'id, createdAt, voiceId, archivedAt' })
 *     .upgrade(tx => tx.table('avatars').toCollection().modify(a => { a.archivedAt = null }));
 */
export {};
