import { describe, it, expect, vi } from 'vitest';
import { negotiateCaps, MVP_CAPS } from './cap';
import type { IRCConnection } from './connection';

/**
 * Create a mock IRCConnection that records sent lines and allows
 * simulating incoming messages.
 */
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
		// Test helper: simulate receiving a raw IRC line
		simulateMessage(line: string) {
			for (const h of [...handlers]) {
				h(line);
			}
		}
	} as unknown as IRCConnection & { simulateMessage: (line: string) => void };

	return { conn, sent, handlers };
}

describe('negotiateCaps', () => {
	it('sends CAP LS 302 on start', () => {
		const { conn, sent } = createMockConn();
		// Start negotiation (don't await — we need to feed responses)
		negotiateCaps(conn);
		expect(sent).toContain('CAP LS 302');
	});

	it('requests MVP caps that the server advertises', async () => {
		const { conn, sent } = createMockConn();
		const promise = negotiateCaps(conn);

		// Server advertises a subset of caps
		conn.simulateMessage(':server CAP * LS :sasl message-tags echo-message server-time');

		// Should have sent CAP REQ with those caps
		const reqLine = sent.find((s) => s.startsWith('CAP REQ'));
		expect(reqLine).toBeDefined();
		expect(reqLine).toContain('sasl');
		expect(reqLine).toContain('message-tags');
		expect(reqLine).toContain('echo-message');
		expect(reqLine).toContain('server-time');

		// Server ACKs
		conn.simulateMessage(':server CAP * ACK :sasl message-tags echo-message server-time');

		const result = await promise;
		expect(result).toEqual(['sasl', 'message-tags', 'echo-message', 'server-time']);
	});

	it('handles multiline CAP LS responses', async () => {
		const { conn, sent } = createMockConn();
		const promise = negotiateCaps(conn);

		// First line: multiline indicator '*'
		conn.simulateMessage(':server CAP * LS * :sasl message-tags echo-message');
		// Second line: final (no '*')
		conn.simulateMessage(':server CAP * LS :server-time batch');

		// Should request all 5 caps
		const reqLine = sent.find((s) => s.startsWith('CAP REQ'));
		expect(reqLine).toBeDefined();
		expect(reqLine).toContain('sasl');
		expect(reqLine).toContain('message-tags');
		expect(reqLine).toContain('echo-message');
		expect(reqLine).toContain('server-time');
		expect(reqLine).toContain('batch');

		// Server ACKs
		conn.simulateMessage(':server CAP * ACK :sasl message-tags echo-message server-time batch');

		const result = await promise;
		expect(result).toHaveLength(5);
	});

	it('only requests caps in the MVP list', async () => {
		const { conn, sent } = createMockConn();
		const promise = negotiateCaps(conn);

		// Server advertises some caps we don't want
		conn.simulateMessage(':server CAP * LS :sasl unknown-cap another-unknown message-tags');

		const reqLine = sent.find((s) => s.startsWith('CAP REQ'));
		expect(reqLine).toBeDefined();
		expect(reqLine).toContain('sasl');
		expect(reqLine).toContain('message-tags');
		expect(reqLine).not.toContain('unknown-cap');
		expect(reqLine).not.toContain('another-unknown');

		conn.simulateMessage(':server CAP * ACK :sasl message-tags');
		const result = await promise;
		expect(result).toEqual(['sasl', 'message-tags']);
	});

	it('handles cap values (cap=value format)', async () => {
		const { conn, sent } = createMockConn();
		const promise = negotiateCaps(conn);

		// Server advertises caps with values
		conn.simulateMessage(':server CAP * LS :sasl=PLAIN,EXTERNAL message-tags server-time');

		const reqLine = sent.find((s) => s.startsWith('CAP REQ'));
		expect(reqLine).toContain('sasl');
		expect(reqLine).not.toContain('PLAIN');

		conn.simulateMessage(':server CAP * ACK :sasl message-tags server-time');
		const result = await promise;
		expect(result).toEqual(['sasl', 'message-tags', 'server-time']);
	});

	it('resolves with empty array when no MVP caps are advertised', async () => {
		const { conn } = createMockConn();
		const promise = negotiateCaps(conn);

		conn.simulateMessage(':server CAP * LS :unknown-cap-1 unknown-cap-2');

		const result = await promise;
		expect(result).toEqual([]);
	});

	it('rejects on CAP NAK', async () => {
		const { conn } = createMockConn();
		const promise = negotiateCaps(conn);

		conn.simulateMessage(':server CAP * LS :sasl message-tags');
		conn.simulateMessage(':server CAP * NAK :sasl message-tags');

		await expect(promise).rejects.toThrow('CAP REQ rejected');
	});

	it('does not send CAP END', async () => {
		const { conn, sent } = createMockConn();
		const promise = negotiateCaps(conn);

		conn.simulateMessage(':server CAP * LS :sasl');
		conn.simulateMessage(':server CAP * ACK :sasl');

		await promise;
		expect(sent.some((s) => s.includes('CAP END'))).toBe(false);
	});

	it('exports the full MVP cap list', () => {
		expect(MVP_CAPS).toContain('sasl');
		expect(MVP_CAPS).toContain('message-tags');
		expect(MVP_CAPS).toContain('echo-message');
		expect(MVP_CAPS).toContain('server-time');
		expect(MVP_CAPS).toContain('batch');
		expect(MVP_CAPS).toContain('labeled-response');
		expect(MVP_CAPS).toContain('draft/chathistory');
		expect(MVP_CAPS).toContain('draft/read-marker');
		expect(MVP_CAPS).toContain('draft/event-playback');
		expect(MVP_CAPS).toContain('draft/message-redaction');
		expect(MVP_CAPS).toContain('account-tag');
		expect(MVP_CAPS).toContain('account-notify');
		expect(MVP_CAPS).toContain('away-notify');
		expect(MVP_CAPS).toContain('extended-join');
		expect(MVP_CAPS).toContain('multi-prefix');
		expect(MVP_CAPS).toContain('userhost-in-names');
		expect(MVP_CAPS).toContain('cap-notify');
		expect(MVP_CAPS).toContain('setname');
		expect(MVP_CAPS).toHaveLength(18);
	});
});
