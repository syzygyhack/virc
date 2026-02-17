/**
 * Channel navigation helpers.
 *
 * Pure functions for navigating between channels, servers, and unread items.
 * Extracted from chat/+page.svelte to reduce component size.
 */

import { channelUIState, setActiveChannel } from '$lib/state/channels.svelte';
import { getUnreadCount } from '$lib/state/notifications.svelte';
import { serverState, setActiveServer } from '$lib/state/servers.svelte';

/**
 * Get the flat, ordered list of text channels (non-voice) from categories.
 * DM conversations are listed first, then category channels.
 */
export function getTextChannelList(): string[] {
	const channels: string[] = [];
	for (const dm of channelUIState.dmConversations) {
		channels.push(dm.nick);
	}
	for (const cat of channelUIState.categories) {
		if (cat.voice) continue;
		for (const ch of cat.channels) {
			channels.push(ch);
		}
	}
	return channels;
}

/** Navigate to the next or previous channel in the sidebar. */
export function navigateChannel(direction: 1 | -1): void {
	const channels = getTextChannelList();
	if (channels.length === 0) return;
	const current = channelUIState.activeChannel;
	const idx = current ? channels.indexOf(current) : -1;
	let next: number;
	if (idx === -1) {
		next = direction === 1 ? 0 : channels.length - 1;
	} else {
		next = (idx + direction + channels.length) % channels.length;
	}
	setActiveChannel(channels[next]);
}

/** Navigate to the next or previous unread channel. */
export function navigateUnreadChannel(direction: 1 | -1): void {
	const channels = getTextChannelList();
	if (channels.length === 0) return;
	const current = channelUIState.activeChannel;
	const idx = current ? channels.indexOf(current) : -1;
	const start = idx === -1 ? 0 : idx;

	for (let i = 1; i <= channels.length; i++) {
		const checkIdx = (start + i * direction + channels.length) % channels.length;
		if (getUnreadCount(channels[checkIdx]) > 0) {
			setActiveChannel(channels[checkIdx]);
			return;
		}
	}
}

/** Navigate to the next or previous server in the server list. */
export function navigateServer(direction: 1 | -1): void {
	const servers = serverState.servers;
	if (servers.length === 0) return;
	const activeId = serverState.activeServerId;
	const idx = activeId ? servers.findIndex((s) => s.id === activeId) : -1;
	let next: number;
	if (idx === -1) {
		next = direction === 1 ? 0 : servers.length - 1;
	} else {
		next = (idx + direction + servers.length) % servers.length;
	}
	setActiveServer(servers[next].id);
}
