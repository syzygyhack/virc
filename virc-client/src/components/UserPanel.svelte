<script lang="ts">
	import { userState } from '$lib/state/user.svelte';
	import { voiceState } from '$lib/state/voice.svelte';
	import { toggleMute, toggleDeafen, disconnectVoice } from '$lib/voice/room';
	import type { Room } from 'livekit-client';

	interface Props {
		onSettingsClick: () => void;
		voiceRoom?: Room | null;
	}

	let { onSettingsClick, voiceRoom = null }: Props = $props();

	let initial = $derived((userState.nick ?? '?')[0].toUpperCase());

	function handleMute(): void {
		if (voiceRoom) toggleMute(voiceRoom);
	}

	function handleDeafen(): void {
		if (voiceRoom) toggleDeafen(voiceRoom);
	}

	async function handleDisconnect(): Promise<void> {
		if (!voiceRoom) return;
		try {
			await disconnectVoice(voiceRoom);
		} catch (e) {
			console.error('Disconnect failed:', e);
		}
	}
</script>

<div class="user-panel">
	<div class="user-row">
		<div class="user-info">
			<div class="user-avatar">
				<span class="avatar-letter">{initial}</span>
				<span class="status-dot"></span>
			</div>
			<div class="user-names">
				<span class="user-nick">{userState.nick ?? 'Unknown'}</span>
				{#if userState.account && userState.account !== userState.nick}
					<span class="user-account">{userState.account}</span>
				{/if}
			</div>
		</div>

		<button
			class="action-btn settings-btn"
			onclick={onSettingsClick}
			aria-label="User Settings"
			title="User Settings"
		>
			<svg width="16" height="16" viewBox="0 0 24 24">
				<path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.14 7.14 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.39 1.08.73 1.69.98l.38 2.65c.05.24.26.42.49.42h4c.24 0 .44-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.49.49 0 0 0-.12-.64l-2.11-1.65z" fill="currentColor" />
			</svg>
		</button>
	</div>

	{#if voiceState.isConnected && voiceRoom}
		<div class="voice-row">
			<button
				class="action-btn"
				class:active={voiceState.localMuted}
				onclick={handleMute}
				aria-label={voiceState.localMuted ? 'Unmute' : 'Mute'}
				title={voiceState.localMuted ? 'Unmute' : 'Mute'}
			>
				<svg width="16" height="16" viewBox="0 0 24 24">
					{#if voiceState.localMuted}
						<path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 7.46 2.05L12 9.59V5a2 2 0 0 1 4 0v3.59l2 2V5a4 4 0 0 0-6-3.46z" fill="currentColor" opacity="0.5" />
						<line x1="3" y1="3" x2="21" y2="21" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" />
					{:else}
						<path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" fill="currentColor" />
						<path d="M6 11a1 1 0 0 0-2 0 8 8 0 0 0 7 7.93V21H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.07A8 8 0 0 0 20 11a1 1 0 0 0-2 0 6 6 0 0 1-12 0z" fill="currentColor" />
					{/if}
				</svg>
			</button>

			<button
				class="action-btn"
				class:active={voiceState.localDeafened}
				onclick={handleDeafen}
				aria-label={voiceState.localDeafened ? 'Undeafen' : 'Deafen'}
				title={voiceState.localDeafened ? 'Undeafen' : 'Deafen'}
			>
				<svg width="16" height="16" viewBox="0 0 24 24">
					{#if voiceState.localDeafened}
						<path d="M3 14v4a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H5a7 7 0 0 1 14 0h-1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a9 9 0 0 0-18 0z" fill="currentColor" opacity="0.5" />
						<line x1="3" y1="3" x2="21" y2="21" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" />
					{:else}
						<path d="M3 14v4a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H5a7 7 0 0 1 14 0h-1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-4a9 9 0 0 0-18 0z" fill="currentColor" />
					{/if}
				</svg>
			</button>

			<button
				class="action-btn disconnect-btn"
				onclick={handleDisconnect}
				aria-label="Disconnect"
				title="Disconnect"
			>
				<svg width="16" height="16" viewBox="0 0 24 24">
					<path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z" fill="currentColor" />
					<line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
			</button>
		</div>
	{/if}
</div>

<style>
	.user-panel {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 8px 10px;
		background: var(--surface-lowest);
		border-top: 1px solid var(--surface-highest);
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 0;
	}

	.user-avatar {
		position: relative;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}

	.avatar-letter {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--accent-primary);
		color: var(--text-inverse, #fff);
		font-size: var(--font-sm);
		font-weight: var(--weight-semibold);
		line-height: 1;
	}

	.status-dot {
		position: absolute;
		bottom: -1px;
		right: -1px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--status-online);
		border: 2px solid var(--surface-lowest);
	}

	.user-names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.user-nick {
		font-size: var(--font-sm);
		font-weight: var(--weight-semibold);
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.3;
	}

	.user-account {
		font-size: var(--font-xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.3;
	}

	.voice-row {
		display: flex;
		align-items: center;
		gap: 2px;
		padding-top: 6px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: var(--text-secondary);
		transition: background var(--duration-channel), color var(--duration-channel);
	}

	.action-btn:hover {
		background: var(--surface-high);
		color: var(--text-primary);
	}

	.action-btn.active {
		color: var(--danger);
	}

	.action-btn.active:hover {
		background: var(--danger-bg);
	}

	.action-btn.disconnect-btn {
		color: var(--danger);
		margin-left: auto;
	}

	.action-btn.disconnect-btn:hover {
		background: var(--danger-bg);
	}
</style>
