/**
 * Reactive voice state for LiveKit voice channels.
 *
 * Tracks connection status, participants, mute/deafen, and connection
 * duration. Components bind to voiceState and react to changes.
 *
 * Uses a version counter for Map reactivity (Svelte 5 $state doesn't
 * deeply track Map/Set mutations). Scalar fields use a $state object
 * for direct reactivity.
 */

export interface VoiceParticipant {
	nick: string;
	isSpeaking: boolean;
	isMuted: boolean;
	isDeafened: boolean;
}

// --- Internal storage for Map (non-reactive) ---
const _participants = new Map<string, VoiceParticipant>();
let _mapVersion = $state(0);

function notifyMap(): void {
	_mapVersion++;
}

// --- Scalar fields (these work fine with $state proxy) ---
interface VoiceScalars {
	isConnected: boolean;
	currentRoom: string | null;
	localMuted: boolean;
	localDeafened: boolean;
	connectDuration: number;
}

const _scalars: VoiceScalars = $state({
	isConnected: false,
	currentRoom: null,
	localMuted: false,
	localDeafened: false,
	connectDuration: 0,
});

/** Reactive voice state -- components read this directly. */
export const voiceState = {
	get isConnected() { return _scalars.isConnected; },
	set isConnected(v: boolean) { _scalars.isConnected = v; },
	get currentRoom() { return _scalars.currentRoom; },
	set currentRoom(v: string | null) { _scalars.currentRoom = v; },
	get participants() { void _mapVersion; return _participants; },
	get localMuted() { return _scalars.localMuted; },
	set localMuted(v: boolean) { _scalars.localMuted = v; },
	get localDeafened() { return _scalars.localDeafened; },
	set localDeafened(v: boolean) { _scalars.localDeafened = v; },
	get connectDuration() { return _scalars.connectDuration; },
	set connectDuration(v: number) { _scalars.connectDuration = v; },
};

/** Handle for the duration counter so we can cancel it. */
let durationTimer: ReturnType<typeof setInterval> | null = null;

/** Mark voice as connected to a room and start the duration counter. */
export function setConnected(room: string): void {
	_scalars.isConnected = true;
	_scalars.currentRoom = room;
	_scalars.connectDuration = 0;
	_participants.clear();
	notifyMap();

	stopDurationTimer();
	durationTimer = setInterval(() => {
		_scalars.connectDuration++;
	}, 1000);
}

/** Mark voice as disconnected and clear all state. */
export function setDisconnected(): void {
	_scalars.isConnected = false;
	_scalars.currentRoom = null;
	_participants.clear();
	_scalars.localMuted = false;
	_scalars.localDeafened = false;
	_scalars.connectDuration = 0;
	notifyMap();

	stopDurationTimer();
}

/** Toggle local microphone mute. */
export function toggleMute(): void {
	_scalars.localMuted = !_scalars.localMuted;
}

/** Whether the user was independently muted before deafening. */
let _wasMutedBeforeDeafen = false;

/** Toggle local deafen (also mutes when deafening, restores on undeafen). */
export function toggleDeafen(): void {
	_scalars.localDeafened = !_scalars.localDeafened;
	if (_scalars.localDeafened) {
		_wasMutedBeforeDeafen = _scalars.localMuted;
		_scalars.localMuted = true;
	} else {
		// Restore: only unmute if user wasn't independently muted before deafen
		_scalars.localMuted = _wasMutedBeforeDeafen;
	}
}

/** Add or update a participant in the voice channel. */
export function updateParticipant(
	nick: string,
	state: Partial<Omit<VoiceParticipant, 'nick'>>,
): void {
	const existing = _participants.get(nick);
	if (existing) {
		if (state.isSpeaking !== undefined) existing.isSpeaking = state.isSpeaking;
		if (state.isMuted !== undefined) existing.isMuted = state.isMuted;
		if (state.isDeafened !== undefined) existing.isDeafened = state.isDeafened;
	} else {
		_participants.set(nick, {
			nick,
			isSpeaking: state.isSpeaking ?? false,
			isMuted: state.isMuted ?? false,
			isDeafened: state.isDeafened ?? false,
		});
	}
	notifyMap();
}

/** Remove a participant from the voice channel. */
export function removeParticipant(nick: string): void {
	_participants.delete(nick);
	notifyMap();
}

/** Stop the duration counter. */
function stopDurationTimer(): void {
	if (durationTimer !== null) {
		clearInterval(durationTimer);
		durationTimer = null;
	}
}
