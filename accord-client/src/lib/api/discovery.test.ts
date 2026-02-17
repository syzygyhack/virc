import { describe, test, expect, vi, afterEach } from 'vitest';
import { deriveHttpUrl, discoverFilesUrl } from './discovery';

describe('deriveHttpUrl', () => {
	// In Vitest, import.meta.env.DEV is true but window is undefined,
	// so the production derivation path runs. This tests both the guard
	// and the URL derivation logic.

	test('ws:// with port becomes http:// preserving port', () => {
		expect(deriveHttpUrl('ws://example.com:8097')).toBe('http://example.com:8097');
	});

	test('wss:// becomes https://', () => {
		expect(deriveHttpUrl('wss://chat.example.com/ws')).toBe('https://chat.example.com');
	});

	test('strips path but preserves port', () => {
		expect(deriveHttpUrl('ws://example.com:8097/ws')).toBe('http://example.com:8097');
	});

	test('localhost with non-standard port', () => {
		expect(deriveHttpUrl('ws://localhost:5173/ws')).toBe('http://localhost:5173');
	});

	test('localhost without explicit port', () => {
		expect(deriveHttpUrl('ws://localhost/ws')).toBe('http://localhost');
	});

	test('preserves hostname with subdomain, strips default port', () => {
		expect(deriveHttpUrl('wss://irc.virc.example.com:443/ws')).toBe(
			'https://irc.virc.example.com',
		);
	});
});

describe('discoverFilesUrl', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	test('returns httpBase when virc.json exists without filesUrl', async () => {
		globalThis.fetch = vi.fn(async () =>
			new Response(JSON.stringify({ name: 'test' }), { status: 200 }),
		) as typeof fetch;

		const result = await discoverFilesUrl('ws://example.com:8097');
		expect(result).toBe('http://example.com:8097');
		expect(globalThis.fetch).toHaveBeenCalledOnce();
	});

	test('returns filesUrl from virc.json when present', async () => {
		globalThis.fetch = vi.fn(async () =>
			new Response(
				JSON.stringify({ name: 'test', filesUrl: 'https://files.example.com' }),
				{ status: 200 },
			),
		) as typeof fetch;

		const result = await discoverFilesUrl('ws://example.com:8097');
		expect(result).toBe('https://files.example.com');
	});

	test('returns null on 404', async () => {
		globalThis.fetch = vi.fn(async () =>
			new Response('', { status: 404 }),
		) as typeof fetch;

		const result = await discoverFilesUrl('ws://example.com:8097');
		expect(result).toBeNull();
	});

	test('returns null on network error', async () => {
		globalThis.fetch = vi.fn(async () => {
			throw new Error('ECONNREFUSED');
		}) as typeof fetch;

		const result = await discoverFilesUrl('ws://example.com:8097');
		expect(result).toBeNull();
	});
});
