<script lang="ts">
	import { tick } from 'svelte';
	import { rawIrcLog, clearRawLog } from '$lib/state/rawIrcLog.svelte';

	let scrollContainer: HTMLPreElement | undefined = $state(undefined);
	let autoScroll = $state(true);

	/** Auto-scroll to bottom when new lines arrive. */
	$effect(() => {
		const _len = rawIrcLog.lines.length; // subscribe to changes
		if (autoScroll && scrollContainer) {
			tick().then(() => {
				if (scrollContainer) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			});
		}
	});

	function handleScroll(): void {
		if (!scrollContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
		autoScroll = scrollHeight - scrollTop - clientHeight <= 24;
	}
</script>

<div class="raw-irc-panel">
	<div class="raw-irc-header">
		<span class="raw-irc-title">Raw IRC</span>
		<span class="raw-irc-count">{rawIrcLog.lines.length} lines</span>
		<button class="raw-irc-clear" onclick={clearRawLog}>Clear</button>
	</div>
	<pre
		class="raw-irc-log"
		bind:this={scrollContainer}
		onscroll={handleScroll}
	>{#each rawIrcLog.lines as entry}<code class="raw-line" class:raw-out={entry.direction === 'out'}><span class="raw-dir">{entry.direction === 'in' ? '\u2190' : '\u2192'}</span> {entry.line}
</code>{/each}</pre>
</div>

<style>
	.raw-irc-panel {
		display: flex;
		flex-direction: column;
		height: 200px;
		min-height: 120px;
		border-top: 1px solid var(--surface-highest);
		background: var(--surface-lowest);
	}

	.raw-irc-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px;
		background: var(--surface-low);
		border-bottom: 1px solid var(--surface-highest);
		flex-shrink: 0;
	}

	.raw-irc-title {
		font-size: var(--font-xs);
		font-weight: var(--weight-semibold);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.raw-irc-count {
		font-size: var(--font-xs);
		color: var(--text-muted);
		margin-left: auto;
	}

	.raw-irc-clear {
		padding: 2px 8px;
		background: var(--surface-high);
		color: var(--text-secondary);
		border: none;
		border-radius: 3px;
		font-size: var(--font-xs);
		font-family: var(--font-primary);
		cursor: pointer;
	}

	.raw-irc-clear:hover {
		background: var(--surface-highest);
		color: var(--text-primary);
	}

	.raw-irc-log {
		flex: 1;
		overflow-y: auto;
		overflow-x: auto;
		margin: 0;
		padding: 4px 12px;
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.4;
		white-space: pre;
		color: var(--text-secondary);
	}

	.raw-line {
		display: block;
	}

	.raw-out {
		color: var(--text-muted);
	}

	.raw-dir {
		color: var(--text-muted);
		margin-right: 4px;
	}
</style>
