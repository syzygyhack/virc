import { Hono } from "hono";
import { randomUUID } from "crypto";
import { join, extname } from "path";
import { mkdir, stat } from "fs/promises";
import { authMiddleware } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../env.js";

const files = new Hono<AppEnv>();

/** Ensure the upload directory exists. */
async function ensureUploadDir(): Promise<string> {
  const dir = env.UPLOAD_DIR;
  await mkdir(dir, { recursive: true });
  return dir;
}

files.post("/api/upload", authMiddleware, async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "Content-Type must be multipart/form-data" }, 400);
  }

  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Missing file field" }, 400);
  }

  if (file.size > env.MAX_FILE_SIZE) {
    return c.json({ error: "File too large" }, 413);
  }

  const ext = extname(file.name) || "";
  const uuid = randomUUID();
  const storedName = `${uuid}${ext}`;

  const dir = await ensureUploadDir();
  const filePath = join(dir, storedName);

  const buffer = await file.arrayBuffer();
  await Bun.write(filePath, buffer);

  return c.json({
    url: `/api/files/${storedName}`,
    filename: file.name,
    size: file.size,
    mimetype: file.type || "application/octet-stream",
  });
});

files.get("/api/files/:filename", async (c) => {
  const filename = c.req.param("filename");

  // Prevent directory traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return c.json({ error: "Invalid filename" }, 400);
  }

  const dir = env.UPLOAD_DIR;
  const filePath = join(dir, filename);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return c.json({ error: "Not found" }, 404);
    }
  } catch {
    return c.json({ error: "Not found" }, 404);
  }

  const file = Bun.file(filePath);
  const ext = extname(filename).toLowerCase();
  const mimeType = getMimeType(ext) || file.type || "application/octet-stream";

  return new Response(file, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

/** Map common extensions to MIME types. */
function getMimeType(ext: string): string | null {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".json": "application/json",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".zip": "application/zip",
  };
  return map[ext] ?? null;
}

export { files };
