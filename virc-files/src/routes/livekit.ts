import { Hono } from "hono";
import { AccessToken } from "livekit-server-sdk";
import { authMiddleware } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../env.js";

const livekit = new Hono<AppEnv>();

livekit.post("/api/livekit/token", authMiddleware, async (c) => {
  const user = c.get("user");

  let body: { channel?: string; room?: string };
  try {
    body = await c.req.json<{ channel?: string; room?: string }>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Accept "channel" (client sends this) or "room" for backwards compat
  const room = body.channel ?? body.room;

  if (!room || typeof room !== "string") {
    return c.json({ error: "Missing channel" }, 400);
  }

  // Validate room name: channels start with #, DM rooms start with dm:
  // Reasonable length, no control chars
  const validRoom = (room.startsWith("#") || room.startsWith("dm:")) &&
    room.length > 1 && room.length <= 200 && !/[\x00-\x1f]/.test(room);
  if (!validRoom) {
    return c.json({ error: "Invalid room name" }, 400);
  }

  // For DM rooms (format: "dm:account1:account2"), verify the requesting user
  // is one of the two participants to prevent eavesdropping.
  if (room.startsWith("dm:")) {
    const parts = room.split(":");
    if (parts.length !== 3) {
      return c.json({ error: "Invalid DM room format" }, 400);
    }
    const [, account1, account2] = parts;
    const userAccount = user.sub.toLowerCase();
    if (account1.toLowerCase() !== userAccount && account2.toLowerCase() !== userAccount) {
      return c.json({ error: "Not a participant in this DM" }, 403);
    }
  }

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: user.sub,
    ttl: 3600, // 1 hour
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return c.json({ token, url: env.LIVEKIT_CLIENT_URL });
});

export { livekit };
