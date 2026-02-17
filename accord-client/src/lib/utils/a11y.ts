/** Focusable element selector for focus trapping and management. */
const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Get all focusable elements within a container, in DOM order.
 * Filters out elements with zero dimensions (hidden).
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const els = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
	return els.filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
}

/**
 * Trap focus within a container element.
 * Returns a cleanup function to remove the event listener.
 *
 * When Tab is pressed on the last focusable element, focus wraps to the first.
 * When Shift+Tab is pressed on the first, focus wraps to the last.
 */
export function trapFocus(container: HTMLElement): () => void {
	function handleKeydown(e: KeyboardEvent): void {
		if (e.key !== 'Tab') return;

		const focusable = getFocusableElements(container);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === first) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	container.addEventListener('keydown', handleKeydown);
	return () => container.removeEventListener('keydown', handleKeydown);
}

/**
 * Focus the first focusable element within a container.
 * If no focusable child exists, focuses the container itself (if it has tabindex).
 */
export function focusFirst(container: HTMLElement): void {
	const focusable = getFocusableElements(container);
	if (focusable.length > 0) {
		focusable[0].focus();
	} else if (container.tabIndex >= 0) {
		container.focus();
	}
}

/**
 * Svelte action: trap focus within a dialog and auto-focus the first
 * focusable element on mount. Restores focus to the previously focused
 * element on destroy.
 *
 * Usage: `<div use:useTrapFocus>`
 */
export function useTrapFocus(container: HTMLElement): { destroy: () => void } {
	const previouslyFocused = document.activeElement as HTMLElement | null;
	const cleanup = trapFocus(container);

	// Auto-focus first focusable child (or the container itself)
	focusFirst(container);

	return {
		destroy() {
			cleanup();
			previouslyFocused?.focus();
		},
	};
}

/**
 * Svelte action: trap focus within a container without auto-focusing.
 * Use when the component handles its own initial focus (e.g. QuickSwitcher).
 *
 * Usage: `<div use:useTrapFocusOnly>`
 */
export function useTrapFocusOnly(container: HTMLElement): { destroy: () => void } {
	const previouslyFocused = document.activeElement as HTMLElement | null;
	const cleanup = trapFocus(container);

	return {
		destroy() {
			cleanup();
			previouslyFocused?.focus();
		},
	};
}

/**
 * Keyboard handler for vertical tab navigation (settings panels).
 * Handles ArrowUp/ArrowDown to move between tabs, Home/End to jump to
 * first/last tab. Activates the focused tab via its onclick.
 *
 * Attach to the tablist container's `onkeydown`.
 */
export function handleTablistKeydown(
	e: KeyboardEvent,
	container: HTMLElement,
): void {
	const tabs = Array.from(
		container.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
	);
	if (tabs.length === 0) return;

	const current = document.activeElement as HTMLElement;
	const currentIndex = tabs.indexOf(current);
	if (currentIndex === -1) return;

	let targetIndex: number | null = null;

	switch (e.key) {
		case 'ArrowDown': {
			targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
			break;
		}
		case 'ArrowUp': {
			targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
			break;
		}
		case 'Home': {
			targetIndex = 0;
			break;
		}
		case 'End': {
			targetIndex = tabs.length - 1;
			break;
		}
	}

	if (targetIndex !== null) {
		e.preventDefault();
		tabs[targetIndex].focus();
		tabs[targetIndex].click();
	}
}

/**
 * Keyboard handler for menu navigation (context menus, dropdown menus).
 * Handles ArrowUp/ArrowDown to move between menuitem elements,
 * Home/End to jump to first/last item, and Escape to close.
 *
 * @param container - The menu container element
 * @param onclose - Callback to close the menu
 */
export function handleMenuKeydown(
	e: KeyboardEvent,
	container: HTMLElement,
	onclose: () => void,
): void {
	const items = Array.from(
		container.querySelectorAll<HTMLElement>('[role="menuitem"]'),
	);
	if (items.length === 0) return;

	const current = document.activeElement as HTMLElement;
	const currentIndex = items.indexOf(current);

	switch (e.key) {
		case 'ArrowDown': {
			e.preventDefault();
			const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
			items[next].focus();
			break;
		}
		case 'ArrowUp': {
			e.preventDefault();
			const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
			items[prev].focus();
			break;
		}
		case 'Home': {
			e.preventDefault();
			items[0].focus();
			break;
		}
		case 'End': {
			e.preventDefault();
			items[items.length - 1].focus();
			break;
		}
		case 'Escape': {
			e.preventDefault();
			onclose();
			break;
		}
	}
}
