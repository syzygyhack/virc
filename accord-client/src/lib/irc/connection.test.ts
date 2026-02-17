import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IRCConnection } from './connection';
import type { ConnectionState } from './connection';

/**
 * Mock WebSocket that simulates the browser WebSocket API.
 * We test the IRCConnection class by controlling when the mock
 * WebSocket fires open/message/close/error events.
 */
class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;

	url: string;
	readyState: number = MockWebSocket.CONNECTING;
	onopen: ((ev: Event) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;
	onerror: ((ev: Event) => void) | null = null;
	sentData: string[] = [];

	constructor(url: string) {
		this.url = url;
		// Store instance so tests can access it
		MockWebSocket.instances.push(this);
	}

	send(data: string) {
		this.sentData.push(data);
	}

	close() {
		this.readyState = MockWebSocket.CLOSED;
		if (this.onclose) {
			this.onclose(new CloseEvent('close'));
		}
	}

	// Test helpers
	simulateOpen() {
		this.readyState = MockWebSocket.OPEN;
		if (this.onopen) {
			this.onopen(new Event('open'));
		}
	}

	simulateMessage(data: string) {
		if (this.onmessage) {
			this.onmessage(new MessageEvent('message', { data }));
		}
	}

	simulateError() {
		if (this.onerror) {
			this.onerror(new Event('error'));
		}
	}

	simulateClose(code = 1006) {
		this.readyState = MockWebSocket.CLOSED;
		if (this.onclose) {
			this.onclose(new CloseEvent('close', { code }));
		}
	}

	static instances: MockWebSocket[] = [];
	static reset() {
		MockWebSocket.instances = [];
	}
}

// Install mock WebSocket globally
const originalWebSocket = globalThis.WebSocket;

beforeEach(() => {
	MockWebSocket.reset();
	(globalThis as any).WebSocket = MockWebSocket as any;
	vi.useFakeTimers();
});

afterEach(() => {
	globalThis.WebSocket = originalWebSocket;
	vi.useRealTimers();
});

function latestMockWs(): MockWebSocket {
	return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

describe('IRCConnection', () => {
	describe('connect', () => {
		it('creates a WebSocket and resolves when opened', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			expect(conn.state).toBe('disconnected' satisfies ConnectionState);

			const connectPromise = conn.connect();
			expect(conn.state).toBe('connecting' satisfies ConnectionState);

			const ws = latestMockWs();
			expect(ws.url).toBe('ws://localhost:8097');
			ws.simulateOpen();

			await connectPromise;
			expect(conn.state).toBe('connected' satisfies ConnectionState);
		});

		it('rejects if WebSocket errors during connect', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();

			const ws = latestMockWs();
			ws.simulateError();
			ws.simulateClose();

			await expect(connectPromise).rejects.toThrow();
		});
	});

	describe('send', () => {
		it('sends a raw IRC line with \\r\\n appended', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			conn.send('NICK testuser');
			expect(latestMockWs().sentData).toEqual(['NICK testuser\r\n']);
		});
	});

	describe('message events', () => {
		it('emits message events for complete IRC lines', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const messages: string[] = [];
			conn.on('message', (line: string) => messages.push(line));

			latestMockWs().simulateMessage(':server PING :test\r\n');
			expect(messages).toEqual([':server PING :test']);
		});

		it('handles bare WebSocket frames without CRLF (Ergo style)', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const messages: string[] = [];
			conn.on('message', (line: string) => messages.push(line));

			latestMockWs().simulateMessage(':server PING :test');
			expect(messages).toEqual([':server PING :test']);
		});

		it('handles multiple lines in a single message', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const messages: string[] = [];
			conn.on('message', (line: string) => messages.push(line));

			latestMockWs().simulateMessage('PING :a\r\nPING :b\r\n');
			expect(messages).toEqual(['PING :a', 'PING :b']);
		});
	});

	describe('disconnect', () => {
		it('closes the WebSocket and updates state', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			conn.disconnect();
			expect(conn.state).toBe('disconnected' satisfies ConnectionState);
		});

		it('emits close event', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const closed = vi.fn();
			conn.on('close', closed);

			conn.disconnect();
			expect(closed).toHaveBeenCalled();
		});
	});

	describe('auto-reconnect', () => {
		it('attempts reconnect with exponential backoff on unexpected close', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const reconnecting = vi.fn();
			conn.on('reconnecting', reconnecting);

			// Simulate unexpected close
			latestMockWs().simulateClose(1006);
			expect(conn.state).toBe('reconnecting' satisfies ConnectionState);

			// First reconnect after 1s
			await vi.advanceTimersByTimeAsync(1000);
			expect(reconnecting).toHaveBeenCalledTimes(1);
			expect(reconnecting).toHaveBeenLastCalledWith(1);
			expect(MockWebSocket.instances.length).toBe(2);

			// Simulate failure on reconnect
			latestMockWs().simulateError();
			latestMockWs().simulateClose(1006);

			// Second reconnect after 2s
			await vi.advanceTimersByTimeAsync(2000);
			expect(reconnecting).toHaveBeenCalledTimes(2);
			expect(reconnecting).toHaveBeenLastCalledWith(2);
			expect(MockWebSocket.instances.length).toBe(3);

			// Simulate failure again
			latestMockWs().simulateError();
			latestMockWs().simulateClose(1006);

			// Third reconnect after 4s
			await vi.advanceTimersByTimeAsync(4000);
			expect(reconnecting).toHaveBeenCalledTimes(3);
			expect(reconnecting).toHaveBeenLastCalledWith(3);
			expect(MockWebSocket.instances.length).toBe(4);
		});

		it('fires reconnected event on successful reconnect', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const reconnected = vi.fn();
			conn.on('reconnected', reconnected);

			// Simulate unexpected close
			latestMockWs().simulateClose(1006);

			// Advance to first reconnect attempt
			await vi.advanceTimersByTimeAsync(1000);
			// New WS created, simulate successful open
			latestMockWs().simulateOpen();

			expect(reconnected).toHaveBeenCalledTimes(1);
			expect(conn.state).toBe('connected' satisfies ConnectionState);
		});

		it('caps backoff at 30 seconds', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			// Simulate unexpected close
			latestMockWs().simulateClose(1006);

			// Fail through several backoff cycles: 1s, 2s, 4s, 8s, 16s, 30s (capped)
			for (let i = 0; i < 5; i++) {
				const delay = Math.min(1000 * Math.pow(2, i), 30000);
				await vi.advanceTimersByTimeAsync(delay);
				latestMockWs().simulateError();
				latestMockWs().simulateClose(1006);
			}

			// 6th attempt should be capped at 30s (not 32s)
			const instancesBefore = MockWebSocket.instances.length;
			await vi.advanceTimersByTimeAsync(30000);
			expect(MockWebSocket.instances.length).toBe(instancesBefore + 1);
		});

		it('does not reconnect after explicit disconnect', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			conn.disconnect();

			await vi.advanceTimersByTimeAsync(5000);
			// Should still be just 1 WebSocket instance (no reconnect attempts)
			expect(MockWebSocket.instances.length).toBe(1);
		});
	});

	describe('event emitter', () => {
		it('supports multiple handlers for the same event', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const handler1 = vi.fn();
			const handler2 = vi.fn();
			conn.on('message', handler1);
			conn.on('message', handler2);

			latestMockWs().simulateMessage('PING :test\r\n');
			expect(handler1).toHaveBeenCalledWith('PING :test');
			expect(handler2).toHaveBeenCalledWith('PING :test');
		});

		it('emits error events', async () => {
			const conn = new IRCConnection({ url: 'ws://localhost:8097' });
			const connectPromise = conn.connect();
			latestMockWs().simulateOpen();
			await connectPromise;

			const errorHandler = vi.fn();
			conn.on('error', errorHandler);

			latestMockWs().simulateError();
			expect(errorHandler).toHaveBeenCalled();
		});
	});
});
