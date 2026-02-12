/**
 * Auth helpers for virc-client.
 *
 * Credentials live in sessionStorage (survives reload, cleared on tab close).
 * Full auth flow (POST /api/auth, JWT management, SASL) will be implemented
 * in a later task. This module provides the minimal interface needed for
 * routing guards.
 */

const CREDENTIALS_KEY = 'virc:credentials';

export interface StoredCredentials {
	account: string;
	password: string;
}

/** Check whether the user has stored credentials (i.e. is "logged in"). */
export function isAuthenticated(): boolean {
	if (typeof sessionStorage === 'undefined') return false;
	return sessionStorage.getItem(CREDENTIALS_KEY) !== null;
}

/** Store credentials after successful login. */
export function storeCredentials(creds: StoredCredentials): void {
	sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

/** Retrieve stored credentials, or null if not logged in. */
export function getCredentials(): StoredCredentials | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(CREDENTIALS_KEY);
	if (!raw) return null;
	return JSON.parse(raw) as StoredCredentials;
}

/** Clear credentials (logout). */
export function clearCredentials(): void {
	sessionStorage.removeItem(CREDENTIALS_KEY);
}
