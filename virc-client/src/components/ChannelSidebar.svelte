<script lang="ts">
  import {
    channelUIState,
    setActiveChannel,
    toggleCategory,
    type ChannelCategory,
  } from '$lib/state/channels.svelte';
  import { getActiveServer } from '$lib/state/servers.svelte';
  import { voiceState } from '$lib/state/voice.svelte';
  import { getUnreadCount, getMentionCount } from '$lib/state/notifications.svelte';

  interface Props {
    onVoiceChannelClick?: (channel: string) => void;
  }

  let { onVoiceChannelClick }: Props = $props();

  function handleChannelClick(name: string, isVoice: boolean): void {
    if (isVoice) {
      onVoiceChannelClick?.(name);
    } else {
      setActiveChannel(name);
    }
  }

  function handleCategoryClick(cat: ChannelCategory): void {
    toggleCategory(cat.name);
  }
</script>

<aside class="channel-sidebar" aria-label="Channels">
  <div class="server-header">
    <span class="server-name">{getActiveServer()?.name ?? 'virc'}</span>
  </div>

  <div class="channel-list">
    {#if channelUIState.dmConversations.length > 0}
      <div class="category">
        <button class="category-header" aria-label="Direct Messages">
          <svg class="chevron" width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
          </svg>
          <span class="category-name">Direct Messages</span>
        </button>
        <div class="category-channels">
          {#each channelUIState.dmConversations as dm (dm.nick)}
            {@const dmUnread = getUnreadCount(dm.nick)}
            {@const dmMentions = getMentionCount(dm.nick)}
            <button
              class="channel-item"
              class:active={channelUIState.activeChannel === dm.nick}
              class:has-unread={dmUnread > 0}
              class:has-mentions={dmMentions > 0}
              onclick={() => handleChannelClick(dm.nick, false)}
            >
              <span class="channel-icon dm-icon">@</span>
              <span class="channel-name">{dm.nick}</span>
              {#if dmUnread > 0}
                <span class="unread-badge" class:mention-badge={dmMentions > 0}>
                  {dmMentions > 0 ? dmMentions : dmUnread}
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#each channelUIState.categories as cat (cat.name)}
      <div class="category">
        <button
          class="category-header"
          onclick={() => handleCategoryClick(cat)}
          aria-expanded={!cat.collapsed}
          aria-label="{cat.name} category"
        >
          <svg
            class="chevron"
            class:collapsed={cat.collapsed}
            width="10"
            height="10"
            viewBox="0 0 10 10"
          >
            <path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
          </svg>
          <span class="category-name">{cat.name}</span>
        </button>

        {#if !cat.collapsed}
          <div class="category-channels">
            {#each cat.channels as ch (ch)}
              {@const chUnread = getUnreadCount(ch)}
              {@const chMentions = getMentionCount(ch)}
              <button
                class="channel-item"
                class:active={!cat.voice && channelUIState.activeChannel === ch}
                class:voice-connected={cat.voice && voiceState.currentRoom === ch}
                class:has-unread={chUnread > 0}
                class:has-mentions={chMentions > 0}
                onclick={() => handleChannelClick(ch, !!cat.voice)}
              >
                {#if cat.voice}
                  <svg class="channel-icon voice-icon" width="14" height="14" viewBox="0 0 16 16">
                    <path
                      d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM5 8a1 1 0 0 0-2 0 5 5 0 0 0 4 4.9V14H5a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9v-1.1A5 5 0 0 0 13 8a1 1 0 0 0-2 0 3 3 0 0 1-6 0z"
                      fill="currentColor"
                    />
                  </svg>
                {:else}
                  <span class="channel-icon hash-icon">#</span>
                {/if}
                <span class="channel-name">{ch.replace(/^#/, '')}</span>
                {#if chUnread > 0}
                  <span class="unread-badge" class:mention-badge={chMentions > 0}>
                    {chMentions > 0 ? chMentions : chUnread}
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</aside>

<style>
  .channel-sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    min-width: 240px;
    height: 100%;
    background: var(--surface-low);
    overflow: hidden;
  }

  .server-header {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 16px;
    border-bottom: 1px solid var(--surface-lowest);
    flex-shrink: 0;
  }

  .server-name {
    font-size: var(--font-md);
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .channel-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .category {
    margin-bottom: 2px;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 2px;
    width: 100%;
    padding: 6px 8px 6px 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: var(--font-xs);
    font-weight: var(--weight-semibold);
    font-family: var(--font-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    transition: color var(--duration-channel);
  }

  .category-header:hover {
    color: var(--text-primary);
  }

  .chevron {
    flex-shrink: 0;
    transition: transform var(--duration-channel);
  }

  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .category-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .category-channels {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .channel-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: calc(100% - 16px);
    margin: 0 8px;
    padding: 6px 8px;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: var(--font-base);
    font-family: var(--font-primary);
    text-align: left;
    transition:
      background var(--duration-channel),
      color var(--duration-channel);
  }

  .channel-item:hover {
    background: var(--surface-high);
    color: var(--text-primary);
  }

  .channel-item.active {
    background: var(--accent-bg);
    color: var(--text-primary);
    font-weight: var(--weight-medium);
  }

  .channel-item.voice-connected {
    background: rgba(59, 165, 93, 0.12);
    color: var(--success, #3ba55d);
    font-weight: var(--weight-medium);
  }

  .channel-icon {
    flex-shrink: 0;
    color: var(--text-muted);
    font-size: var(--font-md);
    font-weight: var(--weight-medium);
    line-height: 1;
  }

  .channel-icon.voice-icon {
    color: var(--text-muted);
  }

  .dm-icon {
    font-size: var(--font-sm);
    font-weight: var(--weight-bold);
  }

  .channel-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
    flex: 1;
    min-width: 0;
  }

  .channel-item.has-unread {
    color: var(--text-primary);
    font-weight: var(--weight-semibold);
  }

  .channel-item.has-mentions {
    color: var(--accent-primary);
  }

  .unread-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: var(--text-muted);
    color: var(--surface-low);
    border-radius: 9px;
    font-size: var(--font-xs);
    font-weight: var(--weight-bold);
    line-height: 1;
    flex-shrink: 0;
  }

  .unread-badge.mention-badge {
    background: var(--accent-primary);
    color: var(--text-inverse);
  }
</style>
