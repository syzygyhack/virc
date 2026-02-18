# accord TODO

Work required before publishing. Ordered by priority.

---

## Blockers

### ~~Add LICENSE file~~ (DONE)
- [x] Create `LICENSE` at repo root with MIT text

### ~~Commit uncommitted work~~ (DONE)
- [x] Stage and commit the 14 modified files + 3 untracked files currently in the working tree
- Includes: voice manager extraction, a11y utilities, navigation extraction, code review fixes

### ~~Remove hardcoded secret from shipped config~~ (DONE)
- [x] Replace OAuth2 `client-secret` in `config/ergo/ircd.yaml` with `"CHANGE-ME"` placeholder

---

## ~~Rename to accord~~ (DONE)

Full project rename completed. ~200 locations across source, config, tests, and docs.

- [x] Package & project identity (package.json, tauri.conf.json, Cargo.toml)
- [x] Directory renames (`accord-client/`, `accord-files/`)
- [x] Custom IRC tag (`+accord/edit`)
- [x] localStorage / keyring namespace (all `accord:` prefixed)
- [x] Custom events (`accord:edit-message`, `accord:scroll-to-message`, etc.)
- [x] JWT & API constants (`accord-files` issuer/audience, `accord.local`)
- [x] API endpoint (`/.well-known/accord.json`)
- [x] Docker & infrastructure (service names, volumes, Dockerfile, Caddyfile, Ergo config)
- [x] Environment (`.env.example`)
- [x] Default strings (server name, User-Agent, console logs)
- [x] Documentation (README, PLAN.md, FRONTEND.md, TODO.md, repo URL)

---

## Publish Hygiene

### ~~Add CI pipeline~~ (DONE)
- [x] Create `.github/workflows/ci.yml` — runs vitest, bun test, svelte-check on push/PR

### ~~Add CHANGELOG~~ (DONE)
- [x] Create `CHANGELOG.md` with initial release notes

### ~~Bump version numbers~~ (DONE)
- [x] Both packages at `0.1.0`

### ~~Add .dockerignore~~ (DONE)
- [x] `accord-files/.dockerignore` created

### ~~Fix README drift~~ (DONE)
- [x] Test count: 981 (790 client + 191 server)
- [x] Component count: 28
- [x] Updated "By the Numbers" table

### ~~Fix svelte-check warnings~~ (DONE)
- [x] Migrate deprecated `<slot>` elements to Svelte 5 `{@render}` syntax (24 warnings)
- [x] Address a11y lint warnings (missing labels, roles, etc.)

---

## Code Quality

### ~~Deduplicate backend constants~~ (DONE)
- [x] Extract `JWT_ISSUER`, `JWT_AUDIENCE`, `ERGO_TIMEOUT_MS` into shared `constants.ts`
- [x] Extract repeated Ergo API fetch+check+parse pattern into `ergoClient` helper (~120 lines saved)

### ~~Reduce +page.svelte complexity~~ (DONE)
- [x] Extract `initConnection` (165 lines) into a connection lifecycle module
- [x] Extract keyboard shortcut registration (~280 lines) into a composable
- [x] Extract message action handlers (reply, react, edit, delete, pin — ~200 lines)
- [x] +page.svelte reduced from ~1355 to ~809 lines (target was 800)

### ~~Minor improvements~~ (DONE)
- [x] Cache `TextEncoder().encode(JWT_SECRET)` at module level instead of per-request (middleware/auth.ts)
- [x] Move `getMimeType` map to module-level constant (files.ts)
- [ ] Add typed event map to IRC connection to replace `any` listener types
- [x] ~~Fix double DNS resolution in preview.ts~~ — resolved via `resolvePinnedUrl()` DNS pinning
- [x] ~~Add SSR guard (`hasLocalStorage()`) to all bare `localStorage` calls~~ — unified across all state modules, auth, and keybindings
- [x] ~~Store `voiceError` auto-dismiss timer refs to prevent premature clearing~~ — `voiceErrorTimer` with cleanup in +page.svelte

---

## Known Deferrals

Not required for initial publish. Documented for future work.

| Item | Notes |
|------|-------|
| Push notifications | Web Push API planned |
| Search | Ergo SEARCH extension available |
| User avatars / bios | Blocked on IRCv3 `draft/metadata-2` |
| Screen sharing / video | Audio only for channels; DM video calls work |
| Multi-server | UI accommodates server list; single-server for now |
| Theme customization UI | Four themes implemented (dark/light/AMOLED/compact) with server theme overrides and contrast checking; CSS vars ready for full editor |
| Custom server emoji | Fully wired: rendered in emoji picker, tab completion, and messages; URLs validated against http(s) |
| Voice channel access control | Any authenticated user can get a token for any channel name |

---

## Intentional Deviations from Spec

These differ from FRONTEND.md/PLAN.md by design.

- **Font stack**: system fonts instead of Inter (native feel, no external loading)
- **Font size**: 3 zoom levels (100/125/150%) instead of continuous slider
- **Sidebar overlay**: triggers at 900px (combines spec's two breakpoints)
- **Quick switcher**: global modal (Ctrl+K) instead of inline sidebar search
- **Caddy WebSocket path**: `/ws` instead of spec's `/irc/*`
