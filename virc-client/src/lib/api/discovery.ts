/**
 * Derives an HTTP base URL from a WebSocket URL.
 *
 * In production, the WebSocket and HTTP API share the same host
 * (Caddy proxies both), so we derive from the WebSocket URL.
 * In dev mode, WebSocket goes direct to Ergo (port 8097) but HTTP
 * API requests need to go through the Vite dev server (same origin)
 * which proxies /api and /.well-known to virc-files.
 *
 *   ws://localhost:8097       → http://localhost:5173 (dev, uses page origin)
 *   ws://localhost/ws         → http://localhost
 *   wss://chat.example.com/ws → https://chat.example.com
 */
export function deriveHttpUrl(wsUrl: string): string {
	// In dev mode, use the page origin so HTTP requests go through
	// the Vite proxy (which correctly forwards /api and /.well-known).
	if (import.meta.env.DEV && typeof window !== 'undefined') {
		return window.location.origin;
	}
	const url = new URL(wsUrl);
	const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
	return `${protocol}//${url.host}`;
}

/**
 * Discover the files API base URL from a WebSocket URL.
 *
 * Probes `/.well-known/virc.json` at the derived HTTP origin. If the
 * config includes an explicit `filesUrl`, that wins. Otherwise the
 * derived origin is used (same-origin assumption).
 *
 * Returns null if the probe fails — the caller should treat files
 * features as unavailable.
 */
export async function discoverFilesUrl(wsUrl: string): Promise<string | null> {
	const httpBase = deriveHttpUrl(wsUrl);

	try {
		const res = await fetch(`${httpBase}/.well-known/virc.json`, {
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) return null;

		const config = (await res.json()) as Record<string, unknown>;
		if (typeof config.filesUrl === 'string') {
			return config.filesUrl;
		}
		return httpBase;
	} catch {
		return null;
	}
}
