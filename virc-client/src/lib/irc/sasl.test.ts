import { describe, it, expect, vi } from 'vitest';
import { authenticateSASL } from './sasl';
import type { IRCConnection } from './connection';

function createMockConn() {
	const sent: string[] = [];
	const listeners = new Map<string, ((...args: any[]) => void)[]>();

	const conn = {
		send(line: string) {
			sent.push(line);
		},
		on(event: string, handler: (...args: any[]) => void) {
			if (!listeners.has(event)) listeners.set(event, []);
			listeners.get(event)!.push(handler);
		},
		off(event: string, handler: (...args: any[]) => void) {
			const list = listeners.get(event);
			if (!list) return false;
			const idx = list.indexOf(handler);
			if (idx !== -1) list.splice(idx, 1);
			return true;
		},
		simulateMessage(line: string) {
			for (const h of [...(listeners.get('message') ?? [])]) {
				h(line);
			}
		},
		simulateClose() {
			for (const h of [...(listeners.get('close') ?? [])]) {
				h();
			}
		},
		simulateError() {
			for (const h of [...(listeners.get('error') ?? [])]) {
				h();
			}
		},
	} as unknown as IRCConnection & {
		simulateMessage: (line: string) => void;
		simulateClose: () => void;
		simulateError: () => void;
	};

	return { conn, sent };
}

describe('authenticateSASL', () => {
	it('sends AUTHENTICATE PLAIN on start', () => {
		const { conn, sent } = createMockConn();
		authenticateSASL(conn, 'testuser', 'testpass');
		expect(sent).toContain('AUTHENTICATE PLAIN');
	});

	it('sends base64-encoded credentials after AUTHENTICATE +', async () => {
		const { conn, sent } = createMockConn();
		const promise = authenticateSASL(conn, 'testuser', 'testpass');

		conn.simulateMessage('AUTHENTICATE +');

		// Expected: \0testuser\0testpass in base64
		const expected = btoa('\0testuser\0testpass');
		expect(sent).toContain(`AUTHENTICATE ${expected}`);

		// Complete the auth
		conn.simulateMessage(':server 903 * :SASL authentication successful');
		await promise;
	});

	it('resolves on 903 (SASL success)', async () => {
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		conn.simulateMessage('AUTHENTICATE +');
		conn.simulateMessage(':server 903 * :SASL authentication successful');

		await expect(promise).resolves.toBeUndefined();
	});

	it('sends CAP END after successful auth', async () => {
		const { conn, sent } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		conn.simulateMessage('AUTHENTICATE +');
		conn.simulateMessage(':server 903 * :SASL authentication successful');

		await promise;
		expect(sent).toContain('CAP END');
	});

	it('rejects on 904 (SASL fail)', async () => {
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'wrongpass');

		conn.simulateMessage('AUTHENTICATE +');
		conn.simulateMessage(':server 904 * :SASL authentication failed');

		await expect(promise).rejects.toThrow('SASL authentication failed');
	});

	it('rejects on 905 (SASL too long)', async () => {
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		conn.simulateMessage('AUTHENTICATE +');
		conn.simulateMessage(':server 905 * :SASL message too long');

		await expect(promise).rejects.toThrow('SASL message too long');
	});

	it('does not send CAP END on failure', async () => {
		const { conn, sent } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'wrongpass');

		conn.simulateMessage('AUTHENTICATE +');
		conn.simulateMessage(':server 904 * :SASL authentication failed');

		await expect(promise).rejects.toThrow();
		expect(sent).not.toContain('CAP END');
	});

	it('ignores unrelated messages during auth', async () => {
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		// These should be ignored
		conn.simulateMessage(':server NOTICE * :*** Looking up your hostname');
		conn.simulateMessage(':server 001 user :Welcome');

		conn.simulateMessage('AUTHENTICATE +');
		conn.simulateMessage(':server 903 * :SASL authentication successful');

		await expect(promise).resolves.toBeUndefined();
	});

	it('rejects when connection closes during auth', async () => {
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		conn.simulateClose();

		await expect(promise).rejects.toThrow('Connection closed during SASL authentication');
	});

	it('rejects when connection errors during auth', async () => {
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		conn.simulateError();

		await expect(promise).rejects.toThrow('Connection error during SASL authentication');
	});

	it('rejects on timeout when server never responds', async () => {
		vi.useFakeTimers();
		const { conn } = createMockConn();
		const promise = authenticateSASL(conn, 'user', 'pass');

		vi.advanceTimersByTime(10_001);

		await expect(promise).rejects.toThrow('SASL authentication timed out');
		vi.useRealTimers();
	});
});
