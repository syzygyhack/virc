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

  // Validate room name: must start with #, reasonable length, no control chars
  if (!room.startsWith("#") || room.length > 200 || /[\s\x00-\x1f]/.test(room)) {
    return c.json({ error: "Invalid channel name" }, 400);
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
