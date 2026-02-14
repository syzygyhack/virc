/**
 * Persistent app-wide settings store.
 *
 * Stores appearance preferences (zoom level, etc.). Persisted to
 * localStorage so settings survive app restarts.
 */

const STORAGE_KEY = 'virc:appSettings';

export type ZoomLevel = 100 | 125 | 150;

interface AppSettingsData {
	zoom: ZoomLevel;
}

const defaults: AppSettingsData = {
	zoom: 125,
};

function load(): AppSettingsData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			return { ...defaults, ...parsed };
		}
	} catch {
		// Corrupt data — reset to defaults
	}
	return { ...defaults };
}

const _state: AppSettingsData = $state(load());

function persist(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
	} catch {
		// Storage full or unavailable
	}
}

/** Reactive app settings — components read/write this directly. */
export const appSettings = {
	get zoom() { return _state.zoom; },
	set zoom(v: ZoomLevel) { _state.zoom = v; persist(); },
};
