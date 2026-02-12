/**
 * Reactive voice state for LiveKit voice channels.
 *
 * Tracks connection status, participants, mute/deafen, and connection
 * duration. Components bind to `voiceState` and react to changes.
 */

export interface VoiceParticipant {
	nick: string;
	isSpeaking: boolean;
	isMuted: boolean;
	isDeafened: boolean;
}

interface VoiceStore {
	isConnected: boolean;
	currentRoom: string | null; // channel name
	participants: Map<string, VoiceParticipant>;
	localMuted: boolean;
	localDeafened: boolean;
	connectDuration: number; // seconds since connect
}

/** Reactive voice state -- components read this directly. */
export const voiceState: VoiceStore = $state({
	isConnected: false,
	currentRoom: null,
	participants: new Map(),
	localMuted: false,
	localDeafened: false,
	connectDuration: 0,
});

/** Handle for the duration counter so we can cancel it. */
let durationTimer: ReturnType<typeof setInterval> | null = null;

/** Mark voice as connected to a room and start the duration counter. */
export function setConnected(room: string): void {
	voiceState.isConnected = true;
	voiceState.currentRoom = room;
	voiceState.connectDuration = 0;
	voiceState.participants.clear();

	stopDurationTimer();
	durationTimer = setInterval(() => {
		voiceState.connectDuration++;
	}, 1000);
}

/** Mark voice as disconnected and clear all state. */
export function setDisconnected(): void {
	voiceState.isConnected = false;
	voiceState.currentRoom = null;
	voiceState.participants.clear();
	voiceState.localMuted = false;
	voiceState.localDeafened = false;
	voiceState.connectDuration = 0;

	stopDurationTimer();
}

/** Toggle local microphone mute. */
export function toggleMute(): void {
	voiceState.localMuted = !voiceState.localMuted;
}

/** Toggle local deafen (also mutes when deafening). */
export function toggleDeafen(): void {
	voiceState.localDeafened = !voiceState.localDeafened;
	if (voiceState.localDeafened) {
		voiceState.localMuted = true;
	}
}

/** Add or update a participant in the voice channel. */
export function updateParticipant(
	nick: string,
	state: Partial<Omit<VoiceParticipant, 'nick'>>,
): void {
	const existing = voiceState.participants.get(nick);
	if (existing) {
		if (state.isSpeaking !== undefined) existing.isSpeaking = state.isSpeaking;
		if (state.isMuted !== undefined) existing.isMuted = state.isMuted;
		if (state.isDeafened !== undefined) existing.isDeafened = state.isDeafened;
	} else {
		voiceState.participants.set(nick, {
			nick,
			isSpeaking: state.isSpeaking ?? false,
			isMuted: state.isMuted ?? false,
			isDeafened: state.isDeafened ?? false,
		});
	}
}

/** Remove a participant from the voice channel. */
export function removeParticipant(nick: string): void {
	voiceState.participants.delete(nick);
}

/** Stop the duration counter. */
function stopDurationTimer(): void {
	if (durationTimer !== null) {
		clearInterval(durationTimer);
		durationTimer = null;
	}
}
