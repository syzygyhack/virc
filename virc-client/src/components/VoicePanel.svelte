<script lang="ts">
	import { voiceState } from '$lib/state/voice.svelte';

	/** Format seconds into MM:SS. */
	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}
</script>

<div class="voice-panel" aria-label="Voice Connected">
	<div class="voice-info">
		<svg class="voice-info-icon" width="14" height="14" viewBox="0 0 16 16">
			<path
				d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM5 8a1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V14H5a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9v-1.1A5 5 0 0 0 13 8a1 1 0 0 0-2 0 3 3 0 0 1-6 0z"
				fill="currentColor"
			/>
		</svg>
		<span class="voice-channel-name">{voiceState.currentRoom?.replace(/^#/, '') ?? ''}</span>
	</div>
	<div class="voice-status">
		<span class="voice-status-text">Connected</span>
		<span class="voice-status-sep">&bull;</span>
		<span class="voice-status-timer">{formatDuration(voiceState.connectDuration)}</span>
	</div>
</div>

<style>
	.voice-panel {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 10px;
		background: var(--surface-lowest);
		border-top: 1px solid var(--surface-highest);
	}

	.voice-info {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.voice-info-icon {
		color: var(--success);
		flex-shrink: 0;
	}

	.voice-channel-name {
		font-size: var(--font-sm);
		font-weight: var(--weight-semibold);
		color: var(--success);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.voice-status {
		display: flex;
		align-items: center;
		gap: 4px;
		padding-left: 20px; /* align under channel name */
	}

	.voice-status-text {
		font-size: var(--font-xs);
		color: var(--text-muted);
	}

	.voice-status-sep {
		font-size: var(--font-xs);
		color: var(--text-muted);
	}

	.voice-status-timer {
		font-size: var(--font-xs);
		color: var(--text-muted);
		font-family: var(--font-mono);
	}
</style>
