# virc

**A Discord-competitive chat platform built on IRC.**

virc wraps the battle-tested IRC protocol in a modern UI — real-time messaging, voice channels, reactions, typing indicators, presence, and read markers — all running on standard IRCv3 infrastructure. Ships as a native desktop app via Tauri. No proprietary server. No vendor lock-in. One WebSocket connection.

> Svelte 5. IRC native. LiveKit voice. Tauri desktop. Self-hostable.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  virc Desktop App                       │
│        (Tauri 2 + Svelte 5 + SvelteKit SPA)             │
├──────────────┬──────────────────────┬───────────────────┤
│  WebSocket   │   HTTP + JWT         │   WebRTC          │
│  (IRC)       │   (Auth, Config)     │   (Voice/Video)   │
├──────────────┼──────────────────────┼───────────────────┤
│  Ergo IRC    │   virc-files         │   LiveKit SFU     │
│  - Accounts  │   - Auth bridge      │  - Voice rooms    │
│  - Channels  │   - JWT minting      │  - Mute/deafen    │
│  - History   │   - Config serving   │  - Speaker detect │
│  - Always-on │   - LK token gen     │                   │
│  - WebSocket │                      │                   │
├──────────────┴──────────────────────┴───────────────────┤
│                   MariaDB                               │
│              (message history)                          │
├─────────────────────────────────────────────────────────┤
│                    Caddy                                │
│     (reverse proxy, TLS termination, static serving)    │
└─────────────────────────────────────────────────────────┘
```

The client connects to Ergo over a single WebSocket for all chat functionality. Voice goes peer-to-peer via LiveKit. The backend (`virc-files`) is a thin auth bridge — it validates credentials against Ergo's HTTP API, mints JWTs, and serves server configuration. Caddy fronts everything.

### Design Decisions

**Why IRC?** Ergo is a single Go binary that provides accounts, channels, message history, always-on clients, and a full IRCv3 extension set out of the box. It replaces what would otherwise be a custom chat server, a message queue, a presence system, and a history database.

**Why Svelte 5?** Rune-based reactivity (`$state`, `$derived`, `$effect`) maps naturally to chat state — 10 reactive stores with zero external state management libraries.

**Why LiveKit?** Single binary SFU with a client SDK. Voice channels are just LiveKit rooms keyed by channel name.

**Why Tauri?** Native desktop performance with a ~5 MB binary. No Electron overhead. WebView2 on Windows, WebKit on macOS/Linux. Direct access to the OS for notifications and window management.

---

## Features

### Chat
- Send/receive messages with mIRC formatting (bold, italic, underline, monospace)
- Message history pagination (CHATHISTORY BEFORE/LATEST/AFTER)
- Replies with quoted parent preview
- Emoji reactions (unicode, via TAGMSG)
- Message editing and deletion (REDACT)
- Typing indicators (throttled, auto-expiring)
- Read markers synced via MARKREAD
- Unread badges and mention counts
- Slash command popup with 16 IRC commands, descriptions, and keyboard navigation
- Commands gated by channel privilege level (mod commands require halfop+)
- `//` escape to send literal `/`-prefixed messages

### Channels & DMs
- Channel list with configurable categories
- Channel topic display and inline editing
- Direct messages as separate buffer panes
- Quick channel switcher (Ctrl+K)

### Members & Presence
- Role-grouped member list (Owner, Admin, Moderator, Helper, Member)
- Online/idle/DND/offline presence dots
- MONITOR-based live presence tracking
- Away status via away-notify
- Nick coloring by account hash

### Voice
- Join/leave voice channels via LiveKit
- Mute and deafen toggles
- Speaking indicator (green ring)
- Participant list in sidebar with mute/deafen status icons
- Mic tester with loopback audio and level meter in settings

### Account
- Display name editing in settings UI
- Nick change via `/nick` command
- Persistent login across app restarts (localStorage)

### Desktop (Tauri 2)
- Native window with 1280x800 default, 600x400 minimum
- Bundled for Windows (.msi/.exe), macOS (.dmg), and Linux (.deb/.AppImage)
- No browser required — runs as a standalone app

### UI
- Three-column responsive layout (server list + sidebar + messages + members)
- Dark theme with CSS custom properties
- Keyboard shortcuts (Ctrl+K, Alt+Up/Down, Escape, Shift+Escape)
- Tab completion (@user, #channel, :emoji:)
- Hover toolbar (React, Reply, More)
- Connection status banner with auto-reconnect
- Voice controls on separate row from username

---

## IRCv3 Capabilities

virc negotiates these capabilities with the server:

| Capability | Purpose |
|------------|---------|
| `sasl` | SASL PLAIN authentication |
| `message-tags` | Client tags for reactions, replies, typing |
| `echo-message` | Server echoes own messages with msgid/time |
| `server-time` | All messages timestamped |
| `batch` | CHATHISTORY results grouped in batch |
| `labeled-response` | Request/response correlation |
| `draft/chathistory` | Message history pagination |
| `draft/read-marker` | MARKREAD for unread sync |
| `draft/event-playback` | Replay JOIN/PART in history |
| `draft/message-redaction` | REDACT command |
| `account-tag` | Sender account in tags |
| `account-notify` | Account login/logout |
| `away-notify` | AWAY status changes |
| `extended-join` | JOIN includes account + realname |
| `multi-prefix` | All mode prefixes in NAMES |
| `userhost-in-names` | Full hostmask in NAMES |
| `cap-notify` | Server-initiated CAP changes |
| `setname` | Real name changes |

Client-only tags (relayed transparently): `+draft/reply`, `+draft/react`, `+typing`, `+virc/edit`.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 20 (for SvelteKit)
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Rust](https://rustup.rs/) (for Tauri desktop builds)

### Quick Start

```bash
# Clone
git clone https://github.com/syzygyhack/virc.git
cd virc

# Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum

# Build the client
cd virc-client
npm install
npm run build
cd ..

# Start everything (Ergo, MariaDB, LiveKit, virc-files, Caddy)
docker compose up -d
```

Docker Compose runs all five services. Caddy serves the built client from `/srv/virc` and proxies `/ws` to Ergo, `/api/*` to virc-files.

### Desktop Build (Tauri)

```bash
cd virc-client

# Development (hot-reload with Tauri window)
npm run tauri:dev

# Production build (generates installer for your platform)
npm run tauri:build
```

Requires [Rust](https://rustup.rs/) and platform-specific Tauri dependencies (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

### Development

All backend services run in Docker. Only the Vite dev server runs on the host:

```bash
# Linux / macOS
./dev.sh

# Windows (PowerShell)
.\dev.ps1
```

This starts the full Docker stack (`docker compose up -d`) then launches the Vite dev server with HMR. The Vite config proxies `/ws` to Ergo and `/api`/`/.well-known` to virc-files inside Docker.

Or manually:

```bash
# Start all services
docker compose up -d

# Start client dev server (separate terminal)
cd virc-client && npm install && npm run dev
```

### Run Tests

```bash
# Client tests (324 tests, Vitest)
cd virc-client && npm test

# Server tests (34 tests, Bun)
cd virc-files && bun test
```

---

## Project Structure

```
virc/
├── virc-client/                 # Svelte 5 + SvelteKit frontend
│   ├── src/
│   │   ├── components/          # 17 Svelte components
│   │   ├── lib/
│   │   │   ├── api/             # Auth tokens + server discovery
│   │   │   ├── irc/             # IRC protocol layer
│   │   │   │   ├── parser.ts    # IRCv3 message parser
│   │   │   │   ├── connection.ts # WebSocket + reconnect
│   │   │   │   ├── handler.ts   # Message dispatcher
│   │   │   │   ├── commands.ts  # IRC command builders
│   │   │   │   ├── cap.ts       # CAP negotiation
│   │   │   │   ├── sasl.ts      # SASL PLAIN auth
│   │   │   │   └── format.ts    # mIRC ↔ HTML rendering
│   │   │   ├── state/           # 10 reactive stores ($state runes)
│   │   │   ├── voice/           # LiveKit room management
│   │   │   └── keybindings.ts   # Keyboard shortcut system
│   │   └── routes/
│   │       ├── login/           # Login/register page
│   │       └── chat/            # Main chat page
│   └── src-tauri/               # Tauri 2 desktop shell
│       ├── Cargo.toml           # Rust dependencies
│       ├── tauri.conf.json      # Window, bundle, security config
│       ├── capabilities/        # Tauri permission grants
│       ├── icons/               # App icons (all platforms)
│       └── src/                 # Rust entry point
├── virc-files/                  # Bun + Hono backend (runs in Docker)
│   └── src/
│       ├── routes/
│       │   ├── auth.ts          # POST /api/auth (JWT minting)
│       │   ├── livekit.ts       # POST /api/livekit/token
│       │   └── config.ts        # GET /.well-known/virc.json
│       ├── middleware/auth.ts   # JWT verification
│       └── env.ts               # Environment config
├── config/
│   ├── ergo/ircd.yaml           # Ergo IRC server config
│   ├── livekit/config.yaml      # LiveKit SFU config
│   └── caddy/Caddyfile          # Reverse proxy rules
├── docker-compose.yml           # 5-service stack
├── dev.sh                       # Dev launcher (Linux/macOS)
├── dev.ps1                      # Dev launcher (Windows)
├── PLAN.md                      # Architecture spec (869 lines)
├── FRONTEND.md                  # UI/UX design spec (988 lines)
└── MVP.md                       # MVP scope & build order (417 lines)
```

---

## Configuration

Server identity, channel layout, roles, and theming are driven by `virc.json`, served at `/.well-known/virc.json`:

```jsonc
{
  "name": "My Server",
  "icon": "/icon.png",
  "description": "A virc community",
  "channels": {
    "categories": [
      {
        "name": "Text Channels",
        "channels": ["#general", "#random"]
      },
      {
        "name": "Voice",
        "channels": ["#voice-lobby"],
        "voice": true
      }
    ]
  },
  "roles": {
    "~": { "name": "Owner", "color": "#e0a040" },
    "@": { "name": "Moderator", "color": "#50a0e0" }
  }
}
```

No client forking required for customization.

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `JWT_SECRET` | Yes | — | JWT signing key |
| `LIVEKIT_API_KEY` | Yes | — | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | — | LiveKit API secret |
| `ERGO_API` | No | `http://ergo:8089` | Ergo HTTP API URL |
| `ERGO_API_TOKEN` | No | _(generated)_ | Bearer token for Ergo HTTP API |
| `LIVEKIT_URL` | No | `ws://livekit:7880` | Internal LiveKit signaling URL |
| `LIVEKIT_CLIENT_URL` | No | `ws://localhost:7880` | Client-facing LiveKit WebSocket URL |
| `ALLOWED_ORIGIN` | No | _(disabled)_ | Origin header check for CSRF |
| `PORT` | No | `8080` | Backend listen port |
| `CONFIG_PATH` | No | `config/virc.json` | Server config file path |

---

## Docker Compose Services

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| **ergo** | `ghcr.io/ergochat/ergo:stable` | 6667, 8097 | IRC server (WebSocket + plaintext) |
| **mysql** | `mariadb:11` | 3306 | Message history persistence |
| **livekit** | `livekit/livekit-server:latest` | 7880-7881, 50000-50100/udp | Voice/video SFU |
| **virc-files** | Built from `./virc-files` | 8080 | Auth bridge + config |
| **caddy** | `caddy:2` | 80, 443 | Reverse proxy + static SPA |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2 |
| Client framework | Svelte | 5 |
| Meta framework | SvelteKit | 2 |
| Build tool | Vite | 6 |
| Client testing | Vitest | 4 |
| IRC parsing | irc-message-ts | 3 |
| Voice/video SDK | livekit-client | 2 |
| Backend framework | Hono | 4 |
| JWT library | jose | 6 |
| Backend runtime | Bun | 1.3+ |
| IRC server | Ergo | stable |
| Voice server | LiveKit | latest |
| Database | MariaDB | 11 |
| Reverse proxy | Caddy | 2 |
| TypeScript | | 5 |

---

## Test Coverage

| Suite | Tests |
|-------|-------|
| IRC handler | 56 |
| IRC format/rendering | 34 |
| Message store | 31 |
| Member store | 27 |
| IRC commands | 20 |
| IRC parser | 18 |
| Notification store | 16 |
| IRC connection | 14 |
| Emoji library | 13 |
| Typing store | 13 |
| Voice store | 13 |
| CAP negotiation | 12 |
| Keybindings | 11 |
| SASL auth | 11 |
| Discovery | 10 |
| Auth API (client) | 9 |
| Connection store | 9 |
| User store | 7 |
| **Client total** | **324** |
| Auth endpoint (server) | 11 |
| LiveKit endpoint (server) | 7 |
| Config endpoint (server) | 6 |
| Auth middleware (server) | 10 |
| **Server total** | **34** |
| **Total** | **358** |

---

## Known Deferrals

These items are specified in the design docs but intentionally deferred from the MVP.

| Item | Current State | Notes |
|------|--------------|-------|
| File uploads / media embeds | Not implemented | Planned via virc-files |
| URL unfurling (OpenGraph) | Not implemented | Requires server-side fetch |
| Push notifications | Not implemented | Web Push API planned |
| Custom server emoji | Config structure ready | Rendering not wired |
| Search | Not implemented | Ergo SEARCH extension available |
| User profiles / avatars | Partial | Generated initials only |
| Screen sharing / video | Audio only | LiveKit supports it |
| Multi-server | Single server | UI accommodates server list |
| Theme customization UI | Dark only | CSS vars support theming |
| Voice error feedback | Console only | No user-facing error UI |

---

## Documentation

| Document | Description |
|----------|-------------|
| [`PLAN.md`](PLAN.md) | Architecture spec — tech decisions, protocol design, scalability (869 lines) |
| [`FRONTEND.md`](FRONTEND.md) | UI/UX design spec — layout, components, themes, accessibility (988 lines) |
| [`MVP.md`](MVP.md) | MVP scope — build order, smoke tests, capability reference (417 lines) |

---

## How This Was Built

The initial codebase was authored by **Claude Opus 4.6** (Anthropic) running inside the **Avril** harness — a session-based agent framework for quality-assured code generation. The work was orchestrated by **Cardinal**, a task planning and execution system that decomposed the design specs into 36 implementable work units, managed dependencies, and tracked progress across the build.

Post-initial build, development continued as **human-agent collaboration** — the human directed priorities and reviewed results while Claude (Opus 4.6 via Avril) implemented features, diagnosed bugs, and integrated fixes. Cross-model review (**Claude + OpenAI Codex**) identified issues including MODE parsing drift, MONITOR timing races, and slash command edge cases, all of which were resolved.

The process:

1. **Specification** — PLAN.md, FRONTEND.md, and MVP.md were written via human-agent collaboration, defining architecture, UI/UX, and build order.
2. **Task decomposition** — Cardinal broke the specs into 36 tasks across two packages, ordered by dependency graph: Docker infrastructure first, then IRC protocol layer, then UI shell, then features.
3. **Implementation** — Opus 4.6, operating in Avril sessions, implemented each task: source code, tests, configuration, and deployment manifests.
4. **Iteration** — Human-agent collaboration added persistence, display name editing, slash commands with auth gating, voice UI improvements, mic testing, and Tauri desktop packaging.
5. **Review** — Cross-model review (Claude + OpenAI Codex) identified issues across all findings. All critical and major findings were resolved.

### By the Numbers

| Metric | Value |
|--------|-------|
| TypeScript + Svelte source | ~11,050 lines |
| Test code | ~3,560 lines |
| Design specs | ~2,275 lines |
| Infrastructure config | ~1,290 lines |
| Commits | 40 |
| Packages | 2 |
| Tests | 358 |

---

## License

MIT
