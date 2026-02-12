import { describe, it, expect } from 'vitest';
import { parseMessage, formatMessage } from './parser';

describe('parseMessage', () => {
	it('parses a simple PING command', () => {
		const msg = parseMessage('PING :server.example.com');
		expect(msg.command).toBe('PING');
		expect(msg.params).toEqual(['server.example.com']);
		expect(msg.prefix).toBeNull();
		expect(msg.source).toBeNull();
		expect(msg.tags).toEqual({});
	});

	it('parses a PRIVMSG with prefix', () => {
		const msg = parseMessage(':nick!user@host PRIVMSG #channel :Hello, world!');
		expect(msg.command).toBe('PRIVMSG');
		expect(msg.prefix).toBe('nick!user@host');
		expect(msg.params).toEqual(['#channel', 'Hello, world!']);
		expect(msg.source).toEqual({ nick: 'nick', user: 'user', host: 'host' });
	});

	it('parses a message with IRCv3 tags', () => {
		const msg = parseMessage('@time=2024-01-01T00:00:00Z;account=nick :nick!user@host PRIVMSG #channel :tagged message');
		expect(msg.tags).toEqual({
			time: '2024-01-01T00:00:00Z',
			account: 'nick'
		});
		expect(msg.command).toBe('PRIVMSG');
		expect(msg.params).toEqual(['#channel', 'tagged message']);
	});

	it('parses a message with msgid and time tags', () => {
		const msg = parseMessage('@msgid=abc123;time=2024-01-01T00:00:00Z :nick PRIVMSG #chan :text');
		expect(msg.tags).toEqual({
			msgid: 'abc123',
			time: '2024-01-01T00:00:00Z'
		});
		expect(msg.command).toBe('PRIVMSG');
		expect(msg.params).toEqual(['#chan', 'text']);
	});

	it('parses a TAGMSG with client tags', () => {
		const msg = parseMessage('@+draft/react=\u{1f44d};+draft/reply=xyz TAGMSG #chan');
		expect(msg.tags).toEqual({
			'+draft/react': '\u{1f44d}',
			'+draft/reply': 'xyz'
		});
		expect(msg.command).toBe('TAGMSG');
		expect(msg.params).toEqual(['#chan']);
	});

	it('parses a numeric reply', () => {
		const msg = parseMessage(':server.example.com 001 nick :Welcome to the network');
		expect(msg.command).toBe('001');
		expect(msg.prefix).toBe('server.example.com');
		expect(msg.params).toEqual(['nick', 'Welcome to the network']);
		expect(msg.source).toBeNull(); // server prefix, not nick!user@host
	});

	it('parses a prefix with nick only (no user/host)', () => {
		const msg = parseMessage(':server.example.com NOTICE * :Looking up your hostname');
		expect(msg.prefix).toBe('server.example.com');
		expect(msg.source).toBeNull(); // no ! separator
	});

	it('parses a message with no trailing parameter', () => {
		const msg = parseMessage(':nick!user@host JOIN #channel');
		expect(msg.command).toBe('JOIN');
		expect(msg.params).toEqual(['#channel']);
	});

	it('parses a message with multiple middle params', () => {
		const msg = parseMessage(':server 005 nick CHANTYPES=# PREFIX=(ov)@+ :are supported');
		expect(msg.command).toBe('005');
		expect(msg.params).toEqual(['nick', 'CHANTYPES=#', 'PREFIX=(ov)@+', 'are supported']);
	});

	it('handles prefix with nick and host but no user', () => {
		const msg = parseMessage(':nick@host PRIVMSG #channel :hello');
		expect(msg.prefix).toBe('nick@host');
		// Has @ but no !, source parsing should handle gracefully
		expect(msg.source).not.toBeNull();
		if (msg.source) {
			expect(msg.source.nick).toBe('nick');
			expect(msg.source.host).toBe('host');
		}
	});
});

describe('formatMessage', () => {
	it('formats a simple command with no params', () => {
		expect(formatMessage('QUIT')).toBe('QUIT');
	});

	it('formats a command with one param', () => {
		expect(formatMessage('JOIN', '#channel')).toBe('JOIN #channel');
	});

	it('formats a command with trailing param containing spaces', () => {
		expect(formatMessage('PRIVMSG', '#channel', 'Hello, world!')).toBe(
			'PRIVMSG #channel :Hello, world!'
		);
	});

	it('formats a command where last param starts with colon', () => {
		expect(formatMessage('PRIVMSG', '#channel', ':)')).toBe(
			'PRIVMSG #channel ::)'
		);
	});

	it('formats PASS command', () => {
		expect(formatMessage('PASS', 'secret')).toBe('PASS secret');
	});

	it('formats NICK command', () => {
		expect(formatMessage('NICK', 'mynick')).toBe('NICK mynick');
	});

	it('formats USER command with trailing realname', () => {
		expect(formatMessage('USER', 'myuser', '0', '*', 'My Real Name')).toBe(
			'USER myuser 0 * :My Real Name'
		);
	});

	it('formats a PING with trailing', () => {
		expect(formatMessage('PING', 'server.example.com')).toBe('PING server.example.com');
	});
});
