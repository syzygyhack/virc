<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

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
