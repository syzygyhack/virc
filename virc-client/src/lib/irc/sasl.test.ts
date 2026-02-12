import { describe, it, expect } from 'vitest';
import { authenticateSASL } from './sasl';
import type { IRCConnection } from './connection';

function createMockConn() {
	const sent: string[] = [];
	const handlers: ((line: string) => void)[] = [];

	const conn = {
		send(line: string) {
			sent.push(line);
		},
		on(event: string, handler: (...args: any[]) => void) {
			if (event === 'message') {
				handlers.push(handler as (line: string) => void);
			}
		},
		off(event: string, handler: (...args: any[]) => void) {
			if (event === 'message') {
				const idx = handlers.indexOf(handler as (line: string) => void);
				if (idx !== -1) handlers.splice(idx, 1);
			}
			return true;
		},
		simulateMessage(line: string) {
			for (const h of [...handlers]) {
				h(line);
			}
		}
	} as unknown as IRCConnection & { simulateMessage: (line: string) => void };

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
});
