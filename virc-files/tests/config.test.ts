import { describe, test, expect } from "bun:test";
import { setupEnv, req } from "./helpers.js";

// Set env before any source imports
setupEnv();

import { config } from "../src/routes/config.js";

describe("GET /.well-known/virc.json", () => {
  test("returns 200 with valid JSON", async () => {
    const res = await config.fetch(req("/.well-known/virc.json"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  test("response has correct Content-Type", async () => {
    const res = await config.fetch(req("/.well-known/virc.json"));
    const ct = res.headers.get("Content-Type");
    expect(ct).toContain("application/json");
  });

  test("response includes version field", async () => {
    const res = await config.fetch(req("/.well-known/virc.json"));
    const body = await res.json() as Record<string, unknown>;
    expect(body.version).toBeDefined();
    expect(typeof body.version).toBe("number");
  });

  test("response includes name field", async () => {
    const res = await config.fetch(req("/.well-known/virc.json"));
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBeDefined();
    expect(typeof body.name).toBe("string");
  });

  test("response includes channels", async () => {
    const res = await config.fetch(req("/.well-known/virc.json"));
    const body = await res.json() as { channels?: { categories?: unknown[] } };
    expect(body.channels).toBeDefined();
    expect(body.channels!.categories).toBeArray();
  });

  test("response includes roles", async () => {
    const res = await config.fetch(req("/.well-known/virc.json"));
    const body = await res.json() as Record<string, unknown>;
    expect(body.roles).toBeDefined();
    expect(typeof body.roles).toBe("object");
  });
});
