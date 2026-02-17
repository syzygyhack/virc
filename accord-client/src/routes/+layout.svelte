<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { appSettings } from '$lib/state/appSettings.svelte';

  // Apply zoom by scaling the CSS font-size tokens on :root.
  // This avoids CSS zoom which breaks viewport units and causes scrollbars.
  // Everything in the app is sized via --font-* vars, so scaling them
  // effectively zooms the entire UI while keeping layout intact.
  const baseSizes = { xs: 11, sm: 12, base: 14, md: 16, lg: 20, xl: 24 };
  $effect(() => {
    const scale = appSettings.zoom / 100;
    const root = document.documentElement.style;
    root.setProperty('--font-xs', `${Math.round(baseSizes.xs * scale)}px`);
    root.setProperty('--font-sm', `${Math.round(baseSizes.sm * scale)}px`);
    root.setProperty('--font-base', `${Math.round(baseSizes.base * scale)}px`);
    root.setProperty('--font-md', `${Math.round(baseSizes.md * scale)}px`);
    root.setProperty('--font-lg', `${Math.round(baseSizes.lg * scale)}px`);
    root.setProperty('--font-xl', `${Math.round(baseSizes.xl * scale)}px`);
  });

  onMount(() => {
    // Dismiss the inline splash screen (defined in app.html).
    // Fade out then remove so the transition is smooth.
    const splash = document.getElementById('app-splash');
    if (splash) {
      splash.classList.add('hiding');
      setTimeout(() => splash.remove(), 200);
    }

    // Intercept clicks on external links and open in the system browser.
    // In Tauri, <a target="_blank"> navigates the WebView rather than
    // opening the OS default browser. This handler fixes that.
    function handleLinkClick(e: MouseEvent): void {
      const anchor = (e.target as HTMLElement).closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      if (!href.startsWith('http://') && !href.startsWith('https://')) return;

      e.preventDefault();

      // Use Tauri opener plugin if available, otherwise fall back to window.open
      import('@tauri-apps/plugin-opener')
        .then(({ openUrl }) => openUrl(href))
        .catch(() => window.open(href, '_blank'));
    }

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  });
</script>

<slot />
