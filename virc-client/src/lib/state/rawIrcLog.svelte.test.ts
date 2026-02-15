import { describe, it, expect, beforeEach } from 'vitest';
import { rawIrcLog, pushRawLine, clearRawLog } from './rawIrcLog.svelte';

describe('rawIrcLog', () => {
	beforeEach(() => {
		clearRawLog();
	});

	it('starts empty', () => {
		expect(rawIrcLog.lines).toEqual([]);
	});

	it('records a line with direction and timestamp', () => {
		pushRawLine('in', ':nick!user@host PRIVMSG #test :hello');
		expect(rawIrcLog.lines).toHaveLength(1);
		expect(rawIrcLog.lines[0].direction).toBe('in');
		expect(rawIrcLog.lines[0].line).toBe(':nick!user@host PRIVMSG #test :hello');
		expect(rawIrcLog.lines[0].time).toBeInstanceOf(Date);
	});

	it('records outgoing lines', () => {
		pushRawLine('out', 'PRIVMSG #test :hello');
		expect(rawIrcLog.lines[0].direction).toBe('out');
		expect(rawIrcLog.lines[0].line).toBe('PRIVMSG #test :hello');
	});

	it('limits buffer to 200 lines', () => {
		for (let i = 0; i < 250; i++) {
			pushRawLine('in', `LINE ${i}`);
		}
		expect(rawIrcLog.lines).toHaveLength(200);
		// Oldest lines should have been dropped
		expect(rawIrcLog.lines[0].line).toBe('LINE 50');
		expect(rawIrcLog.lines[199].line).toBe('LINE 249');
	});

	it('clearRawLog empties the buffer', () => {
		pushRawLine('in', 'PING :server');
		pushRawLine('out', 'PONG :server');
		expect(rawIrcLog.lines).toHaveLength(2);
		clearRawLog();
		expect(rawIrcLog.lines).toEqual([]);
	});
});
