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
export function authenticateSASL(
	conn: IRCConnection,
	account: string,
	password: string
): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let phase: 'wait-plus' | 'wait-result' | 'done' = 'wait-plus';

		function handler(line: string) {
			if (phase === 'done') return;

			const msg = parseMessage(line);

			if (phase === 'wait-plus' && msg.command === 'AUTHENTICATE') {
				if (msg.params[0] === '+') {
					// Server is ready for credentials
					const payload = `\0${account}\0${password}`;
					const encoded = btoa(payload);
					conn.send(`AUTHENTICATE ${encoded}`);
					phase = 'wait-result';
				}
				return;
			}

			if (phase === 'wait-result') {
				// 903 = RPL_SASLSUCCESS
				if (msg.command === '903') {
					phase = 'done';
					conn.off('message', handler);
					conn.send('CAP END');
					resolve();
					return;
				}

				// 904 = ERR_SASLFAIL, 905 = ERR_SASLTOOLONG
				if (msg.command === '904' || msg.command === '905') {
					phase = 'done';
					conn.off('message', handler);
					const reason = msg.params[msg.params.length - 1] || 'SASL authentication failed';
					reject(new Error(reason));
					return;
				}
			}
		}

		conn.on('message', handler);
		conn.send('AUTHENTICATE PLAIN');
	});
}
