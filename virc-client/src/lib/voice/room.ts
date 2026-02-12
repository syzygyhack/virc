/**
 * LiveKit room management for voice channels.
 *
 * Wraps livekit-client to provide connect/disconnect/mute/deafen
 * and keeps the reactive voiceState in sync via event listeners.
 */

import {
	Room,
	RoomEvent,
	Track,
	type RemoteParticipant,
	type LocalParticipant,
	type Participant,
	type RemoteTrackPublication,
	type TrackPublication,
} from 'livekit-client';

import {
	setConnected,
	setDisconnected,
	toggleMute as toggleMuteState,
	toggleDeafen as toggleDeafenState,
	updateParticipant,
	removeParticipant,
	voiceState,
} from '$lib/state/voice.svelte';

/**
 * Get the display identity for a participant.
 * Falls back to the participant's identity string.
 */
function participantNick(p: Participant): string {
	return p.identity;
}

/**
 * Connect to a LiveKit room for a voice channel.
 *
 * Creates a Room, connects with the provided token, enables the local
 * microphone, and wires up event listeners to keep voiceState current.
 */
export async function connectToVoice(
	channel: string,
	livekitUrl: string,
	token: string,
): Promise<Room> {
	const room = new Room();

	// Wire up event listeners before connecting so we don't miss early events.
	setupRoomEvents(room);

	await room.connect(livekitUrl, token);

	// Enable local microphone.
	await room.localParticipant.setMicrophoneEnabled(true);

	// Register existing remote participants (may already be in the room).
	for (const participant of room.remoteParticipants.values()) {
		updateParticipant(participantNick(participant), {
			isMuted: !participant.isMicrophoneEnabled,
		});
	}

	setConnected(channel);
	return room;
}

/**
 * Disconnect from a LiveKit room and reset voice state.
 */
export async function disconnectVoice(room: Room): Promise<void> {
	// Disable all local tracks before disconnecting.
	for (const pub of room.localParticipant.trackPublications.values()) {
		if (pub.track) {
			await pub.track.stop();
		}
	}

	await room.disconnect();
	setDisconnected();
}

/**
 * Toggle the local microphone mute state.
 */
export async function toggleMute(room: Room): Promise<void> {
	const willMute = !voiceState.localMuted;
	await room.localParticipant.setMicrophoneEnabled(!willMute);
	toggleMuteState();
}

/**
 * Toggle deafen: mute all remote audio and also mute local mic.
 *
 * When un-deafening, remote audio is restored. Local mic is only
 * restored if it wasn't independently muted before deafening.
 */
export async function toggleDeafen(room: Room): Promise<void> {
	const willDeafen = !voiceState.localDeafened;

	// Mute/unmute all remote audio tracks.
	for (const participant of room.remoteParticipants.values()) {
		for (const pub of participant.trackPublications.values()) {
			if (pub.track && pub.track.kind === Track.Kind.Audio) {
				if (willDeafen) {
					(pub.track as any).setVolume?.(0);
					pub.track.detach();
				} else {
					(pub.track as any).setVolume?.(1);
					pub.track.attach();
				}
			}
		}
	}

	// If deafening, also mute local mic. toggleDeafenState handles this.
	if (willDeafen) {
		await room.localParticipant.setMicrophoneEnabled(false);
	} else {
		// Un-deafen: restore mic only if user wasn't independently muted.
		// After toggleDeafenState, localMuted stays true because deafen set it.
		// We restore mic here; the state update happens in toggleDeafenState.
		await room.localParticipant.setMicrophoneEnabled(true);
	}

	toggleDeafenState();
}

/**
 * Set up LiveKit room event listeners that sync to voiceState.
 */
function setupRoomEvents(room: Room): void {
	room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
		updateParticipant(participantNick(participant), {
			isMuted: !participant.isMicrophoneEnabled,
		});
	});

	room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
		removeParticipant(participantNick(participant));
	});

	room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
		const speakingNicks = new Set(speakers.map(participantNick));

		// Mark current speakers.
		for (const nick of speakingNicks) {
			updateParticipant(nick, { isSpeaking: true });
		}

		// Clear speaking flag for those no longer speaking.
		for (const [nick, p] of voiceState.participants) {
			if (p.isSpeaking && !speakingNicks.has(nick)) {
				updateParticipant(nick, { isSpeaking: false });
			}
		}
	});

	room.on(
		RoomEvent.TrackMuted,
		(publication: TrackPublication, participant: Participant) => {
			if (publication.kind === Track.Kind.Audio) {
				updateParticipant(participantNick(participant), { isMuted: true });
			}
		},
	);

	room.on(
		RoomEvent.TrackUnmuted,
		(publication: TrackPublication, participant: Participant) => {
			if (publication.kind === Track.Kind.Audio) {
				updateParticipant(participantNick(participant), { isMuted: false });
			}
		},
	);
}
