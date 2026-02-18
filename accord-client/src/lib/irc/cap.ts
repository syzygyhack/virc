import type { IRCConnection } from './connection';
import { parseMessage } from './parser';

/**
 * MVP-required IRCv3 capabilities.
 * These are requested during capability negotiation.
 */
export const MVP_CAPS = [
	'sasl',
	'message-tags',
	'echo-message',
	'server-time',
	'batch',
	'labeled-response',
	'draft/chathistory',
	'draft/read-marker',
	'draft/event-playback',
	'draft/message-redaction',
	'account-tag',
	'account-notify',
	'away-notify',
	'extended-join',
	'multi-prefix',
	'userhost-in-names',
	'cap-notify',
	'setname'
];

/**
 * Parse the value portion of a CAP LS response into capability names.
 * Each token may be `capname` or `capname=value`; we only need the name.
 */
function parseCapList(raw: string): string[] {
	return raw
		.trim()
		.split(/\s+/)
		.filter((s) => s.length > 0)
		.map((token) => token.split('=')[0]);
}

/**
 * Negotiate IRCv3 capabilities with the server.
 *
 * Sends `CAP LS 302`, collects all advertised caps (handling multiline),
 * then requests the intersection of advertised caps and MVP_CAPS.
 * Returns the list of acknowledged capabilities.
 *
 * Does NOT send `CAP END` — SASL authentication must happen first.
 */
const CAP_TIMEOUT_MS = 10_000;

export function negotiateCaps(conn: IRCConnection): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		const advertised: string[] = [];
		let phase: 'ls' | 'req' = 'ls';
		let settled = false;

		const timeout = setTimeout(() => {
			if (!settled) {
				settled = true;
				cleanup();
				reject(new Error('CAP negotiation timed out'));
			}
		}, CAP_TIMEOUT_MS);

		function settle(fn: () => void): void {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			cleanup();
			fn();
		}

		function handler(line: string) {
			if (settled) return;
			const msg = parseMessage(line);

			if (msg.command !== 'CAP') return;

			const subcommand = msg.params[1];

			if (phase === 'ls' && subcommand === 'LS') {
				// CAP * LS * :cap1 cap2 ...   (multiline, more to come)
				// CAP * LS :cap1 cap2 ...     (final line)
				const isMultiline = msg.params[2] === '*';
				const capString = isMultiline ? msg.params[3] : msg.params[2];

				if (capString) {
					advertised.push(...parseCapList(capString));
				}

				if (!isMultiline) {
					// All caps received, request the ones we want
					const toRequest = MVP_CAPS.filter((c) => advertised.includes(c));

					if (toRequest.length === 0) {
						settle(() => resolve([]));
						return;
					}

					phase = 'req';
					conn.send(`CAP REQ :${toRequest.join(' ')}`);
				}
			} else if (phase === 'req' && (subcommand === 'ACK' || subcommand === 'NAK')) {
				const ackString = msg.params[2] ?? '';
				const acked = parseCapList(ackString);

				if (subcommand === 'NAK') {
					// Server rejected the REQ. Resolve with empty list instead of
					// failing the entire connection — the client can proceed with
					// reduced functionality (e.g. no message-tags or echo-message).
					console.warn(`[IRC] CAP REQ NAK'd: ${ackString}`);
					settle(() => resolve([]));
					return;
				}

				settle(() => resolve(acked));
			}
		}

		function onClose() {
			settle(() => reject(new Error('Connection closed during CAP negotiation')));
		}

		function onError() {
			settle(() => reject(new Error('Connection error during CAP negotiation')));
		}

		function cleanup() {
			conn.off('message', handler);
			conn.off('close', onClose);
			conn.off('error', onError);
		}

		conn.on('message', handler);
		conn.on('close', onClose);
		conn.on('error', onError);
		conn.send('CAP LS 302');
	});
}
