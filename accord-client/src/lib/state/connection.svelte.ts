/**
 * Reactive connection state for the IRC WebSocket.
 *
 * Provides a Svelte 5 reactive wrapper around connection status so components
 * can bind to `connectionState.status` and react to changes without polling.
 */

import type { ConnectionState } from '../irc/connection';

interface ConnectionStore {
	status: ConnectionState;
	error: string | null;
	latency: number | null;
	reconnectAttempt: number;
}

/** Reactive connection state — components read this directly. */
export const connectionState: ConnectionStore = $state({
	status: 'disconnected',
	error: null,
	latency: null,
	reconnectAttempt: 0,
});

/** Mark connection as established and clear any previous error. */
export function setConnected(): void {
	connectionState.status = 'connected';
	connectionState.error = null;
	connectionState.reconnectAttempt = 0;
}

/**
 * Mark connection as disconnected.
 * Optionally records the reason so UI can display it.
 */
export function setDisconnected(error?: string): void {
	connectionState.status = 'disconnected';
	connectionState.error = error ?? null;
	connectionState.latency = null;
}

/** Mark connection as attempting to reconnect. */
export function setReconnecting(attempt?: number): void {
	connectionState.status = 'reconnecting';
	if (attempt !== undefined) {
		connectionState.reconnectAttempt = attempt;
	}
}

/** Mark connection as in-progress (initial connect). */
export function setConnecting(): void {
	connectionState.status = 'connecting';
}

/** Update measured round-trip latency in milliseconds. */
export function setLatency(ms: number): void {
	connectionState.latency = ms;
}
