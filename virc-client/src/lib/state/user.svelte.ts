/**
 * Reactive user/auth state for the current session.
 *
 * Account name is stored in localStorage (fast, sync, non-sensitive).
 * Password is stored in the OS keychain in Tauri builds, or localStorage
 * in web builds. See auth.ts for the full credential storage strategy.
 */

import {
	storeCredentials,
	getCredentials,
	clearCredentials,
	clearToken,
	isAuthenticated as hasStoredCredentials,
	type StoredCredentials,
} from '../api/auth';

interface UserStore {
	account: string | null;
	nick: string | null;
}

/** Reactive user state — components read this directly. */
export const userState: UserStore = $state({
	account: null,
	nick: null,
});

/**
 * Whether the user is authenticated (has a stored account).
 * Svelte 5 does not allow exporting `$derived` from modules, so this
 * is exposed as a function. Inside a component's reactive context,
 * calling `isAuthenticated()` will still track reactively.
 */
export function isAuthenticated(): boolean {
	return userState.account !== null;
}

/**
 * Log the user in: store credentials and update reactive state.
 * Does NOT perform SASL or JWT — callers handle that.
 */
export async function login(account: string, password: string): Promise<void> {
	await storeCredentials({ account, password });
	userState.account = account;
	userState.nick = account; // Nick defaults to account name until server confirms
}

/**
 * Clear session: remove stored credentials, server URLs, and reset reactive state.
 */
export async function logout(): Promise<void> {
	await clearCredentials();
	clearToken();
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem('virc:serverUrl');
		localStorage.removeItem('virc:filesUrl');
	}
	userState.account = null;
	userState.nick = null;
}

/**
 * Update the confirmed nick (e.g. after RPL_WELCOME or NICK change).
 */
export function setNick(nick: string): void {
	userState.nick = nick;
}

/**
 * Retrieve stored credentials for SASL reconnect or JWT refresh.
 * Returns null if no credentials are stored.
 */
export async function getStoredCredentials(): Promise<StoredCredentials | null> {
	return getCredentials();
}

/**
 * Restore reactive state from localStorage on app start.
 * Uses sync localStorage check for the account name (fast) —
 * the password is only fetched async when actually needed.
 */
export function rehydrate(): void {
	if (typeof localStorage === 'undefined') return;
	// Check new key first, then legacy
	const account = localStorage.getItem('virc:account');
	if (account) {
		userState.account = account;
		userState.nick = account;
		return;
	}
	// Legacy: check virc:credentials
	if (hasStoredCredentials()) {
		const raw = localStorage.getItem('virc:credentials');
		if (raw) {
			try {
				const parsed = JSON.parse(raw) as { account: string };
				if (parsed.account) {
					userState.account = parsed.account;
					userState.nick = parsed.account;
				}
			} catch {
				// Corrupted — ignore
			}
		}
	}
}
