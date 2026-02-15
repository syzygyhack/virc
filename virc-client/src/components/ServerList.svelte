<script lang="ts">
	import { serverState, setActiveServer, type ServerInfo } from '$lib/state/servers.svelte';
	import { channelUIState } from '$lib/state/channels.svelte';
	import { notificationState, getUnreadCount, getMentionCount } from '$lib/state/notifications.svelte';

	/**
	 * Aggregate unread + mention counts across all channels for a server.
	 * Currently all channels belong to the single connected server, so
	 * we sum across everything. When multi-server lands, this will filter
	 * by server-owned channels.
	 */
	function getServerUnread(_serverId: string): number {
		// Touch reactive state
		void notificationState.channels;
		let total = 0;
		// Sum across all category channels
		for (const cat of channelUIState.categories) {
			for (const ch of cat.channels) {
				total += getUnreadCount(ch);
			}
		}
		// Sum DM unreads
		for (const dm of channelUIState.dmConversations) {
			total += getUnreadCount(dm.nick);
		}
		return total;
	}

	function getServerMentions(_serverId: string): number {
		void notificationState.channels;
		let total = 0;
		for (const cat of channelUIState.categories) {
			for (const ch of cat.channels) {
				total += getMentionCount(ch);
			}
		}
		for (const dm of channelUIState.dmConversations) {
			total += getMentionCount(dm.nick);
		}
		return total;
	}

	/**
	 * Generate a 2-letter abbreviation from a server name.
	 * Takes the first letter of the first two words, or the first two letters
	 * if only one word.
	 */
	function abbreviation(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length >= 2) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	}

	/**
	 * Deterministic background color from a string.
	 * Produces a muted hue suitable for dark backgrounds.
	 */
	function hashedColor(name: string): string {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = Math.abs(hash) % 360;
		return `hsl(${hue}, 50%, 40%)`;
	}

	function handleServerClick(id: string): void {
		setActiveServer(id);
	}
</script>

<nav class="server-list" aria-label="Servers">
	<div class="server-items">
		{#each serverState.servers as server (server.id)}
			{@const isActive = serverState.activeServerId === server.id}
			{@const unread = getServerUnread(server.id)}
			{@const mentions = getServerMentions(server.id)}
			<div class="server-item" class:active={isActive}>
				<!-- Left-edge indicators -->
				<div class="indicator" class:active={isActive} class:unread={!isActive && unread > 0}></div>

				<button
					class="server-icon"
					class:active={isActive}
					onclick={() => handleServerClick(server.id)}
					title={server.name}
					aria-label={server.name}
					aria-current={isActive ? 'true' : undefined}
				>
					{#if server.icon}
						<img src={server.icon} alt="" class="server-img" />
					{:else}
						<span
							class="server-abbrev"
							style="background-color: {hashedColor(server.name)}"
						>{abbreviation(server.name)}</span>
					{/if}
				</button>

				<!-- Mention badge -->
				{#if mentions > 0}
					<div class="mention-badge" aria-label="{mentions} mentions">
						{mentions > 99 ? '99+' : mentions}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Add server button -->
	<div class="server-item add-server">
		<button
			class="server-icon add-btn"
			title="Add Server"
			aria-label="Add Server"
		>
			<span class="add-icon">+</span>
		</button>
	</div>
</nav>

<style>
	.server-list {
		width: 56px;
		min-width: 56px;
		height: 100%;
		background: var(--surface-lowest);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px 0;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
	}

	.server-list::-webkit-scrollbar {
		display: none;
	}

	.server-items {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		flex: 1;
	}

	.server-item {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 48px;
	}

	/* Left-edge indicator pill */
	.indicator {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 2px;
		height: 0;
		background: #ffffff;
		border-radius: 0 2px 2px 0;
		transition: height var(--duration-channel) ease;
	}

	.indicator.active {
		height: 40px;
	}

	.indicator.unread {
		height: 8px;
		border-radius: 50%;
		width: 8px;
		left: -1px;
	}

	/* Server icon button */
	.server-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		padding: 0;
		cursor: pointer;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-high);
		transition: border-radius var(--duration-channel) ease,
			background var(--duration-channel) ease;
	}

	.server-icon:hover {
		border-radius: 30%;
	}

	.server-icon.active {
		border-radius: 30%;
	}

	/* Hover indicator: show shorter pill on hover when not active and not unread */
	.server-item:not(.active):hover > .indicator:not(.unread) {
		height: 20px;
	}

	.server-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.server-abbrev {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: var(--font-sm);
		font-weight: var(--weight-semibold);
		color: #ffffff;
		line-height: 1;
		user-select: none;
	}

	/* Mention badge (bottom-right of icon) */
	.mention-badge {
		position: absolute;
		bottom: 0;
		right: 2px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 8px;
		background: var(--danger);
		color: #ffffff;
		font-size: 10px;
		font-weight: var(--weight-bold);
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		pointer-events: none;
		box-shadow: 0 0 0 2px var(--surface-lowest);
	}

	/* Add server button */
	.add-server {
		margin-top: auto;
		padding-bottom: 4px;
	}

	.add-btn {
		background: var(--surface-high);
		color: var(--status-online);
		transition: border-radius var(--duration-channel) ease,
			background var(--duration-channel) ease,
			color var(--duration-channel) ease;
	}

	.add-btn:hover {
		background: var(--status-online);
		color: #ffffff;
		border-radius: 30%;
	}

	.add-icon {
		font-size: var(--font-lg);
		font-weight: var(--weight-normal);
		line-height: 1;
	}
</style>
