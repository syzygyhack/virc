export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type EventName = 'message' | 'close' | 'error' | 'reconnecting' | 'reconnected';

interface IRCConnectionOptions {
	url: string;
}

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

/**
 * Manages a WebSocket connection to an IRC server (e.g. Ergo via ws://).
 * Handles line buffering (\r\n delimited), event emission, and auto-reconnect
 * with exponential backoff.
 */
export class IRCConnection {
	private url: string;
	private ws: WebSocket | null = null;
	private buffer = '';
	private listeners = new Map<EventName, ((...args: any[]) => void)[]>();
	private intentionalClose = false;
	private reconnectAttempt = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	state: ConnectionState = 'disconnected';

	constructor(options: IRCConnectionOptions) {
		this.url = options.url;
	}

	/**
	 * Open a WebSocket connection. Resolves when the connection is open.
	 * Rejects if the connection fails before opening.
	 */
	connect(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.intentionalClose = false;
			this.state = 'connecting';
			this.buffer = '';

			const ws = new WebSocket(this.url);
			this.ws = ws;

			ws.onopen = () => {
				this.state = 'connected';
				this.reconnectAttempt = 0;
				resolve();
			};

			ws.onmessage = (ev: MessageEvent) => {
				this.handleData(ev.data as string);
			};

			ws.onerror = (ev: Event) => {
				this.emit('error', ev);
				// If still connecting (not yet opened), reject the promise
				if (this.state === 'connecting') {
					reject(new Error('WebSocket connection failed'));
				}
			};

			ws.onclose = (ev: CloseEvent) => {
				this.emit('close', ev);

				if (this.state === 'connecting') {
					// Reject the connect promise if we haven't resolved yet
					reject(new Error('WebSocket closed before opening'));
					return;
				}

				if (!this.intentionalClose) {
					this.scheduleReconnect();
				}
			};
		});
	}

	/**
	 * Send a raw IRC line. Appends \r\n automatically.
	 */
	send(line: string): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(line + '\r\n');
		}
	}

	/**
	 * Intentionally close the connection. No auto-reconnect will occur.
	 */
	disconnect(): void {
		this.intentionalClose = true;
		this.state = 'disconnected';

		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * Register an event handler.
	 */
	on(event: EventName, handler: (...args: any[]) => void): void {
		const handlers = this.listeners.get(event) ?? [];
		handlers.push(handler);
		this.listeners.set(event, handlers);
	}

	/**
	 * Remove a previously registered event handler.
	 * Returns true if the handler was found and removed, false otherwise.
	 */
	off(event: EventName, handler: (...args: any[]) => void): boolean {
		const handlers = this.listeners.get(event);
		if (!handlers) return false;
		const idx = handlers.indexOf(handler);
		if (idx === -1) return false;
		handlers.splice(idx, 1);
		return true;
	}

	private emit(event: EventName, ...args: any[]): void {
		const handlers = this.listeners.get(event);
		if (handlers) {
			for (const h of handlers) {
				h(...args);
			}
		}
	}

	/**
	 * Buffer incoming data and emit complete lines delimited by \r\n.
	 */
	private handleData(data: string): void {
		this.buffer += data;

		let idx: number;
		while ((idx = this.buffer.indexOf('\r\n')) !== -1) {
			const line = this.buffer.slice(0, idx);
			this.buffer = this.buffer.slice(idx + 2);
			if (line.length > 0) {
				this.emit('message', line);
			}
		}
	}

	/**
	 * Schedule a reconnection attempt with exponential backoff.
	 */
	private scheduleReconnect(): void {
		this.state = 'reconnecting';
		const delay = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, this.reconnectAttempt), MAX_BACKOFF_MS);
		this.reconnectAttempt++;

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.emit('reconnecting', this.reconnectAttempt);
			this.attemptReconnect();
		}, delay);
	}

	/**
	 * Attempt to reconnect by creating a new WebSocket.
	 */
	private attemptReconnect(): void {
		this.buffer = '';
		const ws = new WebSocket(this.url);
		this.ws = ws;

		ws.onopen = () => {
			this.state = 'connected';
			this.reconnectAttempt = 0;
			this.emit('reconnected');
		};

		ws.onmessage = (ev: MessageEvent) => {
			this.handleData(ev.data as string);
		};

		ws.onerror = (ev: Event) => {
			this.emit('error', ev);
		};

		ws.onclose = () => {
			if (!this.intentionalClose) {
				this.scheduleReconnect();
			}
		};
	}
}
