<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { IRCConnection } from '$lib/irc/connection';
  import { negotiateCaps } from '$lib/irc/cap';
  import { authenticateSASL } from '$lib/irc/sasl';
  import { registerHandler } from '$lib/irc/handler';
  import { join } from '$lib/irc/commands';
  import { getCredentials, getToken } from '$lib/api/auth';
  import {
    setConnecting,
    setConnected,
    setDisconnected,
    connectionState,
  } from '$lib/state/connection.svelte';
  import { rehydrate, userState } from '$lib/state/user.svelte';
  import {
    channelUIState,
    setActiveChannel,
    setCategories,
  } from '$lib/state/channels.svelte';
  import { addServer, getActiveServer } from '$lib/state/servers.svelte';
  import ServerList from '../../components/ServerList.svelte';
  import ChannelSidebar from '../../components/ChannelSidebar.svelte';
  import HeaderBar from '../../components/HeaderBar.svelte';

  /** virc.json config shape (subset we consume). */
  interface VircConfig {
    name?: string;
    icon?: string;
    channels?: {
      categories?: Array<{
        name: string;
        channels: string[];
        voice?: boolean;
      }>;
    };
  }

  let conn: IRCConnection | null = null;
  let showMembers = $state(true);
  let error: string | null = $state(null);

  function toggleMembers(): void {
    showMembers = !showMembers;
  }

  /**
   * Fetch virc.json from the files server.
   * Returns parsed config or null on failure.
   */
  async function fetchVircConfig(filesUrl: string): Promise<VircConfig | null> {
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${filesUrl}/.well-known/virc.json`, { headers });
      if (!res.ok) return null;
      return (await res.json()) as VircConfig;
    } catch {
      return null;
    }
  }

  /**
   * Connect to IRC, authenticate, fetch virc.json, populate state,
   * and auto-join channels.
   */
  async function initConnection(): Promise<void> {
    const creds = getCredentials();
    if (!creds) return;

    // Rehydrate user state from sessionStorage
    rehydrate();

    // Determine server URLs from sessionStorage
    const serverUrl = sessionStorage.getItem('virc:serverUrl') ?? 'ws://localhost:8097';
    const filesUrl = sessionStorage.getItem('virc:filesUrl') ?? 'http://localhost:8080';

    error = null;

    try {
      // 1. Create and connect
      conn = new IRCConnection({ url: serverUrl });
      setConnecting();
      await conn.connect();
      setConnected();

      // 2. Register message handler (before sending any commands)
      registerHandler(conn);

      // 3. CAP negotiation + NICK/USER
      conn.send(`NICK ${creds.account}`);
      conn.send(`USER ${creds.account} 0 * :${creds.account}`);
      await negotiateCaps(conn);

      // 4. SASL authentication
      await authenticateSASL(conn, creds.account, creds.password);

      // 5. Fetch virc.json
      const config = await fetchVircConfig(filesUrl);

      // 6. Register server in state
      const serverName = config?.name ?? 'IRC Server';
      const serverIcon = config?.icon ?? null;
      addServer({
        id: 'default',
        name: serverName,
        url: serverUrl,
        filesUrl,
        icon: serverIcon ? `${filesUrl}${serverIcon}` : null,
      });

      // 7. Populate categories from virc.json
      const categories = config?.channels?.categories ?? [
        { name: 'Channels', channels: ['#general'] },
      ];
      setCategories(categories);

      // 8. Auto-join all channels from categories
      const allChannels = categories.flatMap((cat) => cat.channels);
      if (allChannels.length > 0) {
        join(conn, allChannels);
      }

      // 9. Set first text channel as active
      const firstTextCategory = categories.find((cat) => !cat.voice);
      const firstChannel = firstTextCategory?.channels[0] ?? allChannels[0];
      if (firstChannel) {
        setActiveChannel(firstChannel);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error = msg;
      setDisconnected(msg);
    }
  }

  onMount(() => {
    initConnection();
  });

  onDestroy(() => {
    if (conn) {
      try {
        conn.disconnect();
      } catch {
        // ignore cleanup errors
      }
      conn = null;
    }
  });
</script>

<div class="chat-layout">
  <!-- Left column: Server list + Channel sidebar -->
  <div class="left-panel">
    <ServerList />
    <ChannelSidebar />
  </div>

  <!-- Center column: Header + Messages + Input -->
  <div class="center-panel">
    <HeaderBar onToggleMembers={toggleMembers} />

    <div class="message-area">
      {#if error}
        <div class="error-banner">
          <span>Connection error: {error}</span>
        </div>
      {:else if connectionState.status === 'connecting'}
        <div class="status-banner">Connecting...</div>
      {:else if connectionState.status === 'reconnecting'}
        <div class="status-banner reconnecting">Reconnecting...</div>
      {:else if !channelUIState.activeChannel}
        <div class="empty-state">
          <p>Select a channel to start chatting</p>
        </div>
      {:else}
        <div class="placeholder-messages">
          <!-- MessageArea will be built in a subsequent task -->
        </div>
      {/if}
    </div>

    <div class="message-input-area">
      <!-- MessageInput will be built in a subsequent task -->
      <div class="input-placeholder">
        <span class="input-placeholder-text">
          {#if channelUIState.activeChannel}
            Message {channelUIState.activeChannel}
          {:else}
            Select a channel
          {/if}
        </span>
      </div>
    </div>
  </div>

  <!-- Right column: Member list -->
  {#if showMembers}
    <div class="right-panel">
      <!-- MemberList will be built in a subsequent task -->
      <div class="member-placeholder">
        <span class="member-placeholder-title">Members</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-layout {
    display: flex;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--surface-base);
  }

  .left-panel {
    display: flex;
    flex-shrink: 0;
    height: 100%;
  }

  .center-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  .message-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .message-input-area {
    flex-shrink: 0;
    padding: 0 16px 16px;
  }

  .right-panel {
    width: 240px;
    min-width: 240px;
    height: 100%;
    background: var(--surface-low);
    border-left: 1px solid var(--surface-lowest);
    overflow-y: auto;
  }

  /* Status banners */
  .error-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: var(--danger);
    color: #fff;
    font-size: var(--font-sm);
    font-weight: var(--weight-medium);
  }

  .status-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: var(--accent-bg);
    color: var(--text-secondary);
    font-size: var(--font-sm);
  }

  .status-banner.reconnecting {
    background: rgba(240, 178, 50, 0.12);
    color: var(--warning);
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: var(--font-md);
  }

  .placeholder-messages {
    flex: 1;
  }

  /* Input placeholder */
  .input-placeholder {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: var(--surface-high);
    border-radius: 8px;
    min-height: 44px;
  }

  .input-placeholder-text {
    color: var(--text-muted);
    font-size: var(--font-base);
  }

  /* Member list placeholder */
  .member-placeholder {
    padding: 16px;
  }

  .member-placeholder-title {
    font-size: var(--font-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
