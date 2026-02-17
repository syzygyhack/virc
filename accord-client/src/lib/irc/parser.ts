import { parse } from 'irc-message-ts';

export interface IRCSource {
	nick: string;
	user: string;
	host: string;
}

export interface ParsedMessage {
	tags: Record<string, string>;
	prefix: string | null;
	command: string;
	params: string[];
	source: IRCSource | null;
}

/**
 * Parse a prefix string like "nick!user@host" into an IRCSource.
 * Returns null if the prefix doesn't contain a '!' (i.e. it's a server name).
 * Handles "nick@host" (no user) by setting user to empty string.
 */
function parsePrefix(prefix: string): IRCSource | null {
	const bangIdx = prefix.indexOf('!');
	const atIdx = prefix.indexOf('@');

	if (bangIdx !== -1 && atIdx !== -1 && atIdx > bangIdx) {
		return {
			nick: prefix.slice(0, bangIdx),
			user: prefix.slice(bangIdx + 1, atIdx),
			host: prefix.slice(atIdx + 1)
		};
	}

	if (atIdx !== -1 && bangIdx === -1) {
		return {
			nick: prefix.slice(0, atIdx),
			user: '',
			host: prefix.slice(atIdx + 1)
		};
	}

	return null;
}

/**
 * Parse a raw IRC message line into a structured object.
 */
export function parseMessage(line: string): ParsedMessage {
	const parsed = parse(line);

	if (!parsed || !parsed.command) {
		return {
			tags: {},
			prefix: null,
			command: '',
			params: [],
			source: null
		};
	}

	const prefix = parsed.prefix ?? null;

	return {
		tags: parsed.tags,
		prefix,
		command: parsed.command,
		params: parsed.params,
		source: prefix ? parsePrefix(prefix) : null
	};
}

/**
 * Build a raw IRC line from a command and parameters.
 * The last parameter is prefixed with ':' if it contains spaces or starts with ':'.
 */
export function formatMessage(command: string, ...params: string[]): string {
	if (params.length === 0) {
		return command;
	}

	const last = params[params.length - 1];
	const middle = params.slice(0, -1);
	const needsTrailing = last.includes(' ') || last.startsWith(':') || last.length === 0;

	if (needsTrailing) {
		const parts = [command, ...middle, `:${last}`];
		return parts.join(' ');
	}

	return [command, ...params].join(' ');
}
