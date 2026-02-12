import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	registerKeybinding,
	registerKeybindings,
	processKeydown,
} from './keybindings';

/** Create a fake KeyboardEvent-like object for testing. */
function makeKeyEvent(opts: {
	key: string;
	ctrlKey?: boolean;
	altKey?: boolean;
	shiftKey?: boolean;
	metaKey?: boolean;
}): KeyboardEvent {
	return {
		key: opts.key,
		ctrlKey: opts.ctrlKey ?? false,
		altKey: opts.altKey ?? false,
		shiftKey: opts.shiftKey ?? false,
		metaKey: opts.metaKey ?? false,
		preventDefault: vi.fn(),
	} as unknown as KeyboardEvent;
}

describe('keybindings', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		unregister?.();
		unregister = null;
	});

	it('matches a simple key', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({ key: 'Escape', handler });

		processKeydown(makeKeyEvent({ key: 'Escape' }));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('matches Ctrl+K', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({ key: 'k', ctrl: true, handler });

		// Without Ctrl — should not match
		processKeydown(makeKeyEvent({ key: 'k' }));
		expect(handler).not.toHaveBeenCalled();

		// With Ctrl — should match
		processKeydown(makeKeyEvent({ key: 'k', ctrlKey: true }));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('matches Meta key as Ctrl (Mac Cmd)', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({ key: 'k', ctrl: true, handler });

		processKeydown(makeKeyEvent({ key: 'k', metaKey: true }));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('matches Alt+Shift+ArrowUp', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({
			key: 'ArrowUp',
			alt: true,
			shift: true,
			handler,
		});

		// Alt only — should not match
		processKeydown(makeKeyEvent({ key: 'ArrowUp', altKey: true }));
		expect(handler).not.toHaveBeenCalled();

		// Alt+Shift — should match
		processKeydown(makeKeyEvent({ key: 'ArrowUp', altKey: true, shiftKey: true }));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('does not match when extra modifiers are held', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({ key: 'k', handler });

		// k with Ctrl held — should not match since binding has no ctrl
		processKeydown(makeKeyEvent({ key: 'k', ctrlKey: true }));
		expect(handler).not.toHaveBeenCalled();
	});

	it('unregisters a single binding', () => {
		const handler = vi.fn(() => true);
		const unreg = registerKeybinding({ key: 'a', handler });

		processKeydown(makeKeyEvent({ key: 'a' }));
		expect(handler).toHaveBeenCalledTimes(1);

		unreg();
		processKeydown(makeKeyEvent({ key: 'a' }));
		expect(handler).toHaveBeenCalledTimes(1); // no additional call
	});

	it('registers and unregisters multiple bindings', () => {
		const h1 = vi.fn(() => true);
		const h2 = vi.fn(() => true);
		unregister = registerKeybindings([
			{ key: 'a', handler: h1 },
			{ key: 'b', handler: h2 },
		]);

		processKeydown(makeKeyEvent({ key: 'a' }));
		processKeydown(makeKeyEvent({ key: 'b' }));
		expect(h1).toHaveBeenCalledTimes(1);
		expect(h2).toHaveBeenCalledTimes(1);

		unregister();
		unregister = null;
		processKeydown(makeKeyEvent({ key: 'a' }));
		processKeydown(makeKeyEvent({ key: 'b' }));
		expect(h1).toHaveBeenCalledTimes(1);
		expect(h2).toHaveBeenCalledTimes(1);
	});

	it('first matching handler wins (prevents later handlers)', () => {
		const h1 = vi.fn(() => true);
		const h2 = vi.fn(() => true);
		unregister = registerKeybindings([
			{ key: 'x', handler: h1 },
			{ key: 'x', handler: h2 },
		]);

		processKeydown(makeKeyEvent({ key: 'x' }));
		expect(h1).toHaveBeenCalledTimes(1);
		expect(h2).not.toHaveBeenCalled();
	});

	it('handler returning false allows fallthrough', () => {
		const h1 = vi.fn(() => false);
		const h2 = vi.fn(() => true);
		unregister = registerKeybindings([
			{ key: 'x', handler: h1 },
			{ key: 'x', handler: h2 },
		]);

		processKeydown(makeKeyEvent({ key: 'x' }));
		expect(h1).toHaveBeenCalledTimes(1);
		expect(h2).toHaveBeenCalledTimes(1);
	});

	it('preventDefault is called when handler consumes the event', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({ key: 'k', ctrl: true, handler });

		const e = makeKeyEvent({ key: 'k', ctrlKey: true });
		processKeydown(e);
		expect(e.preventDefault).toHaveBeenCalled();
	});

	it('is case-insensitive for key matching', () => {
		const handler = vi.fn(() => true);
		unregister = registerKeybinding({ key: 'M', ctrl: true, shift: true, handler });

		processKeydown(makeKeyEvent({ key: 'M', ctrlKey: true, shiftKey: true }));
		expect(handler).toHaveBeenCalledTimes(1);

		processKeydown(makeKeyEvent({ key: 'm', ctrlKey: true, shiftKey: true }));
		expect(handler).toHaveBeenCalledTimes(2);
	});
});
