/**
 * MONITOR tracking for presence awareness.
 *
 * Extracted from +page.svelte — manages the set of nicks being monitored
 * via the IRC MONITOR command for online/offline tracking.
 */

import type { IRCConnection } from '$lib/irc/connection';
import { monitor, who } from '$lib/irc/commands';
import {
	channelUIState,
	channelState,
	getChannel,
	isDMTarget,
} from '$lib/state/channels.svelte';
import { userState } from '$lib/state/user.svelte';

/** Set of nicks currently being monitored. */
const monitoredNicks = new Set<string>();

/**
 * Update MONITOR list for the given channel.
 * Adds nicks in the active channel, prunes nicks not in any joined channel
 * or DM list. Also sends WHO to get initial away status.
 */
export function updateMonitorForChannel(conn: IRCConnection | null, channel: string): void {
	if (!conn) return;
	if (isDMTarget(channel)) return;

	const chInfo = getChannel(channel);
	if (!chInfo) return;

	const currentNicks = new Set(chInfo.members.keys());
	const ownNick = userState.nick?.toLowerCase() ?? null;
	if (ownNick) currentNicks.delete(ownNick);

	// Build the full set of nicks that should be monitored:
	// all nicks in any joined channel + DM partners
	const allNeeded = new Set<string>();
	for (const [chName, chData] of channelState.channels) {
		if (chName.startsWith('#') || chName.startsWith('&')) {
			for (const nick of chData.members.keys()) {
				if (nick !== ownNick) allNeeded.add(nick);
			}
		}
	}
	for (const dm of channelUIState.dmConversations) {
		allNeeded.add(dm.nick.toLowerCase());
	}

	// Add nicks from active channel not yet monitored
	const toAdd = [...currentNicks].filter((n) => !monitoredNicks.has(n));
	// Remove monitored nicks not needed by any channel or DM
	const toRemove = [...monitoredNicks].filter((n) => !allNeeded.has(n));

	if (toRemove.length > 0) {
		monitor(conn, '-', toRemove);
		for (const n of toRemove) monitoredNicks.delete(n);
	}
	if (toAdd.length > 0) {
		monitor(conn, '+', toAdd);
		for (const n of toAdd) monitoredNicks.add(n);
	}

	// Send WHO to get initial away status for the channel
	who(conn, channel);
}

/** Clear all monitored nicks (used on reconnect). */
export function clearMonitoredNicks(): void {
	monitoredNicks.clear();
}

/** Add nicks to the monitored set (used by connection lifecycle). */
export function addMonitoredNicks(nicks: string[]): void {
	for (const n of nicks) monitoredNicks.add(n.toLowerCase());
}
