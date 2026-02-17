# accord TODO

Work required before publishing. Ordered by priority.

---

## Blockers

### Add LICENSE file
- [ ] Create `LICENSE` at repo root with MIT text
- README claims MIT but no license file exists — project is under exclusive copyright without it

### Commit uncommitted work
- [ ] Stage and commit the 14 modified files + 3 untracked files currently in the working tree
- Includes: voice manager extraction, a11y utilities, navigation extraction, code review fixes

### Remove hardcoded secret from shipped config
- [ ] Replace OAuth2 `client-secret: "4TA0I7mJ3fUUcW05KJiODg"` in `config/ergo/ircd.yaml:623` with a placeholder
- OAuth2 is disabled in the config, but users may copy the file verbatim

---

## Rename: virc -> accord

Full project rename. ~200 locations across source, config, tests, and docs.

### Package & project identity
- [ ] `virc-client/package.json` — name field
- [ ] `virc-files/package.json` — name field
- [ ] `virc-client/src-tauri/tauri.conf.json` — productName, identifier (`com.virc.app`), window title
- [ ] `virc-client/src-tauri/Cargo.toml` — crate name (`virc`), lib name (`virc_lib`)
- [ ] Regenerate `Cargo.lock` after Cargo.toml changes

### Directory names
- [ ] Rename `virc-client/` -> `accord-client/`
- [ ] Rename `virc-files/` -> `accord-files/`
- [ ] Update all cross-references to these directories (docker-compose, Caddyfile, README, etc.)

### Custom IRC tag
- [ ] `+virc/edit` -> `+accord/edit` in `lib/irc/commands.ts`, `lib/irc/handler.ts`, and all tests
- This is a wire protocol tag — both client and any future third-party clients must agree on the name

### localStorage / keyring namespace
- [ ] `virc:account` -> `accord:account` (auth.ts)
- [ ] `virc:credentials` -> `accord:credentials` (auth.ts)
- [ ] `virc:keyring-pending-delete` -> `accord:keyring-pending-delete` (auth.ts)
- [ ] `virc:serverUrl` -> `accord:serverUrl` (login/+page.svelte, AuthExpiredModal, UserSettings)
- [ ] `virc:filesUrl` -> `accord:filesUrl` (login/+page.svelte, Message.svelte, AuthExpiredModal, UserSettings)
- [ ] `virc:appSettings` -> `accord:appSettings` (appSettings.svelte.ts)
- [ ] `virc:frequent-emoji` -> `accord:frequent-emoji` (emoji.ts)
- [ ] `virc:keybindingOverrides` -> `accord:keybindingOverrides` (keybindings.ts)
- [ ] Keyring service name `virc` -> `accord` (auth.ts)
- [ ] Update all corresponding test assertions

### Custom events
- [ ] `virc:edit-message`, `virc:insert-mention`, `virc:insert-emoji` (MessageInput.svelte)
- [ ] `virc:scroll-to-message`, `virc:scroll-messages` (MessageList.svelte)
- [ ] `virc:reply`, `virc:react`, etc. in +page.svelte (verify all `window.dispatchEvent` calls)

### JWT & API constants
- [ ] `JWT_ISSUER = "virc-files"` -> `"accord-files"` (middleware/auth.ts, routes/auth.ts)
- [ ] `JWT_AUDIENCE = "virc-files"` -> `"accord-files"` (middleware/auth.ts, routes/auth.ts)
- [ ] Default server ID `virc.local` -> `accord.local` (env.ts)
- [ ] Warning message referencing `virc.local` (env.ts)
- [ ] Update all test fixtures in `virc-files/tests/helpers.ts` and individual test files

### API endpoint
- [ ] `/.well-known/virc.json` -> `/.well-known/accord.json` (config.ts route, discovery.ts client, Caddyfile if proxied)
- [ ] `CONFIG_PATH` default `config/virc.json` -> `config/accord.json` (env.ts)
- [ ] Schema URL `https://virc.app/schema/...` -> update domain (config.ts)

### Docker & infrastructure
- [ ] `docker-compose.yml` — service name `virc-files`, volume names `virc-uploads`/`virc-data`, build path, Caddy mount
- [ ] `config/caddy/Caddyfile` — `reverse_proxy virc-files:8080`, `root * /srv/virc`
- [ ] `virc-files/Dockerfile` — user/group name `virc`
- [ ] `config/ergo/ircd.yaml` — server `name: virc`, network `name: virc.local`, comments

### Environment
- [ ] `.env.example` — all comments referencing virc/virc-files

### Default strings
- [ ] `"virc Server"` default server name (config.ts:64)
- [ ] `"A virc community server"` default description (config.ts:72)
- [ ] `"virc-link-preview/1.0"` User-Agent (preview.ts:336)
- [ ] Console log `virc-files listening on` (index.ts:61)
- [ ] Console error `[virc] InviteStore save failed` (invite.ts:46)

### Documentation
- [ ] `README.md` — title, all prose, architecture diagram, project structure, repo URL
- [ ] `PLAN.md` — title (`virc — Video IRC`), all references
- [ ] `FRONTEND.md` — title, all references
- [ ] `TODO.md` — this file (already renamed)
- [ ] `virc-client/src/app.css` — header comment
- [ ] `virc-client/src/lib/constants.ts` — JSDoc comments
- [ ] Update README repo URL (`syzygyhack/virc` -> new repo name)

---

## Publish Hygiene

### Add CI pipeline
- [ ] Create `.github/workflows/ci.yml`
- [ ] Run `vitest run` for client tests
- [ ] Run `bun test` for server tests
- [ ] Run `svelte-check` for type checking
- [ ] Trigger on push and PR to main

### Add CHANGELOG
- [ ] Create `CHANGELOG.md` with initial release notes summarizing current feature set

### Bump version numbers
- [ ] `accord-client/package.json` — `0.0.1` -> `0.1.0` (minimum)
- [ ] `accord-files/package.json` — `0.1.0` is acceptable, or bump to match

### Add .dockerignore
- [ ] Create `accord-files/.dockerignore` excluding tests/, node_modules/, *.md, .git

### Fix README drift
- [ ] Test count: 651 -> 899 (744 client + 155 server)
- [ ] Component count: 23 -> 28
- [ ] Update "By the Numbers" table (commits, line counts, test counts)

### Fix svelte-check warnings
- [ ] Migrate deprecated `<slot>` elements to Svelte 5 `{@render}` syntax (24 warnings)
- [ ] Address a11y lint warnings (missing labels, roles, etc.)

---

## Code Quality

### Deduplicate backend constants
- [ ] Extract `JWT_ISSUER`, `JWT_AUDIENCE`, `ERGO_TIMEOUT_MS` into shared `constants.ts`
- [ ] Extract repeated Ergo API fetch+check+parse pattern into `ergoClient` helper (~120 lines saved)

### Reduce +page.svelte complexity
- [ ] Extract `initConnection` (165 lines) into a connection lifecycle module
- [ ] Extract keyboard shortcut registration (~280 lines) into a composable
- [ ] Extract message action handlers (reply, react, edit, delete, pin — ~200 lines)
- [ ] Target: get +page.svelte under 800 lines

### Minor improvements
- [ ] Cache `TextEncoder().encode(JWT_SECRET)` at module level instead of per-request (middleware/auth.ts)
- [ ] Move `getMimeType` map to module-level constant (files.ts)
- [ ] Add typed event map to IRC connection to replace `any` listener types
- [ ] Fix double DNS resolution in preview.ts — reuse IPs from `assertPublicResolution`
- [ ] Add SSR guard (`hasLocalStorage()`) to remaining bare `localStorage` calls in +page.svelte
- [ ] Store `voiceError` auto-dismiss timer refs to prevent premature clearing

---

## Known Deferrals

Not required for initial publish. Documented for future work.

| Item | Notes |
|------|-------|
| Push notifications | Web Push API planned |
| Search | Ergo SEARCH extension available |
| User avatars / bios | Blocked on IRCv3 `draft/metadata-2` |
| Screen sharing / video | Audio only; LiveKit supports it |
| Multi-server | UI accommodates server list; single-server for now |
| Theme customization UI | Dark only; CSS vars ready for theming |
| Custom server emoji | Config structure ready, rendering not wired |
| Voice channel access control | Any authenticated user can get a token for any channel name |

---

## Intentional Deviations from Spec

These differ from FRONTEND.md/PLAN.md by design.

- **Font stack**: system fonts instead of Inter (native feel, no external loading)
- **Font size**: 3 zoom levels (100/125/150%) instead of continuous slider
- **Sidebar overlay**: triggers at 900px (combines spec's two breakpoints)
- **Quick switcher**: global modal (Ctrl+K) instead of inline sidebar search
- **Caddy WebSocket path**: `/ws` instead of spec's `/irc/*`
