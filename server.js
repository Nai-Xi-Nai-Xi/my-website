const http = require("http");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");

const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
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
        const data = await redis.get("site_data");

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        return res.end(
          JSON.stringify(data || { message: "暂无数据" })
        );
      } catch (error) {
        res.statusCode = 500;
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
          await redis.set("site_data", JSON.parse(body));

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");

          return res.end(
            JSON.stringify({ success: true })
          );
        } catch (error) {
          res.statusCode = 500;
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