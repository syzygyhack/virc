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
	type Participant,
	type TrackPublication,
	type AudioCaptureOptions,
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
import { audioSettings } from '$lib/state/audioSettings.svelte';

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
	// Configure room with selected audio devices and processing.
	const audioCaptureOpts: AudioCaptureOptions = {
		noiseSuppression: audioSettings.noiseSuppression,
		// Keep echo cancellation and auto gain — they help in voice chat.
		echoCancellation: true,
		autoGainControl: true,
	};
	if (audioSettings.inputDeviceId !== 'default') {
		audioCaptureOpts.deviceId = { exact: audioSettings.inputDeviceId };
	}

	const room = new Room({
		audioCaptureDefaults: audioCaptureOpts,
		audioOutput: audioSettings.outputDeviceId !== 'default'
			? { deviceId: audioSettings.outputDeviceId }
			: undefined,
	});

	// Wire up event listeners before connecting so we don't miss early events.
	setupRoomEvents(room);

	await room.connect(livekitUrl, token);

	// Enable local microphone with selected device.
	// If push-to-talk is active, start muted to avoid a brief open-mic window.
	const startMuted = audioSettings.pushToTalk;
	if (!startMuted) {
		await room.localParticipant.setMicrophoneEnabled(true, audioCaptureOpts);
	}

	// Mark connected first (clears participant map), then register participants.
	setConnected(channel);

	// Add local participant to the map.
	updateParticipant(participantNick(room.localParticipant), {
		isMuted: startMuted || !room.localParticipant.isMicrophoneEnabled,
	});

	// Register existing remote participants (may already be in the room).
	for (const participant of room.remoteParticipants.values()) {
		updateParticipant(participantNick(participant), {
			isMuted: !participant.isMicrophoneEnabled,
		});
	}

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
	// Sync local participant in the participants map.
	updateParticipant(participantNick(room.localParticipant), {
		isMuted: willMute,
	});
}

/**
 * Toggle deafen: mute all remote audio and also mute local mic.
 *
 * When un-deafening, remote audio is restored. Local mic is only
 * restored if it wasn't independently muted before deafening.
 * The state layer (toggleDeafenState) tracks wasMutedBeforeDeafen.
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
					(pub.track as any).setVolume?.(audioSettings.outputVolume / 100);
					pub.track.attach();
				}
			}
		}
	}

	if (willDeafen) {
		await room.localParticipant.setMicrophoneEnabled(false);
	}

	// Update state — toggleDeafenState captures/restores wasMutedBeforeDeafen
	toggleDeafenState();

	// On undeafen, sync LiveKit mic to the restored mute state
	if (!willDeafen) {
		await room.localParticipant.setMicrophoneEnabled(!voiceState.localMuted);
	}

	// Sync local participant in the participants map.
	updateParticipant(participantNick(room.localParticipant), {
		isMuted: voiceState.localMuted,
		isDeafened: voiceState.localDeafened,
	});
}

/**
 * Set up LiveKit room event listeners that sync to voiceState.
 */
function setupRoomEvents(room: Room): void {
	// Apply output volume to newly subscribed audio tracks.
	room.on(
		RoomEvent.TrackSubscribed,
		(track) => {
			if (track.kind === Track.Kind.Audio) {
				(track as any).setVolume?.(audioSettings.outputVolume / 100);
			}
		},
	);

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
