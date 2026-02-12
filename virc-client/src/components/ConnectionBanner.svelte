<script lang="ts">
	import { connectionState } from '$lib/state/connection.svelte';

	let visible = $derived(connectionState.status === 'reconnecting');
	let attempt = $derived(connectionState.reconnectAttempt);
</script>

{#if visible}
	<div class="connection-banner">
		<span class="banner-dot"></span>
		<span class="banner-text">
			Connection lost. Reconnecting...
			{#if attempt > 0}
				<span class="banner-attempt">Attempt {attempt}</span>
			{/if}
		</span>
	</div>
{/if}

<style>
	.connection-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 6px 16px;
		background: var(--warning, #e6a817);
		color: #1a1a1a;
		font-size: var(--font-sm);
		font-weight: var(--weight-medium);
		animation: banner-pulse 2s ease-in-out infinite;
		flex-shrink: 0;
		z-index: 10;
	}

	.banner-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #1a1a1a;
		opacity: 0.7;
		animation: dot-blink 1.4s ease-in-out infinite;
	}

	.banner-text {
		line-height: 1;
	}

	.banner-attempt {
		opacity: 0.7;
		margin-left: 4px;
	}

	@keyframes banner-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.85;
		}
	}

	@keyframes dot-blink {
		0%, 100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}
</style>
