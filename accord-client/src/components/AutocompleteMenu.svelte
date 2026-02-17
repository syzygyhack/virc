<script module lang="ts">
	export interface CompletionItem {
		label: string;
		value: string;
		detail?: string;
	}
</script>

<script lang="ts">
	interface Props {
		items: CompletionItem[];
		selectedIndex: number;
		onselect: (item: CompletionItem) => void;
		onhover: (index: number) => void;
	}

	let { items, selectedIndex, onselect, onhover }: Props = $props();

	let listEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		void selectedIndex;
		requestAnimationFrame(() => {
			const el = listEl?.querySelector('.selected');
			el?.scrollIntoView({ block: 'nearest' });
		});
	});
</script>

{#if items.length > 0}
	<div class="autocomplete-menu" bind:this={listEl}>
		{#each items as item, i (item.value)}
			<button
				class="ac-item"
				class:selected={i === selectedIndex}
				onmousedown={(e) => { e.preventDefault(); onselect(item); }}
				onmouseenter={() => onhover(i)}
			>
				<span class="ac-label">{item.label}</span>
				{#if item.detail}
					<span class="ac-detail">{item.detail}</span>
				{/if}
			</button>
		{/each}
	</div>
{/if}

<style>
	.autocomplete-menu {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		max-height: 240px;
		overflow-y: auto;
		background: var(--surface-high);
		border-radius: 8px 8px 0 0;
		border: 1px solid var(--surface-highest);
		border-bottom: none;
		display: flex;
		flex-direction: column;
		z-index: 100;
		padding: 4px 0;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
	}

	.ac-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 14px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--text-primary);
		font-family: var(--font-primary);
		font-size: var(--font-base);
		transition: background 0.06s ease;
	}

	.ac-item.selected {
		background: var(--accent-bg);
	}

	.ac-item:hover {
		background: var(--accent-bg);
	}

	.ac-label {
		font-weight: var(--weight-medium);
		flex-shrink: 0;
	}

	.ac-detail {
		color: var(--text-muted);
		font-size: var(--font-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}
</style>
