/**
 * Reactive typing indicator state.
 *
 * Tracks which users are currently typing in each channel/DM target.
 * Typing state expires after TYPING_TIMEOUT_MS without a fresh signal.
 *
 * Uses a version counter for Map reactivity (Svelte 5 $state doesn't
 * deeply track Map/Set mutations).
 */

const TYPING_TIMEOUT_MS = 6_000;

// --- Internal storage (non-reactive) ---
const _channels = new Map<string, Map<string, number>>();
let _version = $state(0);

function notify(): void {
	_version++;
}

// Legacy export for direct access
export const typingState = {
	get channels() { void _version; return _channels; },
};

/** Mark a user as typing in a channel. Resets their expiry timer. */
export function setTyping(channel: string, nick: string): void {
	if (!_channels.has(channel)) {
		_channels.set(channel, new Map());
	}
	_channels.get(channel)!.set(nick, Date.now());
	notify();
}

/** Explicitly clear a user's typing state (e.g. on +typing=done or message sent). */
export function clearTyping(channel: string, nick: string): void {
	const channelMap = _channels.get(channel);
	if (channelMap) {
		channelMap.delete(nick);
		if (channelMap.size === 0) {
			_channels.delete(channel);
		}
		notify();
	}
}

/**
 * Get the list of nicks currently typing in a channel.
 * Filters out entries older than TYPING_TIMEOUT_MS and cleans them up.
 */
export function getTypingUsers(channel: string): string[] {
	void _version;
	const channelMap = _channels.get(channel);
	if (!channelMap) return [];

	const now = Date.now();
	const active: string[] = [];
	let changed = false;

	for (const [nick, timestamp] of channelMap) {
		if (now - timestamp < TYPING_TIMEOUT_MS) {
			active.push(nick);
		} else {
			channelMap.delete(nick);
			changed = true;
		}
	}

	if (channelMap.size === 0) {
		_channels.delete(channel);
		changed = true;
	}

	if (changed) {
		notify();
	}

	return active;
}

/** Reset all typing state. */
export function resetTyping(): void {
	_channels.clear();
	notify();
}
