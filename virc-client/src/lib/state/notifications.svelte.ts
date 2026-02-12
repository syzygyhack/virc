/**
 * Reactive notification state: unread counts, mention counts, and read markers.
 *
 * Per-channel tracking of unread messages and @mentions.
 * Read markers are synced via MARKREAD IRC command.
 */

interface ChannelNotification {
	unreadCount: number;
	mentionCount: number;
	lastReadMsgid: string | null;
}

interface NotificationStore {
	channels: Map<string, ChannelNotification>;
}

/** Reactive notification store — components read this directly. */
export const notificationState: NotificationStore = $state({
	channels: new Map(),
});

function ensureChannel(channel: string): ChannelNotification {
	if (!notificationState.channels.has(channel)) {
		notificationState.channels.set(channel, {
			unreadCount: 0,
			mentionCount: 0,
			lastReadMsgid: null,
		});
	}
	return notificationState.channels.get(channel)!;
}

/**
 * Increment unread count for a channel. Called on new message when channel
 * is not the active channel. If isMention is true, also increments mention count.
 */
export function incrementUnread(channel: string, isMention: boolean): void {
	const ch = ensureChannel(channel);
	ch.unreadCount++;
	if (isMention) {
		ch.mentionCount++;
	}
}

/**
 * Mark a channel as read. Resets unread/mention counts and updates
 * the last read message ID.
 */
export function markRead(channel: string, msgid: string): void {
	const ch = ensureChannel(channel);
	ch.unreadCount = 0;
	ch.mentionCount = 0;
	ch.lastReadMsgid = msgid;
}

/** Get the unread message count for a channel. Returns 0 if not tracked. */
export function getUnreadCount(channel: string): number {
	return notificationState.channels.get(channel)?.unreadCount ?? 0;
}

/** Get the mention count for a channel. Returns 0 if not tracked. */
export function getMentionCount(channel: string): number {
	return notificationState.channels.get(channel)?.mentionCount ?? 0;
}

/** Get the last read message ID for a channel. Returns null if not set. */
export function getLastReadMsgid(channel: string): string | null {
	return notificationState.channels.get(channel)?.lastReadMsgid ?? null;
}

/** Set the last read message ID without resetting counts (e.g. from server sync). */
export function setLastReadMsgid(channel: string, msgid: string): void {
	const ch = ensureChannel(channel);
	ch.lastReadMsgid = msgid;
}

/** Reset all notification state. */
export function resetNotifications(): void {
	notificationState.channels.clear();
}
