<script lang="ts">
	// No props needed — this is a pure visual marker.
</script>

<div class="unread-divider" aria-label="New messages">
	<hr class="divider-line" />
	<span class="divider-label">NEW MESSAGES</span>
	<hr class="divider-line" />
</div>

<style>
	.unread-divider {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 16px;
		margin: 4px 0;
	}

	.divider-line {
		flex: 1;
		border: none;
		height: 1px;
		background: var(--accent-primary);
		margin: 0;
	}

	.divider-label {
		font-size: var(--font-xs);
		font-weight: var(--weight-semibold);
		color: var(--accent-primary);
		white-space: nowrap;
		letter-spacing: 0.04em;
		line-height: 1;
	}
</style>
