<script lang="ts">
	import { getActiveServer } from '$lib/state/servers.svelte';
	import { serverConfig } from '$lib/state/serverConfig.svelte';
	import { channelUIState, type ChannelCategory } from '$lib/state/channels.svelte';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	let activeTab: 'overview' | 'channels' = $state('overview');

	let tabTitle = $derived(
		activeTab === 'overview' ? 'Overview' : 'Channels'
	);

	const server = $derived(getActiveServer());
	const config = $derived(serverConfig.config);

	/** Categories from channelUIState (populated from virc.json on connect). */
	const categories = $derived(channelUIState.categories);

	/** Uncategorized channels. */
	const uncategorized = $derived.by((): string[] => {
		const categorized = new Set<string>();
		for (const cat of categories) {
			for (const ch of cat.channels) {
				categorized.add(ch);
			}
		}
		// Include any channels from config that aren't in UI categories
		const all = new Set<string>();
		if (config?.channels?.categories) {
			for (const cat of config.channels.categories) {
				for (const ch of cat.channels) {
					all.add(ch);
				}
			}
		}
		const result: string[] = [];
		for (const ch of all) {
			if (!categorized.has(ch)) {
				result.push(ch);
			}
		}
		return result.sort();
	});

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			onclose();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="settings-overlay" role="dialog" aria-modal="true" aria-label="Server Settings" tabindex="-1" onkeydown={handleKeydown}>
	<div class="settings-container">
		<!-- Left: navigation -->
		<nav class="settings-nav">
			<div class="nav-section">
				<span class="nav-section-title">{server?.name ?? 'Server'}</span>
				<button class="nav-item" class:active={activeTab === 'overview'} onclick={() => activeTab = 'overview'}>
					Overview
				</button>
				<button class="nav-item" class:active={activeTab === 'channels'} onclick={() => activeTab = 'channels'}>
					Channels
				</button>
			</div>
			<div class="nav-divider"></div>
			<div class="nav-section">
				<button class="nav-item disabled" disabled>Roles</button>
				<button class="nav-item disabled" disabled>Members</button>
				<button class="nav-item disabled" disabled>Invites</button>
				<button class="nav-item disabled" disabled>Appearance</button>
				<button class="nav-item disabled" disabled>Moderation</button>
			</div>
		</nav>

		<!-- Right: content -->
		<div class="settings-content">
			<div class="content-header">
				<h2 class="content-title">{tabTitle}</h2>
				<button class="close-btn" onclick={onclose} aria-label="Close settings">
					<svg width="18" height="18" viewBox="0 0 24 24">
						<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
					<span class="close-hint">ESC</span>
				</button>
			</div>

			<div class="content-body">
				{#if activeTab === 'overview'}
					<div class="overview-card">
						{#if server?.icon}
							<img class="server-icon-lg" src={server.icon} alt="{server.name} icon" />
						{:else}
							<div class="server-icon-lg placeholder">
								<span class="icon-letter">{(server?.name ?? 'S')[0].toUpperCase()}</span>
							</div>
						{/if}
						<div class="overview-details">
							<div class="overview-field">
								<span class="field-label">Server Name</span>
								<span class="field-value">{server?.name ?? 'Unknown'}</span>
							</div>
							{#if config?.description}
								<div class="overview-field">
									<span class="field-label">Description</span>
									<span class="field-value">{config.description}</span>
								</div>
							{/if}
							{#if config?.welcome?.message}
								<div class="overview-field">
									<span class="field-label">Welcome Message</span>
									<span class="field-value field-value-multiline">{config.welcome.message}</span>
								</div>
							{/if}
						</div>
					</div>

					{#if !config}
						<p class="hint-text">
							Server configuration not available. The server may not have a virc.json file.
						</p>
					{/if}

				{:else if activeTab === 'channels'}
					<div class="channels-section">
						{#each categories as cat (cat.name)}
							<div class="channel-category">
								<div class="category-header-row">
									<span class="category-label">{cat.name}</span>
									{#if cat.voice}
										<span class="category-badge">Voice</span>
									{/if}
									<span class="category-count">{cat.channels.length}</span>
								</div>
								<div class="category-channel-list">
									{#each cat.channels as ch (ch)}
										<div class="channel-row">
											{#if cat.voice}
												<svg class="channel-type-icon" width="14" height="14" viewBox="0 0 16 16">
													<path
														d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM5 8a1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V14H5a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9v-1.1A5 5 0 0 0 13 8a1 1 0 0 0-2 0 3 3 0 0 1-6 0z"
														fill="currentColor"
													/>
												</svg>
											{:else}
												<span class="channel-type-icon hash">#</span>
											{/if}
											<span class="channel-row-name">{ch.replace(/^#/, '')}</span>
										</div>
									{/each}
								</div>
							</div>
						{/each}

						{#if uncategorized.length > 0}
							<div class="channel-category">
								<div class="category-header-row">
									<span class="category-label">Uncategorized</span>
									<span class="category-count">{uncategorized.length}</span>
								</div>
								<div class="category-channel-list">
									{#each uncategorized as ch (ch)}
										<div class="channel-row">
											<span class="channel-type-icon hash">#</span>
											<span class="channel-row-name">{ch.replace(/^#/, '')}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if categories.length === 0 && uncategorized.length === 0}
							<p class="hint-text">No channels configured.</p>
						{/if}

						<p class="hint-text">
							Channel management (create, edit, delete, reorder) requires operator privileges and will be available in a future update.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.settings-overlay {
		position: fixed;
		inset: 0;
		z-index: 1200;
		background: var(--surface-lowest);
		display: flex;
		align-items: stretch;
		justify-content: center;
	}

	.settings-container {
		display: flex;
		width: 100%;
		max-width: 1200px;
		height: 100%;
	}

	/* ---- Navigation ---- */

	.settings-nav {
		width: 220px;
		min-width: 220px;
		background: var(--surface-low);
		padding: 60px 8px 20px 20px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-section {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.nav-section-title {
		font-size: var(--font-xs);
		font-weight: var(--weight-semibold);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 8px 12px 4px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 12px;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		color: var(--text-secondary);
		font-size: var(--font-base);
		font-family: var(--font-primary);
		text-align: left;
		transition: background var(--duration-channel), color var(--duration-channel);
	}

	.nav-item:hover {
		background: var(--surface-high);
		color: var(--text-primary);
	}

	.nav-item.active {
		background: var(--accent-bg);
		color: var(--text-primary);
		font-weight: var(--weight-medium);
	}

	.nav-item.disabled {
		color: var(--text-muted);
		cursor: default;
		opacity: 0.5;
	}

	.nav-item.disabled:hover {
		background: none;
		color: var(--text-muted);
	}

	.nav-divider {
		height: 1px;
		background: var(--surface-highest);
		margin: 8px 12px;
	}

	/* ---- Content ---- */

	.settings-content {
		flex: 1;
		max-width: 740px;
		padding: 60px 40px 20px 40px;
		overflow-y: auto;
		position: relative;
	}

	.content-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
	}

	.content-title {
		font-size: var(--font-lg);
		font-weight: var(--weight-semibold);
		color: var(--text-primary);
		margin: 0;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 2px solid var(--surface-highest);
		border-radius: 50%;
		width: 36px;
		height: 36px;
		cursor: pointer;
		color: var(--text-muted);
		transition: color var(--duration-channel), border-color var(--duration-channel);
		position: relative;
	}

	.close-btn:hover {
		color: var(--text-primary);
		border-color: var(--text-muted);
	}

	.close-hint {
		position: absolute;
		top: 40px;
		font-size: var(--font-xs);
		color: var(--text-muted);
		font-weight: var(--weight-semibold);
		letter-spacing: 0.04em;
	}

	.content-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* ---- Overview Tab ---- */

	.overview-card {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 16px;
		background: var(--surface-low);
		border-radius: 8px;
	}

	.server-icon-lg {
		width: 72px;
		height: 72px;
		border-radius: 16px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.server-icon-lg.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-primary);
	}

	.icon-letter {
		color: var(--text-inverse, #fff);
		font-size: var(--font-xl);
		font-weight: var(--weight-bold);
		line-height: 1;
	}

	.overview-details {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		flex: 1;
	}

	.overview-field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.field-label {
		font-size: var(--font-xs);
		font-weight: var(--weight-semibold);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.field-value {
		font-size: var(--font-base);
		color: var(--text-primary);
	}

	.field-value-multiline {
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.hint-text {
		font-size: var(--font-sm);
		color: var(--text-muted);
		font-style: italic;
		margin: 0;
	}

	/* ---- Channels Tab ---- */

	.channels-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.channel-category {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.category-header-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0;
	}

	.category-label {
		font-size: var(--font-sm);
		font-weight: var(--weight-semibold);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.category-badge {
		font-size: 10px;
		font-weight: var(--weight-semibold);
		color: var(--accent-primary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 1px 6px;
		background: var(--accent-bg);
		border-radius: 3px;
	}

	.category-count {
		font-size: var(--font-xs);
		color: var(--text-muted);
		margin-left: auto;
	}

	.category-channel-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.channel-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: var(--surface-low);
		border-radius: 4px;
	}

	.channel-type-icon {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: var(--font-md);
		font-weight: var(--weight-medium);
		line-height: 1;
	}

	.channel-type-icon.hash {
		font-size: var(--font-md);
	}

	.channel-row-name {
		font-size: var(--font-base);
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ---- Responsive ---- */

	@media (max-width: 768px) {
		.settings-nav {
			width: 180px;
			min-width: 180px;
			padding: 20px 8px 20px 12px;
		}

		.settings-content {
			padding: 20px 16px;
		}
	}

	@media (max-width: 600px) {
		.settings-container {
			flex-direction: column;
		}

		.settings-nav {
			width: 100%;
			min-width: unset;
			flex-direction: row;
			flex-wrap: wrap;
			padding: 12px;
			gap: 4px;
			overflow-y: visible;
			overflow-x: auto;
		}

		.nav-section {
			flex-direction: row;
			gap: 4px;
		}

		.nav-section-title {
			display: none;
		}

		.nav-divider {
			display: none;
		}

		.settings-content {
			flex: 1;
			overflow-y: auto;
		}
	}
</style>
