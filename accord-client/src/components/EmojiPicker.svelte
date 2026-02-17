<script lang="ts">
	import { onDestroy } from 'svelte';
	import { categories, searchEmoji, searchCustomEmoji, getFrequentEmoji, recordEmojiUse, getCustomEmojiList, type EmojiEntry, type CustomEmoji } from '$lib/emoji';

	interface Props {
		onselect?: (emoji: string) => void;
		onclose?: () => void;
	}

	let { onselect, onclose }: Props = $props();

	let query = $state('');
	let searchInput: HTMLInputElement | undefined = $state();
	let pickerEl: HTMLDivElement | undefined = $state();
	let emojiScrollEl: HTMLDivElement | undefined = $state();

	let searchResults = $derived(query.trim() ? searchEmoji(query) : null);
	let customSearchResults = $derived(query.trim() ? searchCustomEmoji(query) : null);
	let customEmoji = $derived(getCustomEmojiList());
	let frequentEmoji = $state(getFrequentEmoji());

	let frequentEntries = $derived(
		frequentEmoji
			.map((char) => {
				for (const cat of categories) {
					const found = cat.emoji.find((e) => e.emoji === char);
					if (found) return found;
				}
				return null;
			})
			.filter((e): e is EmojiEntry => e !== null)
	);

	// ── Lazy category rendering ─────────────────────────────────────────
	// Only render emoji grids for categories whose sentinel has entered the
	// viewport (with a generous rootMargin for pre-loading). Once visible,
	// a category stays rendered — no un-mounting on scroll-away.

	/** Set of category names that have been visible.
	 *  Pre-seed with top-of-scroll categories so they render immediately. */
	let visibleCategories: Set<string> = $state(new Set(['Frequent', 'Server', 'Smileys']));

	let observer: IntersectionObserver | undefined;

	function setupObserver(scrollRoot: HTMLElement): void {
		observer = new IntersectionObserver(
			(entries) => {
				let changed = false;
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const name = (entry.target as HTMLElement).dataset.category;
						if (name && !visibleCategories.has(name)) {
							visibleCategories.add(name);
							changed = true;
						}
					}
				}
				if (changed) {
					visibleCategories = new Set(visibleCategories);
				}
			},
			{ root: scrollRoot, rootMargin: '200px 0px' }
		);
	}

	/** Svelte action: register a category sentinel element with the observer. */
	function observeCategory(el: HTMLElement): { destroy: () => void } {
		observer?.observe(el);
		return { destroy: () => observer?.unobserve(el) };
	}

	/** Initialize observer when scroll container mounts. */
	$effect(() => {
		if (emojiScrollEl) {
			setupObserver(emojiScrollEl);
		}
		return () => observer?.disconnect();
	});

	onDestroy(() => {
		observer?.disconnect();
	});

	$effect(() => {
		searchInput?.focus();
	});

	function handleSelect(emoji: string) {
		recordEmojiUse(emoji);
		frequentEmoji = getFrequentEmoji();
		onselect?.(emoji);
	}

	function handleCustomSelect(name: string) {
		const emojiText = `:${name}:`;
		onselect?.(emojiText);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose?.();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (pickerEl && !pickerEl.contains(event.target as Node)) {
			onclose?.();
		}
	}

	$effect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
</script>

<div
	class="emoji-picker"
	role="dialog"
	aria-modal="true"
	aria-label="Emoji picker"
	tabindex="-1"
	bind:this={pickerEl}
	onkeydown={handleKeydown}
>
	<div class="emoji-search">
		<input
			bind:this={searchInput}
			bind:value={query}
			type="text"
			placeholder="Search emoji..."
			class="emoji-search-input"
		/>
	</div>

	<div class="emoji-scroll" bind:this={emojiScrollEl}>
		{#if searchResults}
			{#if customSearchResults && customSearchResults.length > 0}
				<div class="emoji-category">
					<div class="emoji-category-header">Server</div>
					<div class="emoji-grid">
						{#each customSearchResults as entry (entry.name)}
							<button
								class="emoji-btn emoji-btn-custom"
								title={entry.name}
								onclick={() => handleCustomSelect(entry.name)}
							>
								<img class="custom-emoji-img" src={entry.url} alt={entry.name} loading="lazy" />
							</button>
						{/each}
					</div>
				</div>
			{/if}
			<div class="emoji-grid">
				{#each searchResults as entry (entry.emoji)}
					<button
						class="emoji-btn"
						title={entry.name}
						onclick={() => handleSelect(entry.emoji)}
					>
						{entry.emoji}
					</button>
				{/each}
			</div>
			{#if searchResults.length === 0 && (!customSearchResults || customSearchResults.length === 0)}
				<div class="emoji-empty">No emoji found</div>
			{/if}
		{:else}
			{#if frequentEntries.length > 0}
				<div class="emoji-category" data-category="Frequent" use:observeCategory>
					<div class="emoji-category-header">Frequently Used</div>
					{#if visibleCategories.has('Frequent')}
						<div class="emoji-grid">
							{#each frequentEntries as entry (entry.emoji)}
								<button
									class="emoji-btn"
									title={entry.name}
									onclick={() => handleSelect(entry.emoji)}
								>
									{entry.emoji}
								</button>
							{/each}
						</div>
					{:else}
						<div class="emoji-grid-placeholder" style="height:{Math.ceil(frequentEntries.length / 8) * 40}px"></div>
					{/if}
				</div>
			{/if}

			{#if customEmoji.length > 0}
				<div class="emoji-category" data-category="Server" use:observeCategory>
					<div class="emoji-category-header">Server</div>
					{#if visibleCategories.has('Server')}
						<div class="emoji-grid">
							{#each customEmoji as entry (entry.name)}
								<button
									class="emoji-btn emoji-btn-custom"
									title={entry.name}
									onclick={() => handleCustomSelect(entry.name)}
								>
									<img class="custom-emoji-img" src={entry.url} alt={entry.name} loading="lazy" />
								</button>
							{/each}
						</div>
					{:else}
						<div class="emoji-grid-placeholder" style="height:{Math.ceil(customEmoji.length / 8) * 40}px"></div>
					{/if}
				</div>
			{/if}

			{#each categories as category (category.name)}
				<div class="emoji-category" data-category={category.name} use:observeCategory>
					<div class="emoji-category-header">{category.name}</div>
					{#if visibleCategories.has(category.name)}
						<div class="emoji-grid">
							{#each category.emoji as entry (entry.emoji)}
								<button
									class="emoji-btn"
									title={entry.name}
									onclick={() => handleSelect(entry.emoji)}
								>
									{entry.emoji}
								</button>
							{/each}
						</div>
					{:else}
						<div class="emoji-grid-placeholder" style="height:{Math.ceil(category.emoji.length / 8) * 40}px"></div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.emoji-picker {
		position: absolute;
		z-index: 1000;
		width: 352px;
		max-height: 400px;
		display: flex;
		flex-direction: column;
		background: var(--surface-low);
		border: 1px solid var(--surface-highest);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}

	.emoji-search {
		padding: 8px;
		border-bottom: 1px solid var(--surface-highest);
	}

	.emoji-search-input {
		width: 100%;
		padding: 6px 10px;
		background: var(--surface-base);
		border: 1px solid var(--surface-highest);
		border-radius: 4px;
		color: var(--text-primary);
		font-family: var(--font-primary);
		font-size: var(--font-sm);
		outline: none;
	}

	.emoji-search-input::placeholder {
		color: var(--text-muted);
	}

	.emoji-search-input:focus {
		border-color: var(--accent-primary);
	}

	.emoji-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 4px 8px 8px;
	}

	.emoji-category {
		margin-bottom: 4px;
	}

	.emoji-category-header {
		position: sticky;
		top: 0;
		padding: 6px 4px 4px;
		font-size: var(--font-xs);
		font-weight: var(--weight-semibold);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: var(--surface-low);
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 2px;
	}

	.emoji-grid-placeholder {
		/* Reserves approximate space for lazy-loaded emoji grids to prevent scroll jumps. */
		min-height: 0;
	}

	.emoji-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		font-size: 22px;
		line-height: 1;
		cursor: pointer;
		transition: background var(--duration-message) ease;
	}

	.emoji-btn:hover {
		background: var(--surface-highest);
	}

	.emoji-btn:active {
		background: var(--accent-bg);
	}

	.emoji-btn-custom {
		padding: 4px;
	}

	.custom-emoji-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.emoji-empty {
		padding: 24px;
		text-align: center;
		color: var(--text-muted);
		font-size: var(--font-sm);
	}
</style>
