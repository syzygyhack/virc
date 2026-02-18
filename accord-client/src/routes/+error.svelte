<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="error-page">
	<div class="error-card">
		<h1>{$page.status}</h1>
		<p>{$page.error?.message ?? 'Page not found'}</p>
		<a href="/">Return home</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--surface-lowest, #1a1a2e);
		color: var(--text-primary, #e0e0e0);
		font-family: var(--font-primary, system-ui, sans-serif);
	}

	.error-card {
		text-align: center;
		padding: 48px;
	}

	h1 {
		font-size: 72px;
		font-weight: 700;
		margin: 0 0 8px;
		color: var(--text-primary, #e0e0e0);
		line-height: 1;
	}

	p {
		font-size: var(--font-md, 16px);
		color: var(--text-muted, #888);
		margin: 0 0 24px;
	}

	a {
		color: var(--accent-primary, #5b8af5);
		text-decoration: none;
		font-size: var(--font-sm, 13px);
	}

	a:hover {
		text-decoration: underline;
	}
</style>
