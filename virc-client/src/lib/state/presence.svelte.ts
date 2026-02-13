/**
 * Reactive presence state for MONITOR online/offline tracking.
 *
 * Tracks which nicks are currently online based on MONITOR responses
 * (RPL_MONONLINE 730 / RPL_MONOFFLINE 731).
 *
 * Uses a version counter for Set reactivity (Svelte 5 $state doesn't
 * deeply track Map/Set mutations).
 */

// --- Internal storage (non-reactive) ---
const _online = new Set<string>();
let _version = $state(0);

function notify(): void {
	_version++;
}

// Legacy export for direct access
export const presenceState = {
	get online() { void _version; return _online; },
};

/** Mark nicks as online. */
export function setOnline(nicks: string[]): void {
	for (const nick of nicks) {
		_online.add(nick);
	}
	notify();
}

/** Mark nicks as offline. */
export function setOffline(nicks: string[]): void {
	for (const nick of nicks) {
		_online.delete(nick);
	}
	notify();
}

/** Check if a nick is online. */
export function isOnline(nick: string): boolean {
	void _version;
	return _online.has(nick);
}

/** Reset all presence state. */
export function resetPresence(): void {
	_online.clear();
	notify();
}
