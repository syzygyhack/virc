/**
 * Keyboard shortcut manager.
 *
 * Registers key combinations and dispatches to handler functions.
 * Handles modifier keys (Ctrl/Meta, Alt, Shift) cross-platform.
 */

export interface Keybinding {
	/** The key to match (e.g. 'k', 'ArrowUp', 'Escape'). Case-insensitive for letters. */
	key: string;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	/** Handler returns true if the event was consumed. */
	handler: (e: KeyboardEvent) => boolean | void;
	/** Description for documentation/help purposes. */
	description?: string;
}

/** Active bindings, checked in order. First matching handler that returns true wins. */
let bindings: Keybinding[] = [];

/**
 * Register a keybinding. Returns an unregister function.
 */
export function registerKeybinding(binding: Keybinding): () => void {
	bindings.push(binding);
	return () => {
		bindings = bindings.filter((b) => b !== binding);
	};
}

/**
 * Register multiple keybindings. Returns an unregister-all function.
 */
export function registerKeybindings(newBindings: Keybinding[]): () => void {
	bindings.push(...newBindings);
	return () => {
		const set = new Set(newBindings);
		bindings = bindings.filter((b) => !set.has(b));
	};
}

/**
 * Process a keydown event against registered bindings.
 * Call this from a global keydown listener.
 */
export function processKeydown(e: KeyboardEvent): void {
	for (const binding of bindings) {
		if (!matchesBinding(e, binding)) continue;

		const result = binding.handler(e);
		if (result !== false) {
			e.preventDefault();
			return;
		}
	}
}

function matchesBinding(e: KeyboardEvent, b: Keybinding): boolean {
	// Check modifier keys
	const wantCtrl = b.ctrl ?? false;
	const wantAlt = b.alt ?? false;
	const wantShift = b.shift ?? false;

	// ctrlKey or metaKey (Cmd on Mac) both count as "ctrl"
	const hasCtrl = e.ctrlKey || e.metaKey;

	if (wantCtrl !== hasCtrl) return false;
	if (wantAlt !== e.altKey) return false;
	if (wantShift !== e.shiftKey) return false;

	// Match key — case-insensitive for letters
	return e.key.toLowerCase() === b.key.toLowerCase();
}

/**
 * Install the global keydown listener on a target (defaults to window).
 * Returns a cleanup function.
 */
export function installGlobalHandler(target: EventTarget = window): () => void {
	const handler = (e: Event) => processKeydown(e as KeyboardEvent);
	target.addEventListener('keydown', handler);
	return () => target.removeEventListener('keydown', handler);
}
