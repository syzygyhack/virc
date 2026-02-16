import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	userState,
	isAuthenticated,
	login,
	logout,
	setNick,
	getStoredCredentials,
	rehydrate,
} from './user.svelte';

/**
 * Minimal localStorage mock for Node-based vitest.
 */
function createSessionStorageMock() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
		key: (_index: number) => null,
	} as Storage;
}

describe('user state', () => {
	beforeEach(async () => {
		const storage = createSessionStorageMock();
		vi.stubGlobal('localStorage', storage);
		// Reset state to clean slate
		await logout();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('starts with null account and nick', () => {
		expect(userState.account).toBeNull();
		expect(userState.nick).toBeNull();
	});

	it('isAuthenticated is false when no account', () => {
		expect(isAuthenticated()).toBe(false);
	});

	it('login() sets account, nick, and stores credentials', async () => {
		await login('alice', 'hunter2');

		expect(userState.account).toBe('alice');
		expect(userState.nick).toBe('alice');
		expect(isAuthenticated()).toBe(true);

		const creds = await getStoredCredentials();
		expect(creds).toEqual({ account: 'alice', password: 'hunter2' });
	});

	it('logout() clears state and credentials', async () => {
		await login('alice', 'hunter2');
		await logout();

		expect(userState.account).toBeNull();
		expect(userState.nick).toBeNull();
		expect(isAuthenticated()).toBe(false);
		expect(await getStoredCredentials()).toBeNull();
	});

	it('setNick() updates the nick without changing account', async () => {
		await login('alice', 'hunter2');
		setNick('alice_away');

		expect(userState.nick).toBe('alice_away');
		expect(userState.account).toBe('alice');
	});

	it('rehydrate() restores state from localStorage', async () => {
		await login('bob', 'pass123');

		// Simulate state loss (e.g. module re-import after reload)
		userState.account = null;
		userState.nick = null;

		rehydrate();

		expect(userState.account).toBe('bob');
		expect(userState.nick).toBe('bob');
	});

	it('rehydrate() does nothing when no credentials stored', () => {
		rehydrate();

		expect(userState.account).toBeNull();
		expect(userState.nick).toBeNull();
	});
});
