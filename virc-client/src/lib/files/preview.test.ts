import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	fetchPreview,
	extractPreviewUrl,
	clearPreviewCache,
	getCachedPreview,
	type LinkPreview,
} from './preview';

describe('fetchPreview', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		vi.stubGlobal('fetch', mockFetch);
		clearPreviewCache();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('fetches preview from /api/preview with auth header', async () => {
		const preview: LinkPreview = {
			title: 'Example Page',
			description: 'A description',
			image: 'https://example.com/thumb.jpg',
			siteName: 'Example',
			url: 'https://example.com/page',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(preview),
		});

		const result = await fetchPreview(
			'https://example.com/page',
			'jwt-token',
			'https://files.example.com',
		);

		expect(result).toEqual(preview);
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toBe(
			'https://files.example.com/api/preview?url=https%3A%2F%2Fexample.com%2Fpage',
		);
		expect(options.headers['Authorization']).toBe('Bearer jwt-token');
	});

	it('returns null when server returns error', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 502,
		});

		const result = await fetchPreview(
			'https://example.com/broken',
			'token',
			'https://files.example.com',
		);

		expect(result).toBeNull();
	});

	it('returns null on network error', async () => {
		mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

		const result = await fetchPreview(
			'https://example.com/offline',
			'token',
			'https://files.example.com',
		);

		expect(result).toBeNull();
	});

	it('returns null when response has no title or description', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					title: null,
					description: null,
					image: null,
					siteName: null,
					url: 'https://example.com/empty',
				}),
		});

		const result = await fetchPreview(
			'https://example.com/empty',
			'token',
			'https://files.example.com',
		);

		expect(result).toBeNull();
	});

	it('caches results and does not re-fetch', async () => {
		const preview: LinkPreview = {
			title: 'Cached Page',
			description: 'Cached description',
			image: null,
			siteName: null,
			url: 'https://example.com/cached',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(preview),
		});

		const result1 = await fetchPreview(
			'https://example.com/cached',
			'token',
			'https://files.example.com',
		);
		const result2 = await fetchPreview(
			'https://example.com/cached',
			'token',
			'https://files.example.com',
		);

		expect(result1).toEqual(preview);
		expect(result2).toEqual(preview);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('caches null results to prevent re-fetching failures', async () => {
		mockFetch.mockResolvedValue({ ok: false, status: 502 });

		await fetchPreview('https://example.com/fail', 'token', 'https://files.example.com');
		await fetchPreview('https://example.com/fail', 'token', 'https://files.example.com');

		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('strips trailing slash from filesUrl', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					title: 'Test',
					description: null,
					image: null,
					siteName: null,
					url: 'https://example.com',
				}),
		});

		await fetchPreview('https://example.com', 'token', 'https://files.example.com/');

		const [url] = mockFetch.mock.calls[0];
		expect(url).toContain('https://files.example.com/api/preview');
		expect(url).not.toContain('//api/preview');
	});
});

describe('getCachedPreview', () => {
	beforeEach(() => {
		clearPreviewCache();
	});

	it('returns undefined for uncached URLs', () => {
		expect(getCachedPreview('https://example.com/new')).toBeUndefined();
	});
});

describe('extractPreviewUrl', () => {
	it('extracts the first URL from message text', () => {
		expect(extractPreviewUrl('Check out https://example.com/page for details')).toBe(
			'https://example.com/page',
		);
	});

	it('returns null for text with no URLs', () => {
		expect(extractPreviewUrl('Hello world, no links here')).toBeNull();
	});

	it('skips image URLs', () => {
		expect(extractPreviewUrl('Look at https://cdn.example.com/photo.jpg')).toBeNull();
	});

	it('skips video URLs', () => {
		expect(extractPreviewUrl('Watch https://cdn.example.com/video.mp4')).toBeNull();
	});

	it('skips audio URLs', () => {
		expect(extractPreviewUrl('Listen to https://cdn.example.com/song.mp3')).toBeNull();
	});

	it('returns first non-media URL when message has both', () => {
		const text = 'https://cdn.example.com/photo.png and https://blog.example.com/post';
		expect(extractPreviewUrl(text)).toBe('https://blog.example.com/post');
	});

	it('handles URLs with query strings', () => {
		expect(
			extractPreviewUrl('See https://example.com/page?foo=bar&baz=qux'),
		).toBe('https://example.com/page?foo=bar&baz=qux');
	});

	it('skips media URLs with query strings', () => {
		expect(
			extractPreviewUrl('See https://cdn.example.com/img.png?w=200'),
		).toBeNull();
	});

	it('handles http URLs', () => {
		expect(extractPreviewUrl('Old site http://example.com/page')).toBe(
			'http://example.com/page',
		);
	});
});
