import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	themeState,
	setTheme,
	applyServerTheme,
	clearServerTheme,
	parseServerTheme,
	resetTheme,
	setServerThemesDisabled,
	setServerThemeDisabled,
	isServerThemeDisabled,
	dismissContrastWarning,
	parseColor,
	relativeLuminance,
	contrastRatio,
	checkThemeContrast,
} from './theme.svelte';

/**
 * Minimal localStorage mock for Node-based vitest.
 */
function createStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		get length() { return store.size; },
		key: (_index: number) => null,
	} as Storage;
}

/**
 * Minimal document.documentElement mock for DOM operations.
 */
function createDocumentMock() {
	const attrs = new Map<string, string>();
	const styles = new Map<string, string>();

	return {
		documentElement: {
			getAttribute: (name: string) => attrs.get(name) ?? null,
			setAttribute: (name: string, value: string) => attrs.set(name, value),
			style: {
				setProperty: (name: string, value: string) => styles.set(name, value),
				removeProperty: (name: string) => { styles.delete(name); return ''; },
				getPropertyValue: (name: string) => styles.get(name) ?? '',
			},
		},
	};
}

describe('theme state', () => {
	beforeEach(() => {
		const storage = createStorageMock();
		vi.stubGlobal('localStorage', storage);
		vi.stubGlobal('document', createDocumentMock());
		resetTheme();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('setTheme', () => {
		it('updates the current theme', () => {
			setTheme('light');
			expect(themeState.current).toBe('light');
		});

		it('persists to localStorage', () => {
			setTheme('amoled');
			expect(localStorage.getItem('accord:theme')).toBe('amoled');
		});

		it('sets data-theme on document element', () => {
			setTheme('compact');
			expect(document.documentElement.getAttribute('data-theme')).toBe('compact');
		});

		it('ignores invalid theme values', () => {
			setTheme('dark');
			setTheme('invalid' as any);
			expect(themeState.current).toBe('dark');
		});

		it('cycles through all valid themes', () => {
			for (const theme of ['dark', 'light', 'amoled', 'compact'] as const) {
				setTheme(theme);
				expect(themeState.current).toBe(theme);
				expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
			}
		});
	});

	describe('server theme overrides', () => {
		it('applies allowed CSS variables to root', () => {
			applyServerTheme({ '--accent-primary': '#ff0000' });
			expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#ff0000');
			expect(themeState.serverOverrides).toEqual({ '--accent-primary': '#ff0000' });
		});

		it('rejects disallowed CSS variables', () => {
			applyServerTheme({ '--font-primary': 'Comic Sans' });
			expect(document.documentElement.style.getPropertyValue('--font-primary')).toBe('');
			expect(themeState.serverOverrides).toEqual({});
		});

		it('rejects values containing url()', () => {
			applyServerTheme({ '--accent-primary': 'url(https://evil.com)' });
			expect(themeState.serverOverrides).toEqual({});
		});

		it('rejects values containing expression()', () => {
			applyServerTheme({ '--surface-base': 'expression(alert(1))' });
			expect(themeState.serverOverrides).toEqual({});
		});

		it('rejects values containing semicolons', () => {
			applyServerTheme({ '--accent-primary': '#fff; background: red' });
			expect(themeState.serverOverrides).toEqual({});
		});

		it('applies multiple overrides', () => {
			applyServerTheme({
				'--accent-primary': '#e05050',
				'--surface-lowest': '#1a1015',
				'--surface-low': '#201520',
			});
			expect(Object.keys(themeState.serverOverrides)).toHaveLength(3);
			expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#e05050');
			expect(document.documentElement.style.getPropertyValue('--surface-lowest')).toBe('#1a1015');
		});

		it('clears previous overrides before applying new ones', () => {
			applyServerTheme({ '--accent-primary': '#ff0000' });
			applyServerTheme({ '--surface-base': '#111111' });
			expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('');
			expect(document.documentElement.style.getPropertyValue('--surface-base')).toBe('#111111');
		});
	});

	describe('clearServerTheme', () => {
		it('removes all server overrides from DOM', () => {
			applyServerTheme({
				'--accent-primary': '#ff0000',
				'--surface-base': '#111111',
			});
			clearServerTheme();
			expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('');
			expect(document.documentElement.style.getPropertyValue('--surface-base')).toBe('');
			expect(themeState.serverOverrides).toEqual({});
		});

		it('is safe to call when no overrides exist', () => {
			clearServerTheme();
			expect(themeState.serverOverrides).toEqual({});
		});
	});

	describe('parseServerTheme', () => {
		it('parses accent into --accent-primary', () => {
			const result = parseServerTheme({ accent: '#e05050' });
			expect(result).toEqual({ '--accent-primary': '#e05050' });
		});

		it('parses surfaces into --surface-* variables', () => {
			const result = parseServerTheme({
				surfaces: {
					lowest: '#1a1015',
					low: '#201520',
					base: '#281a28',
				},
			});
			expect(result).toEqual({
				'--surface-lowest': '#1a1015',
				'--surface-low': '#201520',
				'--surface-base': '#281a28',
			});
		});

		it('combines accent and surfaces', () => {
			const result = parseServerTheme({
				accent: '#e05050',
				surfaces: { lowest: '#1a1015' },
			});
			expect(result).toEqual({
				'--accent-primary': '#e05050',
				'--surface-lowest': '#1a1015',
			});
		});

		it('returns empty object for empty config', () => {
			expect(parseServerTheme({})).toEqual({});
		});
	});

	describe('isCompact', () => {
		it('returns true when theme is compact', () => {
			setTheme('compact');
			expect(themeState.isCompact).toBe(true);
		});

		it('returns false for dark theme', () => {
			setTheme('dark');
			expect(themeState.isCompact).toBe(false);
		});

		it('returns false for light theme', () => {
			setTheme('light');
			expect(themeState.isCompact).toBe(false);
		});

		it('returns false for amoled theme', () => {
			setTheme('amoled');
			expect(themeState.isCompact).toBe(false);
		});
	});

	describe('resetTheme', () => {
		it('resets to dark theme', () => {
			setTheme('light');
			applyServerTheme({ '--accent-primary': '#ff0000' });
			resetTheme();
			expect(themeState.current).toBe('dark');
			expect(themeState.serverOverrides).toEqual({});
			expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		});

		it('resets server theme prefs and contrast warning', () => {
			setServerThemesDisabled(true);
			resetTheme();
			expect(themeState.serverThemesDisabled).toBe(false);
			expect(themeState.disabledServerIds).toEqual([]);
			expect(themeState.contrastWarning).toBeNull();
		});
	});

	describe('global server theme toggle', () => {
		it('disables all server themes', () => {
			setServerThemesDisabled(true);
			expect(themeState.serverThemesDisabled).toBe(true);
		});

		it('persists to localStorage', () => {
			setServerThemesDisabled(true);
			const stored = localStorage.getItem('accord:serverThemePrefs');
			expect(stored).toBeTruthy();
			const parsed = JSON.parse(stored!);
			expect(parsed.disableAll).toBe(true);
		});

		it('prevents server themes from being applied', () => {
			setServerThemesDisabled(true);
			const result = applyServerTheme({ '--accent-primary': '#ff0000' });
			expect(result.applied).toBe(false);
			expect(themeState.serverOverrides).toEqual({});
			expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('');
		});

		it('clears existing overrides when disabled', () => {
			applyServerTheme({ '--accent-primary': '#ff0000' });
			expect(themeState.serverOverrides).toHaveProperty('--accent-primary');
			setServerThemesDisabled(true);
			expect(themeState.serverOverrides).toEqual({});
		});

		it('re-enables server themes', () => {
			setServerThemesDisabled(true);
			setServerThemesDisabled(false);
			expect(themeState.serverThemesDisabled).toBe(false);
			const result = applyServerTheme({ '--accent-primary': '#ff0000' });
			expect(result.applied).toBe(true);
		});
	});

	describe('per-server theme toggle', () => {
		it('disables a specific server theme', () => {
			setServerThemeDisabled('server1', true);
			expect(isServerThemeDisabled('server1')).toBe(true);
			expect(isServerThemeDisabled('server2')).toBe(false);
		});

		it('persists to localStorage', () => {
			setServerThemeDisabled('server1', true);
			const stored = localStorage.getItem('accord:serverThemePrefs');
			const parsed = JSON.parse(stored!);
			expect(parsed.disabledServers).toContain('server1');
		});

		it('prevents that server theme from applying', () => {
			setServerThemeDisabled('server1', true);
			const result = applyServerTheme({ '--accent-primary': '#ff0000' }, 'server1');
			expect(result.applied).toBe(false);
			expect(themeState.serverOverrides).toEqual({});
		});

		it('allows other servers themes through', () => {
			setServerThemeDisabled('server1', true);
			const result = applyServerTheme({ '--accent-primary': '#ff0000' }, 'server2');
			expect(result.applied).toBe(true);
			expect(themeState.serverOverrides).toHaveProperty('--accent-primary');
		});

		it('re-enables a specific server theme', () => {
			setServerThemeDisabled('server1', true);
			setServerThemeDisabled('server1', false);
			expect(isServerThemeDisabled('server1')).toBe(false);
		});

		it('supports multiple disabled servers', () => {
			setServerThemeDisabled('server1', true);
			setServerThemeDisabled('server2', true);
			expect(isServerThemeDisabled('server1')).toBe(true);
			expect(isServerThemeDisabled('server2')).toBe(true);
			expect(themeState.disabledServerIds).toHaveLength(2);
		});
	});

	describe('parseColor', () => {
		it('parses 6-digit hex', () => {
			expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
			expect(parseColor('#1a2b3c')).toEqual({ r: 26, g: 43, b: 60 });
		});

		it('parses 3-digit hex', () => {
			expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
			expect(parseColor('#abc')).toEqual({ r: 170, g: 187, b: 204 });
		});

		it('parses 8-digit hex (ignores alpha)', () => {
			expect(parseColor('#ff0000ff')).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('parses rgb() notation', () => {
			expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('parses rgba() notation', () => {
			expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
		});

		it('returns null for invalid colors', () => {
			expect(parseColor('red')).toBeNull();
			expect(parseColor('not-a-color')).toBeNull();
			expect(parseColor('')).toBeNull();
		});
	});

	describe('relativeLuminance', () => {
		it('returns 0 for black', () => {
			expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 4);
		});

		it('returns 1 for white', () => {
			expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 4);
		});

		it('returns intermediate value for gray', () => {
			const lum = relativeLuminance(128, 128, 128);
			expect(lum).toBeGreaterThan(0);
			expect(lum).toBeLessThan(1);
		});
	});

	describe('contrastRatio', () => {
		it('returns 21 for black on white', () => {
			const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
			expect(ratio).toBeCloseTo(21, 0);
		});

		it('returns 1 for same color', () => {
			const ratio = contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 });
			expect(ratio).toBeCloseTo(1, 4);
		});

		it('returns > 3 for readable contrast', () => {
			// White text on dark background
			const ratio = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 30, g: 30, b: 30 });
			expect(ratio).toBeGreaterThan(3);
		});

		it('returns < 3 for poor contrast', () => {
			// Dark gray text on dark background
			const ratio = contrastRatio({ r: 50, g: 50, b: 50 }, { r: 30, g: 30, b: 30 });
			expect(ratio).toBeLessThan(3);
		});
	});

	describe('checkThemeContrast', () => {
		it('returns null when no text/bg combination exists', () => {
			expect(checkThemeContrast({ '--accent-primary': '#ff0000' })).toBeNull();
		});

		it('returns null when only text colors exist', () => {
			expect(checkThemeContrast({ '--text-primary': '#ffffff' })).toBeNull();
		});

		it('returns null when only bg colors exist', () => {
			expect(checkThemeContrast({ '--surface-base': '#111111' })).toBeNull();
		});

		it('returns null for good contrast', () => {
			const result = checkThemeContrast({
				'--text-primary': '#ffffff',
				'--surface-base': '#1a1a1a',
			});
			expect(result).toBeNull();
		});

		it('returns warning for poor contrast', () => {
			const result = checkThemeContrast({
				'--text-primary': '#333333',
				'--surface-base': '#2a2a2a',
			});
			expect(result).toBeTruthy();
			expect(result).toContain('contrast ratio');
			expect(result).toContain('--text-primary');
			expect(result).toContain('--surface-base');
		});
	});

	describe('contrast warning in applyServerTheme', () => {
		it('sets contrastWarning when theme has poor contrast', () => {
			applyServerTheme({
				'--text-primary': '#333333',
				'--surface-base': '#2a2a2a',
			});
			expect(themeState.contrastWarning).toBeTruthy();
		});

		it('clears contrastWarning for good contrast', () => {
			applyServerTheme({
				'--text-primary': '#ffffff',
				'--surface-base': '#1a1a1a',
			});
			expect(themeState.contrastWarning).toBeNull();
		});

		it('returns contrastWarning in result', () => {
			const result = applyServerTheme({
				'--text-primary': '#333333',
				'--surface-base': '#2a2a2a',
			});
			expect(result.contrastWarning).toBeTruthy();
		});
	});

	describe('dismissContrastWarning', () => {
		it('clears the contrast warning', () => {
			applyServerTheme({
				'--text-primary': '#333333',
				'--surface-base': '#2a2a2a',
			});
			expect(themeState.contrastWarning).toBeTruthy();
			dismissContrastWarning();
			expect(themeState.contrastWarning).toBeNull();
		});
	});
});
