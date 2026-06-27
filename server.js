const http = require("http");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const { Redis } = require("@upstash/redis");
    redis = Redis.fromEnv();
    console.log("Redis connected.");
  } catch (_) {
    console.warn("Redis init failed, using local data/site.json as fallback.");
  }
} else {
  console.log("Redis env vars not set, using local data/site.json as fallback.");
}

const PORT = process.env.PORT || 3001;
const ROOT = process.cwd();
const LOCAL_DATA_PATH = path.join(ROOT, "data", "site.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(ROOT, "uploads");

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json"
};

function send(res, status, text, headers = {}) {
  res.writeHead(status, headers);
  res.end(text);
}

async function serveStatic(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";

  const rootCandidate = path.join(ROOT, pathname.replace(/^\//, ""));
  const publicCandidate = path.join(PUBLIC_DIR, pathname.replace(/^\//, ""));
  const uploadCandidate = pathname.startsWith("/uploads/")
    ? path.join(UPLOAD_DIR, pathname.slice("/uploads/".length))
    : null;

  const candidates = [
    rootCandidate,
    publicCandidate,
    ...(uploadCandidate ? [uploadCandidate] : [])
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fsp.stat(candidate);
      if (!stat.isFile()) continue;

      const ext = path.extname(candidate).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const cacheControl = pathname.startsWith("/uploads/")
        ? "public, max-age=31536000, immutable"
        : "no-cache";

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": cacheControl
      });

      fs.createReadStream(candidate).pipe(res);
      return;
    } catch {
      // continue
    }
  }

  send(res, 404, "Not found", {
    "Content-Type": "text/plain; charset=utf-8"
  });
}

async function handleRequest(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  const pathname = decodeURIComponent(requestUrl.pathname);

  // API 路由
  if (pathname === "/api/site") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      return res.end();
    }

    if (req.method === "GET") {
      try {
        let data = null;
        if (redis) {
          data = await redis.get("site_data");
        }
        if (!data) {
          data = JSON.parse(await fsp.readFile(LOCAL_DATA_PATH, "utf-8"));
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(
          JSON.stringify(data)
        );
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(
          JSON.stringify({ error: error.message })
        );
      }
    }

    if (req.method === "POST") {
      let body = "";

      req.on("data", chunk => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body);
          if (redis) {
            await redis.set("site_data", parsed);
          }
          // Always persist to local file as backup
          await fsp.writeFile(LOCAL_DATA_PATH, JSON.stringify(parsed, null, 2), "utf-8");

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");

          return res.end(
            JSON.stringify({ success: true })
          );
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(
            JSON.stringify({ error: error.message })
          );
        }
      });

      return;
    }

    return send(
      res,
      405,
      JSON.stringify({ error: "Method not allowed" }),
      { "Content-Type": "application/json" }
    );
  }

  // 图片上传
  if (pathname === "/api/upload" && req.method === "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      return res.end();
    }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return send(res, 400, JSON.stringify({ error: "需要 multipart/form-data" }), { "Content-Type": "application/json; charset=utf-8" });
    }

    const boundary = "--" + contentType.split("boundary=")[1];
    const chunks = [];

    req.on("data", c => chunks.push(c));
    req.on("end", async () => {
      try {
        const buf = Buffer.concat(chunks);
        const str = buf.toString("binary");
        const parts = str.split(boundary);

        for (const part of parts) {
          if (!part.includes("filename=")) continue;

          const filenameMatch = part.match(/filename="(.+?)"/);
          if (!filenameMatch) continue;
          const originalName = filenameMatch[1];

          const headerEnd = part.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;

          const fileData = buf.slice(
            buf.toString("binary").indexOf(part) + headerEnd + 4,
            buf.toString("binary").indexOf(part) + part.length - 2
          );

          const ext = path.extname(originalName).toLowerCase();
          const safeExt = [".jpg",".jpeg",".png",".gif",".webp",".svg",".bmp"].includes(ext) ? ext : ".jpg";
          const filename = Date.now() + "-" + Math.random().toString(36).slice(2, 10) + safeExt;

          await fsp.mkdir(UPLOAD_DIR, { recursive: true });
          await fsp.writeFile(path.join(UPLOAD_DIR, filename), fileData);

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(JSON.stringify({ success: true, path: "/uploads/" + filename }));
        }

        return send(res, 400, JSON.stringify({ error: "没有找到文件" }), { "Content-Type": "application/json; charset=utf-8" });
      } catch (err) {
        return send(res, 500, JSON.stringify({ error: err.message }), { "Content-Type": "application/json; charset=utf-8" });
      }
    });
    return;
  }

  // 其他 API 统一返回 404
  if (pathname.startsWith("/api/")) {
    return send(
      res,
      404,
      JSON.stringify({ error: "API not found" }),
      { "Content-Type": "application/json" }
    );
  }

  // 静态资源
  await serveStatic(req, res);
}

function createServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res).catch(error => {
      send(res, 500, error.message, {
        "Content-Type": "text/plain; charset=utf-8"
      });
    });
  });
}

async function start(port = PORT) {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}

if (require.main === module) {
  start()
    .then(server => {
      const address = server.address();
      const port =
        typeof address === "object" && address
          ? address.port
          : PORT;

      console.log(`Personal site running at http://localhost:${port}`);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

async function handler(req, res) {
  await handleRequest(req, res);
}

module.exports = handler;
module.exports.start = start;
module.exports.createServer = createServer;