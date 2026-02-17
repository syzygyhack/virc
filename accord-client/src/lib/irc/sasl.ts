import type { IRCConnection } from './connection';
import { parseMessage } from './parser';

/**
 * Perform SASL PLAIN authentication over an IRC connection.
 *
 * Sends `AUTHENTICATE PLAIN`, waits for `AUTHENTICATE +`, then sends
 * the base64-encoded credentials. Resolves on 903 (success), rejects
 * on 904/905 (failure).
 *
 * Sends `CAP END` after successful authentication.
 */
const SASL_TIMEOUT_MS = 10_000;

export function authenticateSASL(
	conn: IRCConnection,
	account: string,
	password: string
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let settled = false;

		const timeout = setTimeout(() => {
			if (!settled) {
				settled = true;
				cleanup();
				reject(new Error('SASL authentication timed out'));
			}
		}, SASL_TIMEOUT_MS);

		function settle(fn: () => void): void {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			cleanup();
			fn();
		}

		let phase: 'wait-plus' | 'wait-result' = 'wait-plus';

		function handler(line: string) {
			if (settled) return;

			const msg = parseMessage(line);

			if (phase === 'wait-plus' && msg.command === 'AUTHENTICATE') {
				if (msg.params[0] === '+') {
					// Server is ready for credentials
					const payload = `\0${account}\0${password}`;
					// Use TextEncoder to handle non-ASCII passwords safely
					// (btoa throws on chars > 255)
					const bytes = new TextEncoder().encode(payload);
					const encoded = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
					conn.send(`AUTHENTICATE ${encoded}`);
					phase = 'wait-result';
				}
				return;
			}

			if (phase === 'wait-result') {
				// 903 = RPL_SASLSUCCESS
				if (msg.command === '903') {
					conn.send('CAP END');
					settle(() => resolve());
					return;
				}

				// 904 = ERR_SASLFAIL, 905 = ERR_SASLTOOLONG
				if (msg.command === '904' || msg.command === '905') {
					const reason = msg.params[msg.params.length - 1] || 'SASL authentication failed';
					settle(() => reject(new Error(reason)));
					return;
				}
			}
		}

		function onClose() {
			settle(() => reject(new Error('Connection closed during SASL authentication')));
		}

		function onError() {
			settle(() => reject(new Error('Connection error during SASL authentication')));
		}

		function cleanup() {
			conn.off('message', handler);
			conn.off('close', onClose);
			conn.off('error', onError);
		}

		conn.on('message', handler);
		conn.on('close', onClose);
		conn.on('error', onError);
		conn.send('AUTHENTICATE PLAIN');
	});
}
