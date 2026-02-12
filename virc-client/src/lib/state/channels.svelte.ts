/**
 * Reactive channel state: members, topics, and loading status.
 *
 * Tracks per-channel membership, topic, and whether the initial NAMES
 * response has been fully received.
 */

export interface ChannelMember {
	nick: string;
	account: string;
	prefix: string; // mode prefix chars like '@', '+', etc.
}

export interface ChannelInfo {
	name: string;
	topic: string;
	members: Map<string, ChannelMember>; // nick -> member
	namesLoaded: boolean;
}

interface ChannelStore {
	channels: Map<string, ChannelInfo>;
}

/** Reactive channel store — components read this directly. */
export const channelState: ChannelStore = $state({
	channels: new Map(),
});

function ensureChannel(name: string): ChannelInfo {
	if (!channelState.channels.has(name)) {
		channelState.channels.set(name, {
			name,
			topic: '',
			members: new Map(),
			namesLoaded: false,
		});
	}
	return channelState.channels.get(name)!;
}

/** Get channel info, or null if not joined. */
export function getChannel(name: string): ChannelInfo | null {
	return channelState.channels.get(name) ?? null;
}

/** Add a member to a channel. */
export function addMember(channel: string, nick: string, account: string, prefix = ''): void {
	const ch = ensureChannel(channel);
	ch.members.set(nick, { nick, account, prefix });
}

/** Remove a member from a channel. */
export function removeMember(channel: string, nick: string): void {
	const ch = channelState.channels.get(channel);
	if (ch) {
		ch.members.delete(nick);
	}
}

/** Remove a nick from all channels (used for QUIT). */
export function removeMemberFromAll(nick: string): void {
	for (const ch of channelState.channels.values()) {
		ch.members.delete(nick);
	}
}

/** Get all channel names where a nick is a member. */
export function getChannelsForNick(nick: string): string[] {
	const channels: string[] = [];
	for (const ch of channelState.channels.values()) {
		if (ch.members.has(nick)) {
			channels.push(ch.name);
		}
	}
	return channels;
}

/** Set the topic for a channel. */
export function setTopic(channel: string, topic: string): void {
	const ch = ensureChannel(channel);
	ch.topic = topic;
}

/** Mark a channel's NAMES list as fully received. */
export function setNamesLoaded(channel: string): void {
	const ch = channelState.channels.get(channel);
	if (ch) {
		ch.namesLoaded = true;
	}
}

/** Remove a channel entirely (on PART by self). */
export function removeChannel(name: string): void {
	channelState.channels.delete(name);
}

/** Reset all channel state. */
export function resetChannels(): void {
	channelState.channels.clear();
}

// ---------------------------------------------------------------------------
// UI-level channel state: active channel, categories, DM conversations
// ---------------------------------------------------------------------------

export interface ChannelCategory {
	name: string;
	channels: string[];
	collapsed: boolean;
	voice?: boolean;
}

export interface DMConversation {
	nick: string;
	lastMessage?: string;
}

interface ChannelUIStore {
	activeChannel: string | null;
	categories: ChannelCategory[];
	dmConversations: DMConversation[];
}

/** Reactive UI state for sidebar — components read this directly. */
export const channelUIState: ChannelUIStore = $state({
	activeChannel: null,
	categories: [],
	dmConversations: [],
});

/** Set the active channel. */
export function setActiveChannel(name: string | null): void {
	channelUIState.activeChannel = name;
}

/** Get the active channel name, or null. */
export function getActiveChannel(): string | null {
	return channelUIState.activeChannel;
}

/**
 * Set categories from virc.json. Each category starts expanded.
 */
export function setCategories(cats: Array<{ name: string; channels: string[]; voice?: boolean }>): void {
	channelUIState.categories = cats.map((c) => ({
		name: c.name,
		channels: c.channels,
		collapsed: false,
		voice: c.voice,
	}));
}

/** Toggle a category's collapsed state. */
export function toggleCategory(name: string): void {
	const cat = channelUIState.categories.find((c) => c.name === name);
	if (cat) {
		cat.collapsed = !cat.collapsed;
	}
}

/** Add a DM conversation to the sidebar. */
export function addDMConversation(nick: string, lastMessage?: string): void {
	const existing = channelUIState.dmConversations.find((d) => d.nick === nick);
	if (existing) {
		if (lastMessage !== undefined) existing.lastMessage = lastMessage;
	} else {
		channelUIState.dmConversations.push({ nick, lastMessage });
	}
}

/** Reset UI state. */
export function resetChannelUI(): void {
	channelUIState.activeChannel = null;
	channelUIState.categories.length = 0;
	channelUIState.dmConversations.length = 0;
}
