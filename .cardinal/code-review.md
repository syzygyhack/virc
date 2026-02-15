# Code Review: virc (Tasks 002-019)

**Date:** 2026-02-15
**Scope:** All files modified or created in plan tasks 002-019, plus impacted existing code.
**Reviewed:** ~50 source files across virc-client and virc-files, ~20 test files.

Issues categorized by severity: **Critical**, **High**, **Medium**, **Low**.

---

## Critical

### CR-001: Stored XSS via SVG file serving
- **File:** `virc-files/src/routes/files.ts:93`
- **Category:** Security
- **Description:** SVG files are served with `Content-Type: image/svg+xml`. Browsers execute JavaScript embedded in SVGs (`<script>`, `onload=`, etc.) when served directly. Any authenticated user can upload an SVG containing arbitrary JS, then share the URL in chat to attack other users.
- **Fix:** Remove `.svg` from the MIME map, or force `Content-Disposition: attachment` for SVGs, or sanitize SVG content on upload. Consider serving all user uploads from a separate origin.

### CR-002: Test "loads persisted levels" is a false positive
- **File:** `virc-client/src/lib/state/notifications.svelte.test.ts:301-315`
- **Category:** Test quality
- **Description:** The test claims to verify localStorage loading but actually tests `resetNotificationLevels()` which clears both memory AND storage (notifications.svelte.ts:86-89). The assertion always passes regardless of whether loading works. This masks a potential bug in persistence loading.
- **Fix:** Pre-populate localStorage before module init or test that `setNotificationLevel` + module reload restores persisted values.

---

## High

### CR-003: No file type allowlisting on upload
- **File:** `virc-files/src/routes/files.ts:35-37`
- **Category:** Security
- **Description:** The upload endpoint accepts any file type. `.html` and `.js` files are served with their executable MIME types (`text/html` at line 102, `application/javascript` at line 104), enabling stored XSS beyond just SVGs.
- **Fix:** Add an allowlist of safe extensions (images, video, audio, PDF) or set `Content-Disposition: attachment` on all served files.

### CR-004: Missing `X-Content-Type-Options` header on served files
- **File:** `virc-files/src/routes/files.ts:77-82`
- **Category:** Security
- **Description:** No `X-Content-Type-Options: nosniff` header on download responses. Browsers may MIME-sniff uploaded content and execute it differently than intended.
- **Fix:** Add `"X-Content-Type-Options": "nosniff"` to download response headers.

### CR-005: SSRF bypass via DNS rebinding in preview endpoint
- **File:** `virc-files/src/routes/preview.ts:47-64, 67-84`
- **Category:** Security
- **Description:** `isPrivateHost()` checks the hostname string before DNS lookup, but DNS rebinding attacks (domain resolves to public IP at check time, then to `127.0.0.1` at fetch time) bypass this validation entirely.
- **Fix:** Resolve DNS before the fetch call and validate the resolved IP address, or use an SSRF-filtering library that hooks into the socket connection phase.

### CR-006: No authorization check on invite DELETE
- **File:** `virc-files/src/routes/invite.ts:207-219`
- **Category:** Security
- **Description:** Any authenticated user can revoke any invite by knowing the token. No check that the user is the invite creator (`createdBy`).
- **Fix:** Check `if (invite.createdBy !== user.sub) return c.json({ error: "Forbidden" }, 403);` before deletion.

### CR-007: IRC tag value injection in `privmsg` and `tagmsg`
- **File:** `virc-client/src/lib/irc/commands.ts:21, 32-35`
- **Category:** Security
- **Description:** Tag values (`editMsgid`, `tags` record entries) are interpolated into raw IRC lines without escaping. IRC tag values require escaping of `\`, `;`, ` `, `\r`, `\n` per IRCv3 message-tags spec. A malicious or buggy caller could inject extra tags or corrupt message framing.
- **Fix:** Escape tag values per IRCv3 message-tags escaping rules before interpolation.

### CR-008: `linkify` display URL not HTML-escaped
- **File:** `virc-client/src/lib/irc/format.ts:267-271`
- **Category:** Security
- **Description:** In `linkify()`, the `display` text (visible inside the `<a>` tag) uses the raw matched URL without escaping. The `href` is escaped via `escapeHTML(url)` but the display is `${display}` where `display = url`. Currently safe only because input is pre-escaped by `renderIRC()`, but any future pipeline reordering or independent use of `linkify` would create an XSS vector.
- **Fix:** Apply `escapeHTML(display)` for the link display text, matching the href treatment.

### CR-009: No CORS middleware despite `ALLOWED_ORIGIN` env var
- **File:** `virc-files/src/index.ts:14`
- **Category:** Security
- **Description:** `ALLOWED_ORIGIN` is defined in `env.ts:46` but no CORS middleware is applied. Any origin can make API requests. The env var is dead configuration.
- **Fix:** Add Hono's CORS middleware using the configured `ALLOWED_ORIGIN`.

### CR-010: Unhandled promise in Message.svelte fetchPreview
- **File:** `virc-client/src/components/Message.svelte:105-108`
- **Category:** Error handling
- **Description:** `fetchPreview(...).then(...)` has no `.catch()`. A network error leaves `previewLoading = true` permanently, showing an infinite skeleton loader to the user.
- **Fix:** Add `.catch(() => { linkPreview = null; previewLoading = false; })`.

### CR-011: No test for `renderMessage` XSS safety
- **File:** `virc-client/src/lib/irc/format.test.ts`
- **Category:** Test coverage
- **Description:** The full `renderMessage` pipeline (the only safe entry point for rendering user text to HTML) has no XSS safety tests. No test verifies that `<script>`, `<img onerror=...>`, or `javascript:` payloads are properly neutralized through the full chain.
- **Fix:** Add tests: `renderMessage('<script>alert(1)</script>', 'me')`, `renderMessage('<img onerror=alert(1) src=x>', 'me')`.

### CR-012: No tests for MARKREAD handler, DM routing, or self-PART
- **File:** `virc-client/src/lib/irc/handler.test.ts`
- **Category:** Test coverage
- **Description:** Three significant handler functions are completely untested: `handleMarkread` (handler.ts:665-678), DM routing in `handlePrivmsg` (PRIVMSG to own nick, handler.ts:301-302), and self-PART logic (channel removal + active channel switch, handler.ts:418-429).
- **Fix:** Add integration tests for each handler path.

### CR-013: `replaceOptimisticMessage` and `appendMessages` untested
- **File:** `virc-client/src/lib/state/messages.svelte.test.ts`
- **Category:** Test coverage
- **Description:** Both exported functions are completely untested. `replaceOptimisticMessage` (messages.svelte.ts:143-163) handles echo-message deduplication. `appendMessages` (messages.svelte.ts:269-281) handles gap-fill history loading.
- **Fix:** Add tests for both, including edge cases (no match, multiple pending messages, capacity overflow).

### CR-014: `getFrequentEmoji` and `recordEmojiUse` untested
- **File:** `virc-client/src/lib/emoji.test.ts`
- **Category:** Test coverage
- **Description:** Both exported functions (emoji.ts:295-313) with localStorage persistence and LRU behavior (dedup + cap at 16) are completely untested.
- **Fix:** Add tests for recording, ordering, cap at 16, localStorage roundtrip, and corrupted data handling.

---

## Medium

### CR-015: CSS injection via server theme values
- **File:** `virc-client/src/lib/state/theme.svelte.ts:124, 154-158`
- **Category:** Security
- **Description:** `parseServerTheme` sanitizes CSS values by blocking `url()`, `expression()`, and `;`, but allows `var()` and `calc()` CSS functions. A malicious server could provide values referencing other CSS variables or performing calculations.
- **Fix:** Add `var\s*\(` and `calc\s*\(` to the blocked patterns, or use a strict allowlist (hex colors only).

### CR-016: `escapeHTML` does not escape single quotes
- **File:** `virc-client/src/lib/irc/format.ts:40-46`
- **Category:** Security
- **Description:** Escapes `&`, `<`, `>`, `"` but not `'`. Currently safe because generated HTML uses double-quoted attributes, but fragile if attribute quoting changes.
- **Fix:** Add `.replace(/'/g, '&#39;')` for defense in depth.

### CR-017: SSRF bypass via IPv6-mapped IPv4 and alternate IP representations
- **File:** `virc-files/src/routes/preview.ts:47-63`
- **Category:** Security
- **Description:** `isPrivateHost()` does not handle `::ffff:127.0.0.1`, `::ffff:10.0.0.1`, octal IPs (`0177.0.0.1`), hex IPs (`0x7f000001`), or decimal integer IPs (`2130706433`).
- **Fix:** Parse and normalize IP addresses before checking against private ranges.

### CR-018: No rate limiting on any endpoint
- **File:** `virc-files/src/index.ts:11-22`
- **Category:** Security
- **Description:** No rate limiting at any level. Upload (disk I/O), preview (outbound HTTP fetch), and invite creation are all unbounded.
- **Fix:** Add rate-limiting middleware, with tighter limits on expensive routes.

### CR-019: Reconnect attempt has no timeout
- **File:** `virc-client/src/lib/irc/connection.ts:210-236`
- **Category:** Error handling
- **Description:** `attemptReconnect()` creates a WebSocket without a timeout (unlike `connect()` which has `CONNECT_TIMEOUT_MS`). A hanging WebSocket handshake blocks reconnection permanently.
- **Fix:** Add the same `CONNECT_TIMEOUT_MS` timeout logic to `attemptReconnect()`.

### CR-020: `send()` silently drops messages when disconnected
- **File:** `virc-client/src/lib/irc/connection.ts:104-107`
- **Category:** Error handling
- **Description:** Messages sent while the WebSocket is not open are silently discarded. Commands during brief reconnection windows are lost with no feedback.
- **Fix:** Return a boolean indicating success, or queue messages for retry after reconnect.

### CR-021: `appSettings` load does not validate field types
- **File:** `virc-client/src/lib/state/appSettings.svelte.ts:29-40`
- **Category:** Error handling
- **Description:** Parsed JSON is spread over defaults without type validation. Invalid localStorage values (e.g., `zoom: "hacked"`, `showRawIrc: 42`) propagate as-is and may cause runtime errors.
- **Fix:** Validate each field against its expected type/value set after parsing.

### CR-022: Invite token generation has modulo bias
- **File:** `virc-files/src/routes/invite.ts:73-81`
- **Category:** Security
- **Description:** `chars[bytes[i] % chars.length]` with `chars.length = 62`. Since 256 % 62 = 8, the first 8 characters have ~20% higher probability than the rest. Over 12 characters, this reduces effective entropy.
- **Fix:** Use rejection sampling: discard byte values >= 248 (the largest multiple of 62 under 256).

### CR-023: Race conditions in InviteStore
- **File:** `virc-files/src/routes/invite.ts:123-129, 162-163`
- **Category:** Error handling
- **Description:** Concurrent requests cause TOCTOU races in both `ensureLoaded()` (double load overwrites in-flight additions) and concurrent `add()+save()` (second save may clobber first). JSON file storage has no locking.
- **Fix:** Serialize operations through a promise-based mutex, or migrate to SQLite.

### CR-024: Invite GET increments use count for any request
- **File:** `virc-files/src/routes/invite.ts:177-203`
- **Category:** Code smell
- **Description:** Every GET to `/api/invite/:token` increments `useCount`, including bots, prefetches, and curl requests. A `maxUses=1` invite can be consumed by a single `curl` without anyone joining.
- **Fix:** Separate viewing from consuming: GET returns metadata without incrementing, POST `/accept` (authenticated) consumes the invite.

### CR-025: Missing input validation on invite channel field
- **File:** `virc-files/src/routes/invite.ts:141`
- **Category:** Error handling
- **Description:** `channel` is only checked for existence. No format, length, or character validation. An attacker could submit a megabyte-long string or special characters.
- **Fix:** Validate channel format (starts with `#`, max 200 chars, safe characters). Validate `maxUses` is a non-negative integer.

### CR-026: `c.req.json()` not wrapped in try/catch
- **File:** `virc-files/src/routes/invite.ts:135`
- **Category:** Error handling
- **Description:** Invalid JSON body causes an unhandled throw, resulting in a 500 instead of a 400 response.
- **Fix:** Wrap in try/catch: return `c.json({ error: "Invalid JSON body" }, 400)`.

### CR-027: No global error handler in virc-files
- **File:** `virc-files/src/index.ts`
- **Category:** Error handling
- **Description:** No `app.onError()` handler. Unhandled errors may surface raw stack traces to clients, leaking internal details.
- **Fix:** Add `app.onError((err, c) => { console.error(err); return c.json({ error: "Internal server error" }, 500); });`.

### CR-028: Incomplete path traversal check in file download
- **File:** `virc-files/src/routes/files.ts:57`
- **Category:** Security
- **Description:** Checks `..`, `/`, `\` in filename but doesn't handle null bytes or validate the resolved path stays within the upload directory.
- **Fix:** After `join()`, validate: `const resolved = path.resolve(dir, filename); if (!resolved.startsWith(path.resolve(dir))) return 400;`.

### CR-029: Upload reads entire file into memory
- **File:** `virc-files/src/routes/files.ts:42`
- **Category:** Performance
- **Description:** `await file.arrayBuffer()` buffers up to 25MB per upload. 100 concurrent uploads = 2.5GB memory.
- **Fix:** Use streaming writes: `Bun.write(filePath, file.stream())`.

### CR-030: File download requires no authentication
- **File:** `virc-files/src/routes/files.ts:53`
- **Category:** Security
- **Description:** `GET /api/files/:filename` has no `authMiddleware`. Anyone who knows the UUID filename (shared in chat) can access files without authentication.
- **Fix:** Either add `authMiddleware` or document this as a deliberate design choice with a code comment.

### CR-031: `editMap` grows without bound
- **File:** `virc-client/src/lib/state/messages.svelte.ts:48`
- **Category:** Performance
- **Description:** The edit chain map (`original msgid -> latest edit msgid`) is never pruned. `clearChannel` does not remove entries for the cleared channel. Over a long session with many edits, this map grows indefinitely.
- **Fix:** Clean up edit map entries in `clearChannel`, or cap map size.

### CR-032: `getMessage` O(n) linear scan on hot paths
- **File:** `virc-client/src/lib/state/messages.svelte.ts:166-170`
- **Category:** Performance
- **Description:** `Array.find()` for msgid lookup is O(n). Called from reaction toggles, redactions, and text updates. With 500 messages per channel, this adds up on hot paths.
- **Fix:** Maintain a parallel `Map<string, Message>` index per channel for O(1) lookups.

### CR-033: Preview cache has no TTL
- **File:** `virc-client/src/lib/files/preview.ts:19`
- **Category:** Performance
- **Description:** Cached link previews never expire; only evicted by LRU at 50 entries. Stale metadata is served indefinitely.
- **Fix:** Add a 30-minute TTL to cache entries and check on retrieval.

### CR-034: Concurrent duplicate preview requests
- **File:** `virc-client/src/lib/files/preview.ts:40-79`
- **Category:** Performance
- **Description:** Multiple calls to `fetchPreview` for the same URL before the first completes fire multiple network requests. Cache only stores completed entries, not in-flight requests.
- **Fix:** Store the pending Promise in the cache and deduplicate in-flight requests.

### CR-035: No conflict detection for custom keybindings
- **File:** `virc-client/src/lib/keybindings.ts:182-189`
- **Category:** Error handling
- **Description:** `setCustomBinding` does not check for conflicts. A user can assign the same combo to two actions; only the first-registered one fires.
- **Fix:** Detect conflicts and warn the user or reject duplicates.

### CR-036: DM mention detection uses substring match
- **File:** `virc-client/src/lib/irc/handler.ts:342`
- **Category:** Code smell
- **Description:** `msg.text.includes(\`@${myAccount}\`)` is a substring match. Messages like `"email foo@myaccount.com"` trigger false mentions.
- **Fix:** Use a word-boundary check: `new RegExp('\\b@' + escapeRegex(myAccount) + '\\b', 'i')`.

### CR-037: Missing batch target validation
- **File:** `virc-client/src/lib/irc/handler.ts:624-657`
- **Category:** Error handling
- **Description:** `finalizeBatch` uses `batch.messages[0].target` without verifying all messages share the same target. A malformed batch from a malicious server could mix targets.
- **Fix:** Either validate all messages share the same target, or group by target before processing.

### CR-038: Module-level mutable singletons in handler
- **File:** `virc-client/src/lib/irc/handler.ts:74, 803-804`
- **Category:** Code smell
- **Description:** `activeBatches`, `typingTimers`, `activeHandler`, `activeConn` are module-level mutable state. Makes the code untestable in isolation and prevents multiple connections.
- **Fix:** Encapsulate handler state in a class or factory function tied to a specific connection instance.

### CR-039: `ERGO_API_TOKEN` defaults to empty string
- **File:** `virc-files/src/env.ts:18`
- **Category:** Security
- **Description:** A critical API credential defaults silently to empty, allowing unauthenticated Ergo API requests if the env var is omitted.
- **Fix:** Either make it required or log a warning at startup.

### CR-040: Massive template duplication in Message.svelte
- **File:** `virc-client/src/components/Message.svelte:206-611`
- **Category:** Code smell
- **Description:** Compact mode (lines 206-379) and non-compact mode (lines 380-611) duplicate media previews, link previews, reactions, and toolbar blocks almost identically (~400 lines of duplication).
- **Fix:** Extract shared blocks into Svelte snippets or child components.

### CR-041: No file size limit check before upload on client
- **File:** `virc-client/src/lib/files/upload.ts:24-54`
- **Category:** Error handling
- **Description:** `uploadFile` does not check file size before uploading. Users discover the server limit only after a potentially long upload attempt.
- **Fix:** Add a `maxSize` parameter and check `file.size` before creating FormData.

### CR-042: Search runs synchronously on every keystroke
- **File:** `virc-client/src/components/SearchPanel.svelte:19-25`
- **Category:** Performance
- **Description:** Search runs via `$derived` on every keystroke with no debounce. Large message histories could block the main thread.
- **Fix:** Debounce the search query with 200-300ms delay.

### CR-043: Notification test for `setLastReadMsgid` is misleading
- **File:** `virc-client/src/lib/state/notifications.svelte.test.ts:131-138`
- **Category:** Test quality
- **Description:** Test says "sets lastReadMsgid without resetting counts" but uses `markRead` which does reset counts. The actual function `setLastReadMsgid` is never tested directly.
- **Fix:** Import and test `setLastReadMsgid` directly.

### CR-044: Missing tests for `installGlobalHandler` and keybinding persistence roundtrip
- **File:** `virc-client/src/lib/keybindings.test.ts`
- **Category:** Test coverage
- **Description:** `installGlobalHandler` (the entry point for global keyboard handling) is untested. Custom binding localStorage persistence is verified on write but never tested on reload.
- **Fix:** Add tests for both.

### CR-045: Pinned messages tests don't verify localStorage persistence
- **File:** `virc-client/src/lib/state/messages.svelte.test.ts:377-429`
- **Category:** Test coverage
- **Description:** `pinMessage`/`unpinMessage` call `savePinnedMessages()` but no test verifies actual localStorage writes or reload behavior.
- **Fix:** Add localStorage mock and verify persistence roundtrip.

### CR-046: Missing SSRF test cases
- **File:** `virc-files/tests/preview.test.ts`
- **Category:** Test coverage
- **Description:** No tests for DNS rebinding, IPv6-mapped IPv4, redirect to private IP, or response size limit enforcement.
- **Fix:** Add targeted tests for each SSRF bypass vector.

### CR-047: Missing authorization test on invite DELETE
- **File:** `virc-files/tests/invite.test.ts:235-258`
- **Category:** Test coverage
- **Description:** No test verifying that user A cannot delete user B's invite. All tests use the same "admin" user for both creation and deletion.
- **Fix:** Add test with a different user attempting deletion.

### CR-048: Missing tests for dangerous file type uploads
- **File:** `virc-files/tests/files.test.ts:58-131`
- **Category:** Test coverage
- **Description:** No tests for `.html`, `.svg`, or `.exe` uploads to verify security controls or document their absence.
- **Fix:** Add tests for each dangerous file type.

---

## Low

### CR-049: Duplicated ROLE_MAP constant with inconsistent values
- **File:** `virc-client/src/components/MemberList.svelte:11-17`, `UserProfilePopout.svelte:10-16`
- **Category:** Code smell
- **Description:** `ROLE_MAP` is defined in both files with inconsistent values: `'+'` mode has `color: null` in MemberList but `color: '#a0a0a0'` in UserProfilePopout.
- **Fix:** Extract to `$lib/roles.ts` as a single source of truth.

### CR-050: Inconsistent event prop naming across components
- **File:** Multiple components
- **Category:** Code smell
- **Description:** `HeaderBar.svelte` uses camelCase (`onToggleMembers`, `onTopicEdit`), while `Message.svelte` uses lowercase (`onreply`, `onreact`). Svelte 5 convention is lowercase.
- **Fix:** Standardize on one convention across all components.

### CR-051: Accessibility gaps across components
- **Files:** Multiple components
- **Category:** Accessibility
- **Description:**
  - `Message.svelte:242,417` — More menu has no keyboard dismiss or `role="menu"`
  - `EmojiPicker.svelte:68-75` — No focus trapping in dialog
  - `SearchPanel.svelte:89` — No `role="search"` or `aria-label`
  - `RawIrcPanel.svelte:27-39` — No `role="log"` or `aria-label`
  - `ServerList.svelte:90` — `aria-current` should be `'page'` not `'true'`
  - `MemberList.svelte:253` — Context menu not keyboard-accessible
  - `HeaderBar.svelte:236` — Pinned messages dropdown mouse-only
  - `Message.svelte:614` — Lightbox dialog doesn't trap focus
  - `UserProfilePopout.svelte:132-137` — Popout dialog has no focus management
  - `UserSettings.svelte:413` — Settings modal doesn't focus on mount
- **Fix:** Add ARIA roles, keyboard handlers, and focus management to each.

### CR-052: Media extension regex not anchored to end of path
- **File:** `virc-client/src/lib/media.ts:14-16`
- **Category:** Code smell
- **Description:** `/\.(jpe?g|png|gif|webp)/i` matches mid-path (e.g., `foo.png.evil` would match).
- **Fix:** Anchor to end: `/\.(jpe?g|png|gif|webp)$/i`.

### CR-053: Duplicate URL regex across modules
- **File:** `virc-client/src/lib/media.ts:41`, `preview.ts:106`, `format.ts:265`
- **Category:** Code smell
- **Description:** URL extraction regex `/(https?:\/\/[^\s<>"]+)/g` is duplicated identically in three files.
- **Fix:** Extract to a shared utility module.

### CR-054: `nickColor` hash edge case
- **File:** `virc-client/src/lib/irc/format.ts:309-311`
- **Category:** Code smell
- **Description:** `Math.abs(-2147483648)` returns `-2147483648` in JS due to 32-bit overflow. Could produce a negative hue value (extremely unlikely in practice).
- **Fix:** Use `(hash >>> 0) % 360` instead of `Math.abs(hash) % 360`.

### CR-055: `_now` parameter unused in `filterSystemMessage`
- **File:** `virc-client/src/lib/systemMessages.ts:46`
- **Category:** Dead code
- **Description:** Parameter marked as reserved for future TTL logic but never used. Adds to API surface.
- **Fix:** Remove until needed.

### CR-056: Raw IRC log may contain sensitive data
- **File:** `virc-client/src/lib/state/rawIrcLog.svelte.ts:24-28`
- **Category:** Security
- **Description:** Stores all IRC lines including AUTHENTICATE and PASS commands. If the debug panel is visible and someone takes a screenshot, credentials could be exposed.
- **Fix:** Filter/redact sensitive commands (AUTHENTICATE, PASS) before logging.

### CR-057: Emoji data bundled inline (~220 lines)
- **File:** `virc-client/src/lib/emoji.ts:49-270`
- **Category:** Performance
- **Description:** Static emoji data loaded eagerly on import even if the emoji picker is never opened.
- **Fix:** Consider lazy-loading from a separate JSON file.

### CR-058: `handleScroll` not throttled in MessageList
- **File:** `virc-client/src/components/MessageList.svelte:227-238`
- **Category:** Performance
- **Description:** Scroll handler fires at 60fps+ without throttling. History-loading check runs on every scroll frame.
- **Fix:** Throttle with `requestAnimationFrame` guard.

### CR-059: EmojiPicker renders all emoji at once
- **File:** `virc-client/src/components/EmojiPicker.svelte:154-169`
- **Category:** Performance
- **Description:** All emoji categories (1,800+ standard Unicode emoji) rendered simultaneously. No virtualization or lazy rendering.
- **Fix:** Implement virtual scrolling or lazy rendering with `IntersectionObserver`.

### CR-060: `prependMessages` and `appendMessages` create full array copies
- **File:** `virc-client/src/lib/state/messages.svelte.ts:254, 272`
- **Category:** Performance
- **Description:** `[...msgs, ...existing]` creates a full buffer copy on every history load (500+ element array).
- **Fix:** Use in-place mutation with `unshift`/`push` then trim.

### CR-061: `parseDuration` silently returns 0 for invalid input
- **File:** `virc-files/src/routes/invite.ts:84-103`
- **Category:** Error handling
- **Description:** `expiresIn: "invalid"` becomes 0 (never expires) instead of an error. A typo creates a permanent invite.
- **Fix:** Return null for invalid formats; return 400 to client.

### CR-062: `saveNotificationLevels` missing try/catch
- **File:** `virc-client/src/lib/state/notifications.svelte.ts:48-59`
- **Category:** Error handling
- **Description:** `localStorage.setItem` can throw if storage is full. Other persist functions in the codebase wrap in try/catch.
- **Fix:** Add try/catch for consistency.

### CR-063: `topic()` manually constructs IRC line
- **File:** `virc-client/src/lib/irc/commands.ts:105`
- **Category:** Code smell
- **Description:** Works around a `formatMessage` bug with empty trailing params. All other command functions use `formatMessage`.
- **Fix:** Fix `formatMessage` to handle empty trailing params, then use it consistently.

### CR-064: +page.svelte has duplicate step number in comments
- **File:** `virc-client/src/routes/chat/+page.svelte:713, 720`
- **Category:** Code smell
- **Description:** Comment numbering in `initConnection()` has two steps labeled "10".
- **Fix:** Renumber to 10 and 11.

### CR-065: `UserProfilePopout` position not reactive to window resize
- **File:** `virc-client/src/components/UserProfilePopout.svelte:86-98`
- **Category:** UI/UX
- **Description:** Position references `window.innerWidth/Height` once at compute time. Resizing while popout is open can overflow viewport.
- **Fix:** Add resize handler or `ResizeObserver`.

### CR-066: Hardcoded version "0.1.0" in About tab
- **File:** `virc-client/src/components/UserSettings.svelte:777`
- **Category:** Code smell
- **Description:** Version string not pulled from `package.json` or build-time constant; will drift.
- **Fix:** Use a build-time import or environment variable.

### CR-067: `processKeydown` treats `undefined` return as "consumed"
- **File:** `virc-client/src/lib/keybindings.ts:107`
- **Category:** Code smell
- **Description:** `if (result !== false)` means handlers that forget to return a value still prevent default browser behavior.
- **Fix:** Change to `if (result === true)` for opt-in consumption, or document current behavior.

### CR-068: Various minor test coverage gaps
- **Files:** Multiple test files
- **Category:** Test coverage
- **Description:**
  - `commands.test.ts` — No test for `join([])`, `tagmsg({})`, `monitor(conn, '+', [])`
  - `handler.test.ts` — No test for echo-message dedup, batch append logic, MODE param parsing, unread count increment
  - `format.test.ts` — No test for `javascript:` URLs, color index out of range, nested markdown edge cases
  - `systemMessages.test.ts` — No test for `summarizeCollapsedGroup([])` (produces `"0  events"`)
  - `appSettings.svelte.test.ts` — No test for corrupted localStorage, invalid zoom values
  - `preview.test.ts` — No test for cache eviction, `getCachedPreview` cache hit
  - `keybindings.test.ts` — No test for corrupted localStorage data
  - `files.test.ts` — No test for null bytes in filenames
  - `invite.test.ts` — No test for invalid JSON body, channel length validation
- **Fix:** Add edge case tests for each.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 12 |
| Medium | 34 |
| Low | 20 |
| **Total** | **68** |

### Top 5 Priorities

1. **Fix stored XSS via file serving** (CR-001, CR-003, CR-004) — Add `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` to all file downloads, or allowlist safe MIME types only.
2. **Strengthen SSRF protections** (CR-005, CR-017) — Resolve DNS before fetch, validate resolved IPs, handle IPv6-mapped addresses.
3. **Add authorization to invite DELETE** (CR-006) — Check `createdBy` before allowing deletion.
4. **Fix IRC tag injection** (CR-007) — Escape tag values per IRCv3 message-tags spec.
5. **Add XSS safety tests for renderMessage pipeline** (CR-011) — Verify the rendering pipeline neutralizes known attack payloads.
