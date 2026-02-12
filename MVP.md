# virc MVP Plan

Prove the concept: a Discord-like chat experience running on IRC, easy to self-host.

---

## What "MVP" Means Here

A single person can `docker compose up`, point a domain at it, share a link, and have friends join a community with text chat, DMs, and voice — all feeling like Discord, not like IRC.

---

## MVP Scope

### In

| Feature | Why It's Essential |
|---------|--------------------|
| **Login / Register** | Gate to everything. Must feel native (not "connect to IRC server"). |
| **Channel list with categories** | The sidebar IS the Discord feel. Without categories it's a flat IRC channel list. |
| **Send / receive messages** | Obviously. |
| **Message history** | Users expect scroll-up to work. Without it, it feels broken. |
| **Read markers + unread badges** | "Where did I leave off?" is core to async chat. |
| **Replies** | Flat chat without context is the #1 complaint about IRC. |
| **Reactions** | Low-effort engagement. Core social feature. |
| **Typing indicators** | Makes chat feel alive and real-time. |
| **Message delete** | Users need to fix mistakes. |
| **Member list with roles** | Users need to see who's here and who's in charge. |
| **Presence (online/idle/offline)** | Community feels alive or dead based on this. |
| **DMs** | Codex is right — this must be in MVP, not Phase 4. Users expect private messaging immediately. |
| **Voice channels** | The "video" in virc. Differentiator from every other IRC client. Even basic join/leave/mute is enough. |
| **Server config (virc.json)** | Server identity (name, icon, categories, roles). Without it every server looks identical. |
| **Docker one-command deploy** | The Teamspeak promise. `docker compose up` and it works. |
| **Auth bridge (virc-files)** | Required for file uploads and voice tokens. Core plumbing. |

### Out (Post-MVP)

| Feature | Why It Can Wait |
|---------|-----------------|
| Message editing | Delete + resend is fine for now. Edit adds msgid chain complexity. |
| File uploads / media embeds | Users can paste URLs. Upload infrastructure is a whole service. |
| URL unfurling / link previews | Nice-to-have, not blocking. |
| Push notifications | Requires MySQL polling pipeline. Users are already in the app for MVP testing. |
| Custom emoji | Standard Unicode emoji is enough. |
| Invite links | Share the server URL directly for now. |
| Search | Scroll up or use CHATHISTORY. Not critical for small communities. |
| User profiles / avatars | Nick + role is enough identity for MVP. |
| Tauri desktop wrapper | Browser-first. Desktop comes later. |
| Screen sharing | Voice is enough. Video/screen share is Phase 2. |
| Multi-server | One server, one community. Multi-server is a power feature. |
| Theming (light/amoled/compact) | Ship dark theme only. Add modes later. |
| Formatting toolbar | Users can type markdown. Toolbar is convenience. |
| Thread view (sidebar) | Replies inline are enough. Dedicated thread panel is polish. |

---

## Architecture (MVP)

```
docker compose up → 5 containers:

┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────┐  ┌─────────┐
│  Ergo     │  │  MySQL   │  │  virc-files   │  │ LiveKit │  │  Caddy  │
│  IRC      │  │  history │  │  auth + config│  │ voice   │  │  proxy  │
│  server   │  │  DB      │  │  + LK tokens  │  │ SFU     │  │  + TLS  │
└──────────┘  └──────────┘  └──────────────┘  └─────────┘  └─────────┘
```

MySQL is a required service — history persistence and future push depend on it.

virc-files for MVP handles:
1. `POST /api/auth` — validate credentials against Ergo HTTP API, issue JWT
2. `POST /api/livekit/token` — issue LiveKit room token (requires JWT)
3. `GET /.well-known/virc.json` — serve server config (generated defaults if admin hasn't customized)

File uploads, push, URL preview, invites — all deferred.

---

## Client Structure (MVP)

```
virc-client/
├── src/
│   ├── lib/
│   │   ├── irc/
│   │   │   ├── connection.ts      # WebSocket management, reconnect
│   │   │   ├── parser.ts          # IRC message parsing
│   │   │   ├── cap.ts             # CAP LS 302, negotiate caps
│   │   │   ├── sasl.ts            # SASL PLAIN auth
│   │   │   └── commands.ts        # Send helpers (PRIVMSG, JOIN, TAGMSG, etc.)
│   │   ├── state/
│   │   │   ├── connection.svelte.ts   # Connection status, reconnect state
│   │   │   ├── servers.svelte.ts      # Server list (single server for MVP)
│   │   │   ├── channels.svelte.ts     # Channel list, active channel, categories
│   │   │   ├── messages.svelte.ts     # Message buffers per channel (ring buffer)
│   │   │   ├── members.svelte.ts      # WHO/NAMES results, presence (MONITOR + away-notify)
│   │   │   ├── user.svelte.ts         # Current user identity, settings
│   │   │   ├── voice.svelte.ts        # LiveKit room state, participants
│   │   │   └── notifications.svelte.ts # Unread/mention counts per channel
│   │   ├── voice/
│   │   │   └── room.ts               # LiveKit connect/disconnect/mute
│   │   └── api/
│   │       └── auth.ts               # POST /api/auth, token storage/refresh
│   ├── routes/
│   │   ├── +layout.svelte            # App shell (server strip + sidebar + main)
│   │   ├── login/
│   │   │   └── +page.svelte          # Login / register form
│   │   └── chat/
│   │       └── +page.svelte          # Main chat view (messages + input + members)
│   └── components/
│       ├── ServerList.svelte          # Left icon strip (single server for MVP)
│       ├── ChannelSidebar.svelte      # Channel list grouped by category
│       ├── HeaderBar.svelte           # Channel name + topic
│       ├── MessageList.svelte         # Virtual-scrolled messages
│       ├── Message.svelte             # Single message (text, reply preview, reactions)
│       ├── MessageInput.svelte        # Textarea + send (Enter), reply mode
│       ├── MemberList.svelte          # Right sidebar, role groups, presence dots
│       ├── VoicePanel.svelte          # Bottom-of-sidebar voice controls
│       ├── TypingIndicator.svelte     # "user is typing..." bar
│       └── UnreadDivider.svelte       # "NEW MESSAGES" line
├── static/
├── svelte.config.js
├── vite.config.ts
└── package.json
```

Routing is minimal for MVP — login page and chat page. No per-channel URL segments yet; active channel is client state.

---

## Build Order

Seven steps. Each produces a testable milestone.

### Step 1: Backend Stack
**Deliverable**: `docker compose up` gives you a working Ergo + LiveKit + Caddy + MySQL.

- [ ] Write `docker-compose.yml` with all 5 services (Ergo, LiveKit, virc-files, MySQL, Caddy)
- [ ] Write Ergo config (`ircd.yaml`) with: accounts enabled, SASL, WebSocket on :8097, history to MySQL, always-on, nick=account, ChanServ, relevant IRCv3 caps
- [ ] Write LiveKit config (dev keys, single-node)
- [ ] Write Caddyfile (reverse proxy: `/ws` → Ergo WS, `/api/*` → virc-files, `/.well-known/*` → virc-files, `/*` → static SPA)
- [ ] Write virc-files (TypeScript/Bun — the 3 MVP endpoints: `/api/auth`, `/api/livekit/token`, `/.well-known/virc.json`)
- [ ] Write a default `virc.json` with placeholder server name, default categories, default roles
- [ ] Test: `docker compose up`, connect with any IRC client to verify Ergo works, curl the API endpoints
- **Milestone: Infrastructure runs with one command**

### Step 2: IRC Protocol Layer
**Deliverable**: TypeScript library that connects to Ergo, authenticates, joins channels, and sends/receives messages.

- [ ] `connection.ts` — open WebSocket, send/recv raw IRC lines, auto-reconnect with backoff
- [ ] `parser.ts` — parse IRC messages (or integrate `irc-message-ts`): prefix, command, params, tags
- [ ] `cap.ts` — `CAP LS 302`, request all MVP-required caps (see IRCv3 Capability Reference below)
- [ ] `sasl.ts` — SASL PLAIN flow (AUTHENTICATE, 903/904 handling)
- [ ] `commands.ts` — typed send helpers: `join(channel)`, `privmsg(target, text)`, `tagmsg(target, tags)`, `chathistory(subcommand, ...)`, `markread(channel, ...)`, `monitor(+/-, nicks)`, `who(channel)`, `redact(target, msgid)`
- [ ] Test: connect from Node REPL, authenticate, join #general, send and receive a message
- **Milestone: IRC over WebSocket works programmatically**

### Step 3: App Shell + Login
**Deliverable**: SvelteKit app with login screen, connects to Ergo, lands in chat.

- [ ] SvelteKit project setup (Svelte 5, TypeScript, Vite)
- [ ] Login page: server URL, username, password fields. Register toggle (SASL account creation via `NS REGISTER`)
- [ ] On login success: store credentials in sessionStorage (needed for IRC reconnect + JWT refresh), fetch `/.well-known/virc.json`, transition to chat view
- [ ] App shell layout: server list (left strip) + channel sidebar + main area + member list
- [ ] Channel sidebar: virc.json categories define the display structure. On connect, auto-join all channels listed in virc.json. `NAMES` populates member lists. Channels not in virc.json are shown in an "Other" group at the bottom.
- [ ] Apply dark theme (CSS custom properties from FRONTEND.md)
- [ ] Wire up virc-files auth: `POST /api/auth` on login → store JWT for later use
- **Milestone: User can log in and see the Discord-like layout**

### Step 4: Core Messaging
**Deliverable**: Send and receive messages with history, replies, reactions, delete, typing.

- [ ] `messages.svelte.ts` — ring buffer (500 messages per channel), keyed by msgid
- [ ] MessageList component — render messages, grouped by author within 7-min window
- [ ] Message component — nickname (hash-colored), timestamp, text content, reply preview
- [ ] MessageInput component — auto-growing textarea, Enter to send, Shift+Enter for newline
- [ ] History: on channel focus, `CHATHISTORY LATEST #channel * 50`. On scroll-up, `CHATHISTORY BEFORE #channel msgid=<oldest-loaded-msgid> 50` (cursor is the msgid of the oldest message in the local buffer). Skeleton loading at top. Track `oldestMsgid` and `newestMsgid` per channel buffer to avoid gaps/loops.
- [ ] Read markers: `MARKREAD` on channel switch. Unread divider ("NEW MESSAGES" line). Unread count badges in sidebar.
- [ ] Replies: click reply on hover toolbar → reply mode in input (shows preview above textarea) → send with `+draft/reply` tag. Render reply previews on received messages.
- [ ] Reactions: hover toolbar react button → emoji picker (Unicode grid, no custom emoji yet) → send `TAGMSG` with `+draft/react`. Aggregate reaction badges below messages. Click to toggle own reaction.
- [ ] Typing indicators: send `TAGMSG` with `+typing=active` on keypress (throttled 3s). Render "user is typing..." below input.
- [ ] Message deletion: hover toolbar → More → Delete → confirmation → `REDACT`. Remove from local buffer.
- [ ] mIRC formatting: render bold (`\x02`), italic (`\x1D`), underline (`\x1F`), monospace (`\x11`), color (`\x03`). Convert markdown input (`**bold**`, `*italic*`, `` `code` ``) to mIRC codes on send.
- [ ] Scroll behavior: anchor to bottom, "Jump to Present" pill when scrolled up, auto-scroll on new message if at bottom.
- **Milestone: Full text chat — send, receive, history, reply, react, type, delete**

### Step 5: Members + Presence + DMs
**Deliverable**: Member list with roles and presence. Direct messages between users.

- [ ] `members.svelte.ts` — populate from `WHO #channel` and `NAMES` (with `userhost-in-names` and `multi-prefix`). Track mode prefixes per user per channel.
- [ ] MemberList component — group by role, sort alphabetically within group, show presence dots. Role mapping: IRC mode prefix → virc.json role name (`~`→Owner, `&`→Admin, `@`→Moderator, `%`→Helper, `+`→Member). If virc.json has no `roles` section, use these defaults. Users with no mode prefix go in "Online"/"Offline" groups.
- [ ] Presence: `MONITOR +` for members of the active channel only (not all known users — Ergo's MONITOR limit is typically 100 nicks). Update MONITOR list on channel switch. Listen to `away-notify` for AWAY state changes. Map to online (green) / idle-away (amber) / offline (gray). Fallback for channels with >100 members: show presence from NAMES/WHO only (no live updates for offline→online transitions).
- [ ] Nick coloring: hash account name → HSL hue, fixed saturation/lightness. Role color override from virc.json.
- [ ] DMs: `PRIVMSG targetuser :message`. DM conversations appear as a separate "Direct Messages" section above categories in the sidebar. Use `CHATHISTORY` with target=user for DM history.
- [ ] DM unread badges in sidebar.
- [ ] User context menu (right-click on member): Send Message (opens/focuses DM).
- **Milestone: You can see who's online, their roles, and DM anyone**

### Step 6: Voice Channels
**Deliverable**: Join a voice channel, talk, mute/deafen, see who's speaking.

- [ ] `voice/room.ts` — connect to LiveKit using `livekit-client` SDK. Request token from `POST /api/livekit/token` (with virc-files JWT).
- [ ] `voice.svelte.ts` — track room state: connected, participants, local mute/deafen.
- [ ] Voice channels: identified from virc.json categories with `"voice": true`. Show speaker icon prefix in sidebar. Show connected participants inline below channel name.
- [ ] Click voice channel → request mic permission → connect to LiveKit room → join the IRC channel too (for presence).
- [ ] VoicePanel component (bottom of sidebar when connected): channel name, duration timer, mute/deafen/disconnect buttons.
- [ ] Speaking indicator: green ring/highlight on participants who are speaking (LiveKit `isSpeaking` event).
- [ ] Disconnect button leaves LiveKit room + parts the IRC voice channel.
- [ ] No video, no screen share for MVP. Audio only.
- **Milestone: Voice chat works**

### Step 7: Polish Pass
**Deliverable**: The app feels like a product, not a prototype.

- [ ] Reconnect handling: auto-reconnect with backoff (1s → 2s → 4s → max 30s). Yellow "Reconnecting..." banner. On reconnect: SASL re-auth using stored credentials from sessionStorage, re-join channels, `CHATHISTORY AFTER` with last known msgid to fill the gap. Refresh virc-files JWT via `POST /api/auth`.
- [ ] Channel topic display in header bar. Click-to-edit for ops.
- [ ] System messages (join/part/quit) rendered inline, muted style, collapsible.
- [ ] Empty states: "Say something!" in empty channel, "Add a server" with no servers.
- [ ] Error states: send failure indicator on messages, auth expiry modal.
- [ ] Responsive: hide member list below 1200px (toggle button), overlay sidebar below 900px.
- [ ] Loading states: branded splash on connect, skeleton messages while fetching history.
- [ ] Keyboard shortcuts: Ctrl+K (quick channel switch), Alt+Up/Down (navigate channels), Escape (close modal/cancel reply), Up arrow in empty input (edit last message — just delete+retype for MVP).
- [ ] `virc-files` serves a generated default `virc.json` if admin hasn't customized it (server name from Ergo, all channels in one "Channels" category, default role names).
- **Milestone: MVP is coherent and usable**

---

## What This Proves

When all 7 steps are done, you can demo:

1. **Host**: `git clone && docker compose up` → server is running with TLS
2. **Join**: open `https://your-domain.com`, register an account, land in #general
3. **Chat**: send messages, scroll history, reply to someone, react with emoji, see typing
4. **People**: see who's online, their roles, DM someone privately
5. **Talk**: click a voice channel, hear each other, mute yourself
6. **Feel**: dark theme, Discord layout, unread badges, smooth reconnect

That's enough to show the concept works and get early feedback. Everything else (files, video, push, search, custom emoji, invites, Tauri, mobile) layers on top without rearchitecting.

---

## Tech Decisions for MVP

| Decision | Choice | Rationale |
|----------|--------|-----------|
| virc-files language | **TypeScript (Node/Bun)** | Same language as client. Three simple endpoints don't justify a separate Go toolchain. Can migrate to Go later if perf matters. |
| Client routing | **Single-page, client-side state** | No SvelteKit server routes needed for MVP. IRC connection is persistent WebSocket, not request/response. SvelteKit gives us build tooling + future SSR for login/invite pages. |
| IRC parser | **`irc-message-ts`** | Don't reinvent parsing. It handles tags, prefixes, params. Wrap it with typed helpers. |
| Virtual scroll | **Custom minimal implementation** | Libraries like `svelte-virtual-list` exist but IRC message heights vary. Build a simple "render visible + buffer" approach. Replace with a robust lib later if needed. |
| Emoji picker | **Unicode-only, simple grid** | No external emoji picker library for MVP. A searchable grid of common emoji (~200) is enough. Expand later. |
| State management | **Svelte 5 runes (`$state`, `$derived`)** | No external store library. Each state file exports reactive objects. |
| MySQL | **Included in docker-compose** | Required for history persistence. Not optional. |
| TLS | **Caddy auto-TLS** | Zero-config HTTPS. Ergo WebSocket and virc-files go through Caddy. No manual cert management. |

---

## IRCv3 Capability Reference

Canonical list of what the client requests via `CAP REQ` and why. Verified against Ergo's `gencapdefs.py` — all are supported.

### Server Capabilities (requested via CAP REQ)

| Capability | Required For | Notes |
|------------|-------------|-------|
| `sasl` | Login/register | SASL PLAIN authentication |
| `message-tags` | Reactions, replies, typing | Enables client-only tags (`+draft/react`, `+draft/reply`, `+typing`) to be sent/received via TAGMSG and PRIVMSG |
| `echo-message` | Send confirmation | Server echoes back our own messages with server-assigned msgid and timestamp |
| `server-time` | Timestamps | All messages include `time` tag with server timestamp |
| `batch` | History, multiline | Groups related messages (CHATHISTORY results arrive in a batch) |
| `labeled-response` | Request correlation | Match our commands to server responses (prevents race conditions) |
| `draft/chathistory` | Message history | CHATHISTORY LATEST/BEFORE/AFTER commands for pagination |
| `draft/read-marker` | Unread tracking | MARKREAD command to sync read position across devices |
| `draft/event-playback` | Reconnect gap fill | Replays JOIN/PART/MODE events in CHATHISTORY results |
| `draft/message-redaction` | Message delete | REDACT command to remove messages from history |
| `account-tag` | User identity | Every message includes sender's account name |
| `account-notify` | Account changes | Notified when users in shared channels log in/out |
| `away-notify` | Presence | Notified when users in shared channels go AWAY or return |
| `extended-join` | Richer JOIN info | JOIN messages include account name and realname |
| `multi-prefix` | Role display | NAMES shows all mode prefixes per user (e.g., `@+nick`) |
| `userhost-in-names` | Member details | NAMES includes full `nick!user@host` |
| `cap-notify` | Cap changes | Server notifies if capabilities change mid-session |
| `setname` | Display name | Users can change their realname (display name) after connecting |

### Client-Only Tags (no CAP needed — just require `message-tags`)

These are **not server capabilities**. They are client tags prefixed with `+`, relayed transparently by any server that supports `message-tags`.

| Tag | Used For | Sent Via |
|-----|----------|----------|
| `+draft/reply=<msgid>` | Replies | PRIVMSG tag — references parent message |
| `+draft/react=<emoji>` | Reactions | TAGMSG tag — must include `+draft/reply` pointing to target message |
| `+typing=active\|paused\|done` | Typing indicators | TAGMSG tag — throttle to max 1 per 3 seconds per target |

### What the Client Does NOT Request (for MVP)

| Capability | Why Skipped |
|------------|-------------|
| `draft/multiline` | Not needed for MVP (messages under the line limit are fine) |
| `draft/account-registration` | We use NickServ REGISTER instead (simpler, universally supported) |
| `draft/metadata-2` | User profiles deferred to post-MVP |
| `draft/persistence` | Ergo handles always-on natively via config |

---

## Channel Discovery Flow

How the client figures out what channels to show in the sidebar:

1. **Fetch `virc.json`** on login — this defines categories, channel order, voice channels
2. **Auto-join all channels listed in `virc.json` categories** — send `JOIN #general,#dev,#help,...` as a single command
3. **`NAMES` replies** populate each channel's member list
4. **Display in sidebar** grouped by virc.json categories, in virc.json order
5. **Channels the user is in but NOT in virc.json** (e.g., DMs, channels joined manually) appear in an "Other" group at the bottom
6. **Channels in virc.json that the user can't join** (e.g., invite-only) show as grayed out with a lock icon

If virc.json is unavailable, fallback: join `#general` only, show all channels flat (no categories).

---

## Auth + Credential Lifecycle

How credentials flow through the system:

1. **User enters** username + password on login screen
2. **Client stores** credentials in `sessionStorage` (survives page reload within tab, cleared on tab close)
3. **IRC auth**: SASL PLAIN using stored credentials
4. **HTTP auth**: `POST /api/auth` with same credentials → virc-files validates via Ergo HTTP API → returns JWT (1-hour expiry)
5. **JWT stored** in memory (not localStorage — short-lived, no persistence needed)
6. **JWT refresh**: client sets a timer for 50 minutes. On tick, re-calls `POST /api/auth` with stored credentials to get a fresh JWT
7. **Reconnect**: on WebSocket disconnect, client uses stored credentials for SASL re-auth + JWT refresh
8. **Tab close**: `sessionStorage` is cleared automatically by the browser. User must log in again.
9. **Explicit logout**: clear `sessionStorage`, close WebSocket, redirect to login

Why `sessionStorage` and not `localStorage`: credentials shouldn't persist across browser sessions. A user closing the tab should require re-login. `sessionStorage` gives us reload resilience without long-term credential storage.

---

## Smoke Tests

Minimum checks to verify each step works. Run manually for MVP; automate later.

### Step 1: Backend Stack
```
docker compose up -d
# Ergo responds to IRC:
echo -e "CAP LS 302\r\n" | websocat ws://localhost:8097
# virc-files auth endpoint:
curl -s http://localhost:8080/api/auth -X POST -H 'Content-Type: application/json' -d '{"account":"testuser","password":"testpass"}' | jq .
# virc.json served:
curl -s http://localhost:8080/.well-known/virc.json | jq .name
# MySQL accessible by Ergo:
docker compose logs ergo | grep -i mysql
```

### Step 2: IRC Protocol Layer
```
# Run from Node/Bun REPL or a test script:
# 1. Connect WebSocket to Ergo
# 2. CAP LS 302 → verify all expected caps appear
# 3. SASL PLAIN → verify 903 (success)
# 4. JOIN #general → verify 366 (end of NAMES)
# 5. PRIVMSG #general :test → verify echo-message returns with msgid + server-time
# 6. CHATHISTORY LATEST #general * 10 → verify batch response with messages
```

### Step 3: App Shell + Login
```
# Open browser to localhost:
# 1. Login form renders
# 2. Register new account → success → redirected to chat
# 3. Sidebar shows categories and channels from virc.json
# 4. Channels have correct grouping
```

### Step 4: Core Messaging
```
# With two browser tabs open as different users:
# 1. Send message in tab A → appears in tab B (and vice versa)
# 2. Scroll up → older messages load (CHATHISTORY BEFORE)
# 3. Click reply → reply preview shows → send → reply renders with parent quote
# 4. Click react → emoji picker → select → reaction badge appears on both tabs
# 5. Type in tab A → "user is typing..." shows in tab B
# 6. Delete message → disappears from both tabs
# 7. Switch channels → unread badge clears → MARKREAD sent
```

### Step 5: Members + Presence + DMs
```
# 1. Member list shows users grouped by role
# 2. Close tab B → tab A shows user B transition to idle/offline
# 3. Reopen tab B → presence updates in tab A
# 4. Right-click user → Send Message → DM conversation opens
# 5. Send DM → appears in both users' DM panels
# 6. DM shows unread badge when received
```

### Step 6: Voice Channels
```
# 1. Click voice channel → browser requests mic permission
# 2. Accept → connected (VoicePanel appears at bottom of sidebar)
# 3. Second user joins same voice channel → both can hear each other
# 4. Mute → other user can't hear you (mic icon shows muted)
# 5. Deafen → you can't hear others
# 6. Speaking indicator shows green ring when talking
# 7. Disconnect → VoicePanel disappears, removed from voice channel participant list
```

### Step 7: Polish
```
# 1. Kill Ergo container → yellow "Reconnecting..." banner appears
# 2. Restart Ergo → client reconnects, banner clears, missed messages appear
# 3. Resize browser to <900px → sidebar becomes overlay
# 4. Empty channel shows "Say something!" message
# 5. Ctrl+K → quick channel switch modal opens
```
