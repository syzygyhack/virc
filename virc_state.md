# virc State Report

Current state of the virc codebase against the three specification documents: MVP.md, PLAN.md, and FRONTEND.md.

---

## What We Have Built

### Infrastructure (MVP Step 1)

| Item | Status |
|------|--------|
| `docker-compose.yml` with 5 services (Ergo, MySQL, LiveKit, virc-files, Caddy) | Done |
| Ergo config (`ircd.yaml`): accounts, SASL, WebSocket :8097, MySQL history, always-on, ChanServ | Done |
| LiveKit config (dev keys, single-node) | Done |
| Caddyfile (reverse proxy: /ws, /api/*, /.well-known/*, static SPA) | Done |
| virc-files: 3 MVP endpoints (`/api/auth`, `/api/livekit/token`, `/.well-known/virc.json`) | Done |
| Default virc.json generation from SERVER_NAME | Done |

### IRC Protocol Layer (MVP Step 2)

| Item | Status |
|------|--------|
| `connection.ts` -- WebSocket, line buffering, auto-reconnect with backoff | Done |
| `parser.ts` -- IRC message parsing (tags, prefix, command, params) | Done |
| `cap.ts` -- CAP LS 302, requests all 17 MVP caps | Done |
| `sasl.ts` -- SASL PLAIN auth | Done |
| `commands.ts` -- join, part, privmsg, tagmsg, chathistory, markread, redact, monitor, who, names, topic | Done |
| `format.ts` -- mIRC formatting: markdown input to IRC codes on send, IRC codes to HTML on render | Done |
| `handler.ts` -- Full message dispatcher: PRIVMSG, TAGMSG, JOIN, PART, QUIT, NICK, MODE, TOPIC, BATCH, NAMES, WHO, MONITOR, MARKREAD, REDACT | Done |

### App Shell + Login (MVP Step 3)

| Item | Status |
|------|--------|
| SvelteKit project (Svelte 5, TypeScript, Vite) | Done |
| Login page with server URL, username, password, register toggle | Done |
| Credential storage in sessionStorage | Done |
| Fetch virc.json on connect, apply server name/categories | Done |
| App shell: channel sidebar + main area + member list | Done |
| Channel sidebar grouped by virc.json categories | Done |
| Dark theme with CSS custom properties | Done |
| JWT auth via POST /api/auth, 30-min refresh timer | Done |

### Core Messaging (MVP Step 4)

| Item | Status |
|------|--------|
| Message ring buffer (500 per channel, keyed by msgid) | Done |
| MessageList with message rendering, grouping by author within 7-min window | Done |
| Message component: nick coloring (djb2 hash -> HSL), timestamp, text, reply preview | Done |
| MessageInput: auto-growing textarea, Enter to send, Shift+Enter newline | Done |
| CHATHISTORY LATEST on channel focus, CHATHISTORY BEFORE on scroll-up | Done |
| Read markers: MARKREAD on channel switch, unread divider, unread count badges | Done |
| Replies: reply mode in input, +draft/reply tag, reply preview rendering | Done |
| Reactions: emoji picker, TAGMSG +draft/react, reaction badges with counts, toggle own | Done |
| Typing indicators: TAGMSG +typing throttled, "user is typing..." display | Done |
| Message deletion: REDACT command, confirmation, "[message deleted]" rendering | Done |
| mIRC formatting: **bold**, *italic*, ~~strike~~, \`code\` on send; full palette render | Done |
| Scroll: anchor to bottom, "Jump to Present" pill, position preservation on history prepend | Done |

### Members + Presence + DMs (MVP Step 5)

| Item | Status |
|------|--------|
| members.svelte.ts from WHO/NAMES with multi-prefix and userhost-in-names | Done |
| MemberList grouped by role (~Owner, &Admin, @Moderator, %Helper, +Member, Online, Offline) | Done |
| MONITOR for presence, away-notify for AWAY changes | Done |
| Presence dots: green (online), amber (idle/away), gray (offline) | Done |
| Nick coloring: djb2 hash -> HSL hue, 65% saturation/lightness | Done |
| DMs: PRIVMSG to user, separate DM section in sidebar, CHATHISTORY for DM history | Done |
| DM unread badges | Done |
| User context: click member -> user profile popout with "Send Message" | Done |

### Voice Channels (MVP Step 6)

| Item | Status |
|------|--------|
| voice/room.ts: LiveKit connect/disconnect via livekit-client SDK | Done |
| Token request from POST /api/livekit/token with JWT auth | Done |
| voice.svelte.ts: connection state, participants, local mute/deafen, duration timer | Done |
| Voice channels identified from virc.json categories with voice:true | Done |
| VoicePanel at bottom of sidebar: channel name, timer, mute/deafen/disconnect | Done |
| Speaking indicators (LiveKit ActiveSpeakersChanged) | Done |
| Disconnect leaves LiveKit room | Done |
| Room-aware mute/deafen (controls LiveKit Room, not just UI state) | Done |
| wasMutedBeforeDeafen tracking (undeafen restores prior mute state) | Done |

### Polish Pass (MVP Step 7)

| Item | Status |
|------|--------|
| Reconnect: exponential backoff 1s->2s->4s->max 30s, ConnectionBanner | Done |
| SASL re-auth + JWT refresh on reconnect using stored credentials | Done |
| CHATHISTORY gap fill on reconnect | Done |
| Channel topic display in header bar | Done |
| System messages (join/part/quit) inline, muted style, collapsible (3+ consecutive) | Done |
| Empty state: "Select a channel to start chatting" | Done |
| AuthExpiredModal for session expiry | Done |
| Responsive: member list hidden <1200px (toggle), sidebar overlay <900px | Done |
| Keyboard shortcuts: Ctrl+K (quick switch), Alt+Up/Down (channels), Escape (close), Up (edit last) | Done |
| QuickSwitcher (Ctrl+K): fuzzy channel search with keyboard navigation | Done |
| ErrorBoundary for runtime crashes | Done |

### State Architecture

All 10 state files implemented with Svelte 5 runes. Map/Set reactivity uses the version counter pattern (plain Map/Set storage + `$state(0)` counter for mutation tracking).

| File | What It Manages |
|------|-----------------|
| `connection.svelte.ts` | Connection status, attempt count |
| `servers.svelte.ts` | Server metadata (name, icon) |
| `channels.svelte.ts` | Channel list, active channel, members, topics, categories, DMs |
| `messages.svelte.ts` | Per-channel message buffers, reactions, cursors |
| `members.svelte.ts` | Rich member data: account, presence, modes, voice |
| `presence.svelte.ts` | Online/idle/offline tracking via MONITOR + AWAY |
| `typing.svelte.ts` | Per-channel typing users with auto-expiry |
| `notifications.svelte.ts` | Unread/mention counts, MARKREAD sync |
| `voice.svelte.ts` | Voice room state, participants, mute/deafen |
| `user.svelte.ts` | Current user credentials, nick, account |

### Test Coverage

324 tests across:
- IRC layer: cap, commands, connection, format, handler, parser, sasl
- State: channels, connection, members, messages, notifications, typing, user, voice
- API: auth, discovery
- Utilities: keybindings, emoji
- Backend: virc-files auth (34 tests via Bun)

---

## MVP Gap Analysis

The MVP (MVP.md) defines 7 build steps and 15 in-scope features. Status against the "In" table:

| MVP Feature | Status | Notes |
|-------------|--------|-------|
| Login / Register | **Complete** | SASL PLAIN, NS REGISTER, JWT |
| Channel list with categories | **Complete** | From virc.json, collapsible |
| Send / receive messages | **Complete** | PRIVMSG + echo-message |
| Message history | **Complete** | CHATHISTORY LATEST/BEFORE pagination |
| Read markers + unread badges | **Complete** | MARKREAD, per-channel counts |
| Replies | **Complete** | +draft/reply, inline preview |
| Reactions | **Complete** | +draft/react, emoji picker, badges |
| Typing indicators | **Complete** | +typing TAGMSG, animated dots |
| Message delete | **Complete** | REDACT with confirmation |
| Member list with roles | **Complete** | 6 role tiers, alphabetical sort |
| Presence (online/idle/offline) | **Complete** | MONITOR + away-notify |
| DMs | **Complete** | Private messaging, DM sidebar section |
| Voice channels | **Complete** | LiveKit audio, mute/deafen/speaking |
| Server config (virc.json) | **Complete** | Auto-generated defaults, ETag caching |
| Docker one-command deploy | **Complete** | 5-service docker-compose |
| Auth bridge (virc-files) | **Complete** | Ergo HTTP API validation, JWT minting |

**MVP verdict: All 15 in-scope features are implemented. The MVP is feature-complete.**

All items in the "Out (Post-MVP)" column of MVP.md remain correctly deferred.

---

## PLAN.md Gap Analysis

PLAN.md covers the full product vision across 5 phases. Here's what exists vs. what remains.

### Phase 0 -- Foundation: Complete

All items done. IRC protocol layer, SvelteKit shell, login/register, channel join, PRIVMSG.

### Phase 1 -- Core Chat UX: Mostly Complete

| Item | Status |
|------|--------|
| Message history (CHATHISTORY + virtual scroll) | Done |
| Read markers (MARKREAD) | Done |
| Replies (+draft/reply) | Done |
| Reactions (+draft/react) | Done |
| Typing indicators (+typing) | Done |
| Message deletion (REDACT) | Done |
| Message editing (REDACT + resend with +virc/edit) | **Not implemented** (post-MVP per MVP.md) |
| mIRC formatting rendering | Done |
| User list with roles | Done |
| Channel topic display and editing | Display done. Edit via /topic command, no click-to-edit UI. |

### Phase 2 -- Media & Files: Not Started

| Item | Status |
|------|--------|
| virc-files file upload endpoint | Not implemented |
| Drag-and-drop file upload | Not implemented |
| Image/video inline preview | Not implemented |
| URL unfurling (Open Graph) | Not implemented |
| Paste-to-upload | Not implemented |

### Phase 3 -- Voice & Video: Partially Complete

| Item | Status |
|------|--------|
| LiveKit deployment | Done |
| Token bridge | Done |
| Voice channel detection (virc.json) | Done |
| Join/leave voice UI | Done |
| Mute/deafen controls | Done |
| Voice activity indicators | Done |
| Video toggle | Not implemented |
| Screen sharing | Not implemented |
| 1-on-1 calls | Not implemented |

### Phase 4 -- Polish & Platform: Mostly Not Started

| Item | Status |
|------|--------|
| Push notifications (Web Push) | Not implemented |
| PWA support | Not implemented |
| Tauri desktop wrapper | Not implemented |
| Server management UI | Not implemented |
| Invite links | Not implemented |
| User profiles (avatar, bio) | Partial -- profile popout exists but no metadata storage |
| Custom emoji | Not implemented |
| Search | Not implemented |
| DM conversations | Done |
| Multi-server support | Not implemented |

### Phase 5 -- Scale & Ecosystem: Not Started

Mobile, bots, webhooks, E2EE, federation, theming system, plugin API -- all future work.

---

## FRONTEND.md Gap Analysis

FRONTEND.md is the detailed UI/UX spec. Checking each section:

### Layout

| Spec Item | Status |
|-----------|--------|
| Three-column layout (sidebar + messages + members) | Done |
| Server list (far-left icon strip) | Removed (single-server MVP) |
| Column widths match spec | Approximately -- sidebar 240px, members 240px |
| Resizable sidebars (drag handle) | Not implemented |
| Responsive breakpoints (1200/900/600) | Done |
| Mobile navigation stack | Partial -- overlay sidebar works, no full mobile nav stack |

### Color System

| Spec Item | Status |
|-----------|--------|
| CSS custom properties (design tokens) | Done -- all semantic tokens defined |
| Dark theme | Done |
| Light theme | Not implemented |
| AMOLED theme | Not implemented |
| Compact/IRC Classic theme | Not implemented |
| Server theme overrides via virc.json | Not implemented (tokens defined but no override mechanism) |

### Typography

| Spec Item | Status |
|-----------|--------|
| Inter + JetBrains Mono font stacks | Done |
| Font size scale (xs through xl) | Done |
| User font size preference | Not implemented |

### Components vs Spec

| Component | Spec Status |
|-----------|-------------|
| Server List | Removed for MVP (single-server) |
| Channel Sidebar | Done -- categories, DM section, voice channels inline, unread badges |
| Header Bar | Done -- channel name, topic, member toggle. Missing: search button removed, pinned messages, channel settings gear |
| Message Area (Cozy Mode) | Done -- avatar, nick, timestamp, grouping, reactions, reply preview |
| Message Area (Compact Mode) | Not implemented |
| Message hover toolbar | Partial -- reply and delete buttons. No react button on hover (react via emoji picker). Spec "More" menu replaced with red trash icon |
| Reactions | Done -- pill badges, counts, own-reaction highlight, toggle |
| Unread Divider | Done |
| Scroll behavior | Done -- anchor to bottom, jump to present, history load |
| System messages | Done -- collapsible, muted style |
| Message Input | Done -- auto-grow, Enter/Shift+Enter, reply preview, slash commands, typing emit |
| Formatting toolbar | Not implemented (markdown input works without toolbar) |
| Tab completion (@user, #channel, :emoji) | Not implemented |
| Member List | Done -- role groups, presence dots, alphabetical sort |
| Member hover card | Not implemented |
| User Profile Popout | Done -- basic (nick, account, "Send Message" button). Missing: avatar, bio, roles, registered date |
| Voice Panel | Done -- channel name, timer, mute/deafen/disconnect |
| Voice Overlay (expanded) | Not implemented |
| Quick Switcher (Ctrl+K) | Done |
| Server Settings modal | Not implemented |
| User Settings modal | Not implemented |
| Emoji Picker | Done -- search, categories, frequent tracking |

### Keyboard Shortcuts vs Spec

| Shortcut | Spec | Status |
|----------|------|--------|
| Ctrl+K (quick switch) | Global | Done |
| Ctrl+Shift+M (toggle mute) | Global | Done |
| Ctrl+Shift+D (toggle deafen) | Global | Done |
| Alt+Up/Down (navigate channels) | Global | Done |
| Alt+Shift+Up/Down (navigate unread) | Global | Not implemented |
| Ctrl+\[ / Ctrl+\] (navigate servers) | Global | N/A (single-server) |
| Escape (close modal/cancel reply) | Global | Done |
| Ctrl+, (user settings) | Global | Not implemented (no settings UI) |
| Up arrow (edit last message) | Message | Done (delete+retype) |
| Ctrl+E (emoji picker) | Message | Not implemented |
| Ctrl+Shift+F (focus search) | Message | Not implemented |
| Shift+Escape (mark as read) | Message | Not implemented |
| Page Up/Down (scroll) | Message | Native behavior |
| Home/End (jump oldest/newest) | Message | Not implemented |
| Ctrl+B/I (bold/italic) | Input | Not implemented |

### Other FRONTEND.md Sections

| Section | Status |
|---------|--------|
| Nick coloring (hash -> HSL) | Done |
| Text formatting (mIRC codes) | Done |
| URL detection / auto-linkify | Not implemented |
| @mention / #channel rendering | Not implemented |
| Notifications (in-app) | Partial -- unread badges done, no toast notifications |
| Notifications (OS-level) | Not implemented |
| Per-channel notification settings | Not implemented |
| Animations & transitions | Minimal -- no spec-defined timings |
| Accessibility (keyboard nav, ARIA, contrast) | Partial -- keyboard nav works, minimal ARIA |
| Empty states | Partial -- "Select a channel" done, others missing |
| Loading states | Partial -- login spinner done, no skeleton messages |
| Error states | Done -- ConnectionBanner, AuthExpiredModal |
| Offline behavior / IndexedDB cache | Not implemented |
| Server config integration (theme overrides) | Not implemented |

---

## Summary

### MVP: Complete

All 15 features from the MVP "In" scope are implemented and working. The 7-step build order is fulfilled. The app does what MVP.md promises: docker compose up, register, join #general, send messages, see history, reply, react, type, delete, view members with roles, see presence, DM, join voice.

### Post-MVP Remaining Work (by priority)

**High Value (differentiators):**
- File uploads (drag-and-drop, paste-to-upload, inline preview)
- Message editing (+virc/edit tag)
- Video toggle + screen sharing in voice
- Push notifications (Web Push + service worker)
- Server theme overrides from virc.json

**Medium Value (polish):**
- Compact/IRC Classic display mode
- Light/AMOLED themes
- User settings panel (theme, notifications, voice devices)
- Server settings panel (channels, roles, appearance)
- Tab completion (@user, #channel, :emoji)
- URL auto-linkify + link previews
- Hover card on member list
- Richer user profile (avatar, bio, registration date)
- Keyboard shortcut gaps (Ctrl+E, Shift+Escape, Alt+Shift+Up/Down)
- Toast notifications for DMs/mentions
- Resizable sidebar panels

**Lower Priority (platform):**
- Invite link system
- Custom emoji
- Search
- Multi-server support
- PWA / Tauri desktop
- Mobile navigation stack
- Accessibility audit (ARIA roles, contrast checks)
- IndexedDB offline cache
- 1-on-1 voice/video calls
