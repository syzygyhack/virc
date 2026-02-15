/**
 * Link preview fetching for URL metadata (Open Graph cards).
 *
 * Fetches OG metadata from the virc-files /api/preview endpoint
 * and caches results client-side to avoid duplicate requests.
 */

export interface LinkPreview {
	title: string | null;
	description: string | null;
	image: string | null;
	siteName: string | null;
	url: string;
}

const CACHE_MAX_SIZE = 50;

/** Client-side cache for preview results (URL -> preview data). */
const cache = new Map<string, LinkPreview | null>();

/**
 * Evict oldest entries when cache exceeds max size.
 */
function evictCache(): void {
	if (cache.size <= CACHE_MAX_SIZE) return;
	const excess = cache.size - CACHE_MAX_SIZE;
	const keys = cache.keys();
	for (let i = 0; i < excess; i++) {
		const { value } = keys.next();
		if (value) cache.delete(value);
	}
}

/**
 * Fetch link preview metadata for a URL via the virc-files server.
 *
 * Returns cached result if available. Returns null on error or if
 * the server returns no useful metadata.
 */
export async function fetchPreview(
	url: string,
	token: string,
	filesUrl: string,
): Promise<LinkPreview | null> {
	// Return cached result (including null for failed fetches)
	if (cache.has(url)) {
		return cache.get(url) ?? null;
	}

	const baseUrl = filesUrl.replace(/\/+$/, '');

	try {
		const res = await fetch(
			`${baseUrl}/api/preview?url=${encodeURIComponent(url)}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!res.ok) {
			cache.set(url, null);
			evictCache();
			return null;
		}

		const data = (await res.json()) as LinkPreview;

		// Only cache if there's at least a title or description
		const preview = data.title || data.description ? data : null;
		cache.set(url, preview);
		evictCache();
		return preview;
	} catch {
		cache.set(url, null);
		evictCache();
		return null;
	}
}

/**
 * Check if a preview is already cached for a URL.
 */
export function getCachedPreview(url: string): LinkPreview | null | undefined {
	return cache.get(url);
}

/**
 * Clear the preview cache (useful for testing).
 */
export function clearPreviewCache(): void {
	cache.clear();
}

/** Media file extensions that get inline previews (images, video, audio). */
const MEDIA_EXTENSIONS = /\.(jpe?g|png|gif|webp|mp4|webm|mp3|ogg|flac)(\?|#|$)/i;

/**
 * Extract the first non-media URL from message text.
 *
 * Skips URLs that point to media files (those get inline previews instead).
 * Returns null if no eligible URL is found.
 */
export function extractPreviewUrl(text: string): string | null {
	const urlPattern = /https?:\/\/[^\s<>"]+/g;
	let match: RegExpExecArray | null;

	while ((match = urlPattern.exec(text)) !== null) {
		const url = match[0];
		// Strip query/hash for extension check
		const path = url.replace(/[?#].*$/, '');
		if (!MEDIA_EXTENSIONS.test(path)) {
			return url;
		}
	}

	return null;
}
