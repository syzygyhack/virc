import { Hono } from "hono";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../env.js";
import type { AppEnv } from "../types.js";

// --- Types ---

interface Invite {
  token: string;
  server: string;
  channel: string;
  createdBy: string;
  expiresAt: number; // Unix ms, 0 = never
  maxUses: number; // 0 = unlimited
  useCount: number;
}

// --- Store ---

export class InviteStore {
  private invites: Invite[] = [];
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "invites.json");
  }

  /** Load invites from disk. Creates empty file if missing. */
  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      this.invites = JSON.parse(raw) as Invite[];
    } catch {
      this.invites = [];
    }
  }

  /** Persist invites to disk using atomic write (write tmp + rename). */
  async save(): Promise<void> {
    const dir = dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    await writeFile(tmp, JSON.stringify(this.invites, null, 2), "utf-8");
    await rename(tmp, this.filePath);
  }

  getAll(): Invite[] {
    return this.invites;
  }

  findByToken(token: string): Invite | undefined {
    return this.invites.find((i) => i.token === token);
  }

  add(invite: Invite): void {
    this.invites.push(invite);
  }

  remove(token: string): boolean {
    const idx = this.invites.findIndex((i) => i.token === token);
    if (idx === -1) return false;
    this.invites.splice(idx, 1);
    return true;
  }
}

// --- Helpers ---

/** Generate a 12-char alphanumeric token. */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(12);
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/** Parse duration string like "7d", "1h", "30m" to milliseconds. Returns 0 for "never". */
function parseDuration(duration: string): number {
  if (duration === "never" || duration === "0") return 0;

  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    default:
      return 0;
  }
}

/** Check if an invite is expired. */
function isExpired(invite: Invite): boolean {
  return invite.expiresAt !== 0 && Date.now() > invite.expiresAt;
}

/** Check if an invite has exceeded max uses. */
function isMaxUsesReached(invite: Invite): boolean {
  return invite.maxUses > 0 && invite.useCount >= invite.maxUses;
}

// --- Router factory ---

export function createInviteRouter(dataDir?: string) {
  const dir = dataDir ?? env.DATA_DIR;
  const store = new InviteStore(dir);
  const router = new Hono<AppEnv>();

  // Ensure store is loaded before handling requests
  let loaded = false;
  async function ensureLoaded() {
    if (!loaded) {
      await store.load();
      loaded = true;
    }
  }

  // POST /api/invite — create invite (auth required)
  router.post("/api/invite", authMiddleware, async (c) => {
    await ensureLoaded();

    const body = await c.req.json<{
      channel?: string;
      expiresIn?: string;
      maxUses?: number;
    }>();

    if (!body.channel) {
      return c.json({ error: "Missing required field: channel" }, 400);
    }

    const user = c.get("user");
    const token = generateToken();
    const expiresInStr = body.expiresIn ?? "7d";
    const durationMs = parseDuration(expiresInStr);
    const expiresAt = durationMs > 0 ? Date.now() + durationMs : 0;
    const maxUses = body.maxUses ?? 0;

    const invite: Invite = {
      token,
      server: user.srv,
      channel: body.channel,
      createdBy: user.sub,
      expiresAt,
      maxUses,
      useCount: 0,
    };

    store.add(invite);
    await store.save();

    return c.json(
      {
        token,
        url: `https://virc.app/join/${invite.server}/${token}`,
        channel: invite.channel,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
      },
      201,
    );
  });

  // GET /api/invite/:token — validate invite (no auth)
  router.get("/api/invite/:token", async (c) => {
    await ensureLoaded();

    const token = c.req.param("token");
    const invite = store.findByToken(token);

    if (!invite) {
      return c.json({ error: "Invite not found" }, 404);
    }

    if (isExpired(invite)) {
      return c.json({ error: "Invite has expired" }, 410);
    }

    if (isMaxUsesReached(invite)) {
      return c.json({ error: "Invite has reached maximum uses" }, 410);
    }

    // Increment use count
    invite.useCount++;
    await store.save();

    return c.json({
      channel: invite.channel,
      server: invite.server,
    });
  });

  // DELETE /api/invite/:token — revoke invite (auth required)
  router.delete("/api/invite/:token", authMiddleware, async (c) => {
    await ensureLoaded();

    const token = c.req.param("token");
    const removed = store.remove(token);

    if (!removed) {
      return c.json({ error: "Invite not found" }, 404);
    }

    await store.save();
    return c.json({ ok: true });
  });

  return { router, store };
}
