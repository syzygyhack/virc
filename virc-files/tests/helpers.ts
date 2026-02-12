import { SignJWT } from "jose";

export const TEST_JWT_SECRET = "test-secret-for-virc-files-tests";
export const TEST_LIVEKIT_API_KEY = "test-lk-api-key";
export const TEST_LIVEKIT_API_SECRET = "test-lk-api-secret-must-be-256-bits!!";
export const TEST_ERGO_API = "http://ergo-test:8089";

/** Set required env vars before source modules are imported. */
export function setupEnv() {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.LIVEKIT_API_KEY = TEST_LIVEKIT_API_KEY;
  process.env.LIVEKIT_API_SECRET = TEST_LIVEKIT_API_SECRET;
  process.env.ERGO_API = TEST_ERGO_API;
  process.env.PORT = "0"; // won't bind
}

const secret = new TextEncoder().encode(TEST_JWT_SECRET);

/** Create a valid JWT matching the shape produced by the auth endpoint. */
export async function createTestJwt(
  sub = "testuser",
  opts?: { expired?: boolean },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = opts?.expired ? now - 3600 : now + 3600;

  return new SignJWT({
    sub,
    iss: "virc-files",
    iat: now,
    exp,
    srv: "virc.local",
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

/** Build a Request for testing Hono apps. */
export function req(
  path: string,
  init?: RequestInit,
): Request {
  return new Request(`http://localhost${path}`, init);
}
