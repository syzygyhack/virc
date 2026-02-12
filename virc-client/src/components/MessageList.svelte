<script lang="ts">
	import { tick } from 'svelte';
	import { getMessages, getCursors, type Message } from '$lib/state/messages.svelte';
	import { channelUIState } from '$lib/state/channels.svelte';
	import MessageComponent from './Message.svelte';

	interface Props {
		onloadhistory?: (target: string, beforeMsgid: string) => void;
		onreply?: (msgid: string) => void;
		onreact?: (msgid: string) => void;
		onmore?: (msgid: string, event: MouseEvent) => void;
		ontogglereaction?: (msgid: string, emoji: string) => void;
	}

	let {
		onloadhistory,
		onreply,
		onreact,
		onmore,
		ontogglereaction,
	}: Props = $props();

	/** The grouping window in milliseconds (7 minutes). */
	const GROUPING_WINDOW_MS = 7 * 60 * 1000;

	/** How close to the bottom (in px) counts as "at bottom" for auto-scroll. */
	const SCROLL_BOTTOM_THRESHOLD = 48;

	/** How close to the top (in px) triggers history loading. */
	const SCROLL_TOP_THRESHOLD = 200;

	let scrollContainer: HTMLDivElement | undefined = $state(undefined);
	let isAtBottom = $state(true);
	let unreadCount = $state(0);
	let isLoadingHistory = $state(false);
	let prevMessageCount = $state(0);
	let prevScrollHeight = $state(0);

	/** Messages for the active channel. */
	let messages = $derived(
		channelUIState.activeChannel
			? getMessages(channelUIState.activeChannel)
			: []
	);

	/** Compute grouping info for each message. */
	let groupedMessages = $derived(() => {
		const result: Array<{
			message: Message;
			isGrouped: boolean;
			isFirstInGroup: boolean;
		}> = [];

		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			const prev = i > 0 ? messages[i - 1] : null;

			let isGrouped = false;
			let isFirstInGroup = true;

			if (prev) {
				const sameAuthor = prev.nick === msg.nick;
				const withinWindow =
					msg.time.getTime() - prev.time.getTime() < GROUPING_WINDOW_MS;
				const isReply = !!msg.replyTo;

				if (sameAuthor && withinWindow && !isReply) {
					isGrouped = true;
					isFirstInGroup = false;
				}
			}

			result.push({ message: msg, isGrouped, isFirstInGroup });
		}

		return result;
	});

	/** Check if scrolled to bottom. */
	function checkScrollPosition(): void {
		if (!scrollContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
		isAtBottom = scrollHeight - scrollTop - clientHeight <= SCROLL_BOTTOM_THRESHOLD;
	}

	/** Handle scroll events. */
	function handleScroll(): void {
		checkScrollPosition();

		if (isAtBottom) {
			unreadCount = 0;
		}

		// Trigger history load when near top
		if (scrollContainer && scrollContainer.scrollTop <= SCROLL_TOP_THRESHOLD) {
			loadOlderMessages();
		}
	}

	/** Request older messages via CHATHISTORY BEFORE. */
	function loadOlderMessages(): void {
		if (isLoadingHistory) return;
		if (!channelUIState.activeChannel) return;

		const cursors = getCursors(channelUIState.activeChannel);
		if (!cursors.oldestMsgid) return;

		isLoadingHistory = true;
		prevScrollHeight = scrollContainer?.scrollHeight ?? 0;
		onloadhistory?.(channelUIState.activeChannel, cursors.oldestMsgid);
	}

	/** Scroll to the bottom of the message list. */
	function scrollToBottom(): void {
		if (!scrollContainer) return;
		scrollContainer.scrollTop = scrollContainer.scrollHeight;
		isAtBottom = true;
		unreadCount = 0;
	}

	/** Handle Jump to Present click. */
	function handleJumpToPresent(): void {
		scrollToBottom();
	}

	/** Scroll to a specific message by msgid. */
	function handleScrollToMessage(msgid: string): void {
		if (!scrollContainer) return;
		const el = scrollContainer.querySelector(`[data-msgid="${msgid}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	/**
	 * Effect: react to message count changes.
	 * - Auto-scroll to bottom if we were at bottom and new messages arrive at end.
	 * - Preserve scroll position if messages were prepended (history load).
	 * - Track unread count when scrolled up.
	 */
	$effect(() => {
		const currentCount = messages.length;

		if (currentCount > prevMessageCount) {
			const added = currentCount - prevMessageCount;

			if (isLoadingHistory && scrollContainer) {
				// Messages were prepended (history load) — preserve scroll position
				tick().then(() => {
					if (!scrollContainer) return;
					const newScrollHeight = scrollContainer.scrollHeight;
					const delta = newScrollHeight - prevScrollHeight;
					scrollContainer.scrollTop += delta;
					isLoadingHistory = false;
				});
			} else if (isAtBottom) {
				// New messages at the end — auto-scroll to bottom
				tick().then(() => scrollToBottom());
			} else {
				// Scrolled up — increment unread count
				unreadCount += added;
			}
		}

		prevMessageCount = currentCount;
	});

	/** Effect: scroll to bottom when active channel changes. */
	$effect(() => {
		// Access activeChannel to register dependency
		const _channel = channelUIState.activeChannel;

		unreadCount = 0;
		isAtBottom = true;
		isLoadingHistory = false;
		prevMessageCount = 0;

		tick().then(() => scrollToBottom());
	});
</script>

<div
	class="message-list"
	bind:this={scrollContainer}
	onscroll={handleScroll}
>
	{#if isLoadingHistory}
		<div class="skeleton-loading">
			<div class="skeleton-row">
				<div class="skeleton-avatar"></div>
				<div class="skeleton-content">
					<div class="skeleton-line skeleton-name"></div>
					<div class="skeleton-line skeleton-text"></div>
					<div class="skeleton-line skeleton-text short"></div>
				</div>
			</div>
			<div class="skeleton-row">
				<div class="skeleton-avatar"></div>
				<div class="skeleton-content">
					<div class="skeleton-line skeleton-name"></div>
					<div class="skeleton-line skeleton-text"></div>
				</div>
			</div>
		</div>
	{/if}

	{#each groupedMessages() as entry (entry.message.msgid)}
		<div data-msgid={entry.message.msgid}>
			<MessageComponent
				message={entry.message}
				isGrouped={entry.isGrouped}
				isFirstInGroup={entry.isFirstInGroup}
				{onreply}
				{onreact}
				{onmore}
				{ontogglereaction}
				onscrolltomessage={handleScrollToMessage}
			/>
		</div>
	{/each}
</div>

{#if !isAtBottom}
	<button class="jump-to-present" onclick={handleJumpToPresent}>
		{#if unreadCount > 0}
			<span class="unread-badge">{unreadCount}</span>
		{/if}
		Jump to Present
		<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
			<path d="M7 10.5L2.5 6h9L7 10.5z"/>
		</svg>
	</button>
{/if}

<style>
	.message-list {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		padding: 16px 0 8px;
		position: relative;
	}

	/* Skeleton loading for history fetch */
	.skeleton-loading {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px 72px 16px 72px;
	}

	.skeleton-row {
		display: flex;
		gap: 16px;
	}

	.skeleton-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface-high);
		flex-shrink: 0;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	.skeleton-line {
		height: 12px;
		border-radius: 6px;
		background: var(--surface-high);
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-name {
		width: 100px;
		height: 14px;
	}

	.skeleton-text {
		width: 80%;
	}

	.skeleton-text.short {
		width: 50%;
	}

	@keyframes skeleton-pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.8; }
	}

	/* Jump to Present pill */
	.jump-to-present {
		position: absolute;
		bottom: 8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 16px;
		background: var(--accent-primary);
		color: var(--text-inverse);
		border: none;
		border-radius: 20px;
		font-size: var(--font-sm);
		font-weight: var(--weight-semibold);
		font-family: var(--font-primary);
		cursor: pointer;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.32);
		z-index: 20;
		transition:
			background var(--duration-message) ease,
			box-shadow var(--duration-message) ease;
	}

	.jump-to-present:hover {
		background: var(--accent-secondary);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.unread-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		background: var(--danger);
		color: #fff;
		border-radius: 9px;
		font-size: var(--font-xs);
		font-weight: var(--weight-bold);
		line-height: 1;
	}
</style>
