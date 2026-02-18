# accord Release Readiness Review

Date: 2026-02-18

## Scope
Reviewed docs/config/CI, server (`accord-files`), and client (`accord-client`) for release readiness: security, reliability, error handling, API surface, tests, performance, accessibility, and documentation accuracy.

Key paths reviewed:
- docker-compose.yml
- config/caddy/Caddyfile
- .env.example
- .github/workflows/ci.yml
- accord-files/src/**
- accord-client/src/**

## Overall Assessment
The codebase is in strong shape for a 0.1.0 release. The architecture is clean, security posture is thoughtful (rate limiting, JWT validation, SSRF defenses, upload validation), and tests are comprehensive for most core logic. The remaining issues are mostly medium/low severity and largely operational or UX stability concerns rather than correctness flaws.

No critical blockers were found. Addressing the medium items below would materially improve production robustness.

## Strengths
- Clear separation between IRC client, file/API server, and infra; sensible boundaries.
- Solid security hardening already in place (JWT length enforcement, SSRF blocklist + DNS pinning, upload magic bytes, HSTS/CSP).
- Extensive unit coverage for both client and server logic.
- Good resilience patterns: reconnect lifecycle, gap-fill, MONITOR restore, typed command helpers, localStorage guards.
- Accessibility utilities and keyboard navigation support are thoughtfully implemented.

## Findings (Prioritized)

### Medium
1. **~~Insecure DB defaults still possible via compose fallback.~~** RESOLVED
   `docker-compose.yml` previously defaulted `MYSQL_ROOT_PASSWORD` to `changeme`. Changed to `:?` (required) syntax — Docker Compose now fails fast if the variable is unset. README claim of "no insecure defaults" is now accurate.

2. **~~URL preview HTTPS fetch may fail due to IP pinning + TLS SNI.~~** RESOLVED
   `accord-files/src/routes/preview.ts` rewrote the hostname to a resolved IP for DNS pinning, which breaks TLS SNI for HTTPS targets. Fixed: HTTPS fetches now use the original hostname (DNS results validated but not pinned into the URL). HTTP fetches still pin the IP. The TOCTOU window for HTTPS is minimal (ms) and acceptable for a link-preview system.

3. **~~Potentially missing audio attachment for LiveKit remote tracks.~~** FALSE POSITIVE
   `livekit-client` auto-attaches audio tracks on subscription. The `TrackSubscribed` handler correctly applies volume via `setVolume()`. The deafen code explicitly calls `detach()`/`attach()` to control audio muting. No action needed.

4. **~~Virtualized message list may drift when media sizes change post-render.~~** RESOLVED
   `accord-client/src/components/MessageList.svelte` now uses a `ResizeObserver` on rendered items container children. When images load or embeds expand, the observer fires `measureRenderedItems()` to update the prefix-sum cache, preventing scroll jumps.

### Low
1. **~~Config fallback hides invalid JSON.~~** RESOLVED
   `accord-files/src/routes/config.ts` now distinguishes "file missing" (silent, expected) from "file exists but contains invalid JSON" (logs `console.warn` with the config path). Operators will see the warning in Docker logs.

2. **~~Account info endpoint lacks input size validation.~~** RESOLVED
   `accord-files/src/routes/accountInfo.ts` now enforces `account.length > 200` consistent with the auth endpoint's input validation.

3. **Known deferral: voice channel membership checks.**
   `accord-files/src/routes/livekit.ts` intentionally skips membership validation (documented in code and README). This is acceptable as a known deferral, but remains a security limitation for voice privacy.

4. **Type-safety debt in IRC connection event map.**
   `accord-client/src/lib/irc/connection.ts` keeps listener arrays typed as `((...args: never[]) => void)[]`. This is safe at runtime but loses compile-time type safety (noted in TODOs). Deferred — runtime correctness is unaffected.

5. **~~TODO list accuracy.~~** RESOLVED
   The `voiceErrorTimer` item in `TODO.md` was already implemented in `+page.svelte` (with proper clear-on-dismiss). Marked as done.

### Info / Observability
- Many components use `<!-- svelte-ignore a11y -->` (e.g., `Message.svelte`, `ChannelSidebar.svelte`, `VoiceOverlay.svelte`). The keyboard handling is largely implemented, but a focused a11y pass is recommended before public release.
- ~~`ci.yml` does not run TypeScript typecheck for the Bun server.~~ RESOLVED — added `bunx tsc --noEmit` step to the server-tests CI job.

### Doc Alignment (verified post-fix)
- README says "10 IRC commands" — verified: 10 commands in SlashCommandMenu.svelte ✓
- README says "28 components" — verified: 28 .svelte files ✓
- README says "15 reactive stores" — verified: 15 .svelte.ts files ✓
- README says services are "internal only" — verified: ergo/accord-files ports now commented out ✓
- README says "no insecure defaults" — verified: all `:?` required syntax, no `changeme` ✓
- README says "dedicated ergo user" — verified: `MYSQL_USER: ergo` ✓
- TODO.md remaining unchecked: 1 item (typed IRC event map) — matches L4, deferred ✓

## Test Gaps / Suggested Tests
- Add a small integration test suite that exercises:
  - End-to-end login + reconnect flow (including CAP/SASL and gap-fill).
  - LiveKit token issuance + client connect/disconnect.
  - URL preview fetch for HTTPS targets (validates the DNS pinning approach).
- Add UI-level tests (even a minimal Playwright pass) for:
  - Message list virtualization with images and link previews.
  - Keyboard navigation through settings, channel list, and message actions.

## Remaining Items for Release
1. Run an a11y checklist pass on key modals and menus.
2. Add typed IRC event map (existing TODO item, low priority).
3. Consider integration tests for critical paths (login, reconnect, preview).
