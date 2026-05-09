/**
 * Strip Svelte 5 reactive proxies (and any other non-cloneable wrappers) from
 * an object before handing it to IndexedDB. The structured-clone algorithm
 * IndexedDB uses chokes on Proxy objects with `DataCloneError`.
 *
 * JSON round-trip is fine for our data — everything we persist is composed of
 * strings, numbers, booleans, base64 data URLs, and plain arrays/objects of
 * those. No Dates, Maps, Sets, Blobs, or class instances.
 */
export function toPlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}
