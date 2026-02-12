/**
 * Reactive server state for the server list.
 *
 * Tracks connected servers and which one is active. MVP supports a
 * single server; the data model supports multiple for future use.
 */

export interface ServerInfo {
	id: string;
	name: string;
	url: string;
	filesUrl: string;
	icon: string | null;
}

interface ServerStore {
	servers: ServerInfo[];
	activeServerId: string | null;
}

/** Reactive server store — components read this directly. */
export const serverState: ServerStore = $state({
	servers: [],
	activeServerId: null,
});

/** Add a server to the list and make it active. */
export function addServer(server: ServerInfo): void {
	const existing = serverState.servers.find((s) => s.id === server.id);
	if (!existing) {
		serverState.servers.push(server);
	}
	serverState.activeServerId = server.id;
}

/** Set the active server by ID. */
export function setActiveServer(id: string): void {
	if (serverState.servers.some((s) => s.id === id)) {
		serverState.activeServerId = id;
	}
}

/** Get the currently active server, or null if none. */
export function getActiveServer(): ServerInfo | null {
	if (!serverState.activeServerId) return null;
	return serverState.servers.find((s) => s.id === serverState.activeServerId) ?? null;
}

/** Update server info (e.g. after fetching virc.json). */
export function updateServer(id: string, updates: Partial<Omit<ServerInfo, 'id'>>): void {
	const server = serverState.servers.find((s) => s.id === id);
	if (server) {
		if (updates.name !== undefined) server.name = updates.name;
		if (updates.url !== undefined) server.url = updates.url;
		if (updates.filesUrl !== undefined) server.filesUrl = updates.filesUrl;
		if (updates.icon !== undefined) server.icon = updates.icon;
	}
}

/** Reset all server state. */
export function resetServers(): void {
	serverState.servers.length = 0;
	serverState.activeServerId = null;
}
