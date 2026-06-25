const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const portArg = process.argv.find(arg => /^--port=\d+$/.test(arg));
const PORT = Number(process.env.PORT || portArg?.split("=")[1] || 3000);
const TWITTER_BEARER_TOKEN = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || "";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "site.json");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const PRIVATE_DIR = path.join(ROOT, ".private");
const TWITTER_CONFIG_FILE = path.join(PRIVATE_DIR, "twitter.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4"
};

const defaultSite = {
  profile: {
    siteName: "乃希的个人网站",
    ownerName: "乃希",
    tagline: "把作品、日常、照片和一点点碎念整理在这里。",
    intro:
      "这里是一个可以长期更新的个人档案。你可以把它当作扩列介绍、作品目录、生活记录和社交入口。",
    location: "Online / Chengdu",
    status: "慢慢更新中",
    contactNote: "欢迎同好扩列，也欢迎来听歌、看照片、翻随笔。",
    heroImage: ""
  },
  sections: [
    {
      id: "intro",
      nav: "扩列介绍",
      kicker: "PROFILE",
      title: "扩列介绍",
      description: "喜好、雷点、近期状态和想认识怎样的人，都可以放在这里。",
      tags: ["个人档案", "兴趣", "同好"],
      items: [
        {
          title: "快速认识我",
          meta: "长期置顶",
          body:
            "可以写昵称、年龄段、常驻平台、兴趣坑、交流边界、喜欢的话题，以及希望别人怎么称呼你。",
          tags: ["置顶", "扩列"],
          url: "",
          images: []
        },
        {
          title: "最近在做的事",
          meta: "持续更新",
          body:
            "这里适合写近期沉迷的作品、正在推进的小项目、想看的电影、想补的游戏或想学的技能。",
          tags: ["近况"],
          url: "",
          images: []
        }
      ]
    },
    {
      id: "translation",
      nav: "乃希汉化",
      kicker: "LOCALIZATION",
      title: "乃希汉化",
      description: "汉化记录、发布说明、进度、参与名单和下载入口。",
      tags: ["汉化", "文本", "发布"],
      items: [
        {
          title: "汉化项目索引",
          meta: "Project Index",
          body:
            "把每个汉化项目做成独立条目：项目名、版本、进度、预览图、下载链接、更新日志都可以逐步补上。",
          tags: ["项目", "进度"],
          url: "",
          images: []
        }
      ]
    },
    {
      id: "coffee",
      nav: "咖啡日常",
      kicker: "COFFEE",
      title: "咖啡日常",
      description: "豆子、器具、冲煮参数、店铺记录和一些清醒时刻。",
      tags: ["咖啡", "日常", "记录"],
      items: [
        {
          title: "今日杯单",
          meta: "Coffee Log",
          body:
            "可以记录豆子产地、处理法、研磨刻度、水温、比例、风味和当天心情。",
          tags: ["手冲", "记录"],
          url: "",
          images: []
        }
      ]
    },
    {
      id: "music",
      nav: "音乐作品",
      kicker: "MUSIC",
      title: "音乐作品",
      description: "原创、翻唱、Demo、歌词、编曲片段和发布链接。",
      tags: ["音乐", "Demo", "歌词"],
      items: [
        {
          title: "Demo 收纳箱",
          meta: "Audio Sketch",
          body:
            "每首歌可以放封面、歌词片段、创作说明和外链。以后也可以接入音频文件直接播放。",
          tags: ["Demo"],
          url: "",
          images: []
        }
      ]
    },
    {
      id: "photo",
      nav: "摄影作品",
      kicker: "PHOTOGRAPHY",
      title: "摄影作品",
      description: "照片集、地点、器材、色彩和一些被保留下来的光。",
      tags: ["摄影", "照片", "图集"],
      items: [
        {
          title: "照片墙起点",
          meta: "Gallery",
          body:
            "上传照片后，这里会自动变成图集。每个条目可以是一组照片，也可以是一张单独的作品。",
          tags: ["图集"],
          url: "",
          images: []
        }
      ]
    },
    {
      id: "notes",
      nav: "小随笔",
      kicker: "NOTES",
      title: "小随笔",
      description: "不必很正式，像把纸条夹进一本常翻的书里。",
      tags: ["随笔", "文字", "生活"],
      items: [
        {
          title: "第一张纸条",
          meta: "Note",
          body:
            "这里适合放短文、观后感、梦境、碎碎念、年度总结，也可以写成很长的文章。",
          tags: ["随笔"],
          url: "",
          images: []
        }
      ]
    },
    {
      id: "social",
      nav: "社交平台",
      kicker: "SOCIAL",
      title: "社交平台",
      description: "所有能找到你的地方，以及不同平台适合聊什么。",
      tags: ["社交", "链接", "联系"],
      items: [
        {
          title: "社交入口",
          meta: "Links",
          body:
            "在后台把平台名、账号、链接和备注补齐。这里会和页面底部的社交平台一起展示。",
          tags: ["链接"],
          url: "",
          images: []
        }
      ]
    }
  ],
  socials: [
    {
      platform: "Bilibili",
      handle: "@Naixi",
      url: "https://www.bilibili.com",
      note: "视频、音乐和动态"
    },
    {
      platform: "NetEase Cloud Music",
      handle: "乃希",
      url: "https://music.163.com",
      note: "音乐作品与歌单"
    },
    {
      platform: "Email",
      handle: "hello@example.com",
      url: "mailto:hello@example.com",
      note: "正式联系"
    }
  ]
};

async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  await fsp.mkdir(PRIVATE_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    await fsp.writeFile(DATA_FILE, `${JSON.stringify(defaultSite, null, 2)}\n`, "utf8");
  }
}

async function readPrivateTwitterConfig() {
  try {
    return JSON.parse(await fsp.readFile(TWITTER_CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writePrivateTwitterConfig(config) {
  await fsp.mkdir(PRIVATE_DIR, { recursive: true });
  await fsp.writeFile(TWITTER_CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function getTwitterBearerToken() {
  if (TWITTER_BEARER_TOKEN) {
    return {
      token: TWITTER_BEARER_TOKEN,
      source: process.env.X_BEARER_TOKEN ? "X_BEARER_TOKEN" : "TWITTER_BEARER_TOKEN"
    };
  }

  const config = await readPrivateTwitterConfig();
  const token = String(config.bearerToken || "").trim();
  return {
    token,
    source: token ? "local-config" : ""
  };
}

async function getTwitterStatus() {
  const tokenState = await getTwitterBearerToken();
  return {
    configured: Boolean(tokenState.token),
    source: tokenState.source,
    tokenPreview: tokenState.token ? `${tokenState.token.slice(0, 6)}...${tokenState.token.slice(-4)}` : ""
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload, null, 2), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
}

function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("REQUEST_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sanitizeSite(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("INVALID_SITE");
  }

  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const socials = Array.isArray(raw.socials) ? raw.socials : [];

  return {
    profile: {
      siteName: String(profile.siteName || "个人网站").slice(0, 80),
      ownerName: String(profile.ownerName || "").slice(0, 80),
      tagline: String(profile.tagline || "").slice(0, 180),
      intro: String(profile.intro || "").slice(0, 1200),
      location: String(profile.location || "").slice(0, 80),
      status: String(profile.status || "").slice(0, 80),
      contactNote: String(profile.contactNote || "").slice(0, 240),
      heroImage: String(profile.heroImage || "").slice(0, 500)
    },
    integrations: sanitizeIntegrations(raw.integrations),
    sections: sections.map((section, index) => {
      const id = String(section.id || `section-${index + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);

      return {
        id: id || `section-${index + 1}`,
        nav: String(section.nav || section.title || "栏目").slice(0, 40),
        kicker: String(section.kicker || "").slice(0, 40),
        title: String(section.title || section.nav || "栏目").slice(0, 80),
        description: String(section.description || "").slice(0, 600),
        tags: sanitizeTags(section.tags),
        protection: sanitizeSectionProtection(section.protection),
        items: Array.isArray(section.items)
          ? section.items.map(item => ({
              title: String(item.title || "未命名").slice(0, 120),
              meta: String(item.meta || "").slice(0, 120),
              body: String(item.body || "").slice(0, 5000),
              tags: sanitizeTags(item.tags),
              url: String(item.url || "").slice(0, 600),
              images: Array.isArray(item.images)
                ? item.images.map(image => String(image || "").slice(0, 600)).filter(Boolean)
                : [],
              source: String(item.source || "").slice(0, 40),
              externalId: String(item.externalId || "").slice(0, 120),
              createdAt: String(item.createdAt || "").slice(0, 80)
            }))
          : []
      };
    }),
    socials: socials.map(social => ({
      platform: String(social.platform || "平台").slice(0, 80),
      handle: String(social.handle || "").slice(0, 120),
      url: String(social.url || "").slice(0, 600),
      note: String(social.note || "").slice(0, 240)
    }))
  };
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(tag => String(tag || "").trim().slice(0, 32)).filter(Boolean).slice(0, 12);
}

function sanitizeSectionProtection(protection) {
  if (!protection || typeof protection !== "object") return null;
  return {
    enabled: Boolean(protection.enabled),
    password: String(protection.password || "").slice(0, 64),
    hint: String(protection.hint || "").slice(0, 200)
  };
}

function sanitizeIntegrations(integrations = {}) {
  return {
    twitterCoffee: sanitizeTwitterCoffeeSettings(integrations.twitterCoffee)
  };
}

function sanitizeTwitterCoffeeSettings(settings = {}) {
  const username = String(settings.username || "").replace(/^@/, "").trim().slice(0, 40);
  const keyword = String(settings.keyword || "咖啡").trim().slice(0, 40) || "咖啡";
  const maxResults = Math.max(10, Math.min(100, Number(settings.maxResults || 10)));

  return {
    enabled: Boolean(settings.enabled),
    username,
    keyword,
    query: String(settings.query || "").trim().slice(0, 512),
    sectionId: String(settings.sectionId || "coffee").trim().slice(0, 48) || "coffee",
    maxResults,
    lastSyncedAt: String(settings.lastSyncedAt || "").slice(0, 80),
    lastError: String(settings.lastError || "").slice(0, 300)
  };
}

function getTweetMediaUrls(tweet, mediaByKey) {
  const keys = tweet.attachments?.media_keys || [];
  return keys
    .map(key => mediaByKey.get(key))
    .filter(Boolean)
    .map(media => media.url || media.preview_image_url)
    .filter(Boolean);
}

function formatTweetDate(value) {
  if (!value) return "X / Coffee";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "X / Coffee";
  return `X / ${date.toISOString().slice(0, 10)}`;
}

function buildTwitterQuery(settings) {
  if (settings.query) return settings.query;
  return `from:${settings.username} ${settings.keyword} -is:retweet`;
}

async function fetchTwitterCoffeePosts(settings) {
  const tokenState = await getTwitterBearerToken();
  if (!tokenState.token) {
    throw new Error(
      "缺少 X API Bearer Token。请在后台「咖啡推文同步」里粘贴 Bearer Token 并点击「保存 Token」，或在启动服务前设置 X_BEARER_TOKEN 环境变量。"
    );
  }

  if (!settings.username && !settings.query) {
    throw new Error("请先填写 X/Twitter 用户名，或填写高级搜索 query。");
  }

  const params = new URLSearchParams({
    query: buildTwitterQuery(settings),
    max_results: String(settings.maxResults),
    "tweet.fields": "created_at,attachments,entities",
    expansions: "attachments.media_keys",
    "media.fields": "url,preview_image_url,type,width,height,alt_text"
  });

  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: {
      Authorization: `Bearer ${tokenState.token}`
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || payload.title || payload.errors?.[0]?.detail || `HTTP ${response.status}`;
    throw new Error(`X API 请求失败：${detail}`);
  }

  const mediaByKey = new Map((payload.includes?.media || []).map(media => [media.media_key, media]));
  return (payload.data || []).map(tweet => ({
    title: formatTweetDate(tweet.created_at),
    meta: "X / Twitter",
    body: tweet.text || "",
    tags: ["Twitter", settings.keyword].filter(Boolean),
    url: `https://x.com/${settings.username || "i"}/status/${tweet.id}`,
    images: getTweetMediaUrls(tweet, mediaByKey),
    source: "twitter",
    externalId: tweet.id,
    createdAt: tweet.created_at || ""
  }));
}

async function syncTwitterCoffeeIntoSite(site) {
  const sanitized = sanitizeSite(site);
  const settings = sanitizeTwitterCoffeeSettings(sanitized.integrations?.twitterCoffee);
  const fetchedItems = await fetchTwitterCoffeePosts(settings);
  const sectionIndex = sanitized.sections.findIndex(section => section.id === settings.sectionId);

  if (sectionIndex === -1) {
    throw new Error(`没有找到目标栏目：${settings.sectionId}`);
  }

  const section = sanitized.sections[sectionIndex];
  const manualItems = (section.items || []).filter(item => item.source !== "twitter");
  const existingById = new Map((section.items || []).filter(item => item.source === "twitter").map(item => [item.externalId, item]));
  const twitterItems = fetchedItems.map(item => ({
    ...existingById.get(item.externalId),
    ...item
  }));

  sanitized.sections[sectionIndex] = {
    ...section,
    items: [...twitterItems, ...manualItems]
  };
  sanitized.integrations.twitterCoffee = {
    ...settings,
    lastSyncedAt: new Date().toISOString(),
    lastError: ""
  };

  return {
    site: sanitized,
    count: twitterItems.length
  };
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!boundaryMatch) throw new Error("NO_BOUNDARY");

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = [];
  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;

    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1) break;

    const headerText = buffer.slice(cursor, headerEnd).toString("utf8");
    const nextBoundary = buffer.indexOf(boundary, headerEnd + 4);
    if (nextBoundary === -1) break;

    let content = buffer.slice(headerEnd + 4, nextBoundary);
    if (content.length >= 2 && content[content.length - 2] === 13 && content[content.length - 1] === 10) {
      content = content.slice(0, -2);
    }

    const name = /name="([^"]+)"/i.exec(headerText)?.[1] || "";
    const filename = /filename="([^"]*)"/i.exec(headerText)?.[1] || "";
    const type = /content-type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() || "";
    parts.push({ name, filename, type, content });
    cursor = nextBoundary;
  }

  return parts;
}

function safeFilename(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"];
  const safeExt = allowed.includes(ext) ? ext : ".bin";
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`;
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";

  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error("NOT_FILE");

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const cacheControl = pathname.startsWith("/uploads/")
      ? "public, max-age=31536000, immutable"
      : "no-cache";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": cacheControl
    });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && requestUrl.pathname === "/api/site") {
    const site = JSON.parse(await fsp.readFile(DATA_FILE, "utf8"));
    sendJson(res, 200, site);
    return;
  }

  if ((req.method === "PUT" || req.method === "POST") && requestUrl.pathname === "/api/site") {
    try {
      const body = await readBody(req);
      const site = sanitizeSite(JSON.parse(body.toString("utf8")));
      await fsp.writeFile(DATA_FILE, `${JSON.stringify(site, null, 2)}\n`, "utf8");
      sendJson(res, 200, site);
    } catch (error) {
      sendJson(res, 400, { error: "保存失败，请检查内容格式。", detail: error.message });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/twitter/status") {
    const tokenState = await getTwitterBearerToken();
    const payload = {
      configured: Boolean(tokenState.token),
      source: tokenState.source || ""
    };

    sendJson(res, 200, payload);
    return;
  }

  if (req.method === "PUT" && requestUrl.pathname === "/api/twitter/token") {
    try {
      const body = await readBody(req, 1024 * 1024);
      const payload = JSON.parse(body.toString("utf8"));
      const bearerToken = String(payload.bearerToken || "").trim();

      if (!bearerToken) {
        sendJson(res, 400, { error: "Bearer Token 不能为空。" });
        return;
      }

      await writePrivateTwitterConfig({ bearerToken });
      sendJson(res, 200, {
        configured: true,
        source: "local-config",
        tokenPreview: `${bearerToken.slice(0, 6)}...${bearerToken.slice(-4)}`
      });
    } catch (error) {
      sendJson(res, 400, { error: "保存 Token 失败。", detail: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/twitter/coffee/sync") {
    try {
      const site = JSON.parse(await fsp.readFile(DATA_FILE, "utf8"));
      const result = await syncTwitterCoffeeIntoSite(site);
      await fsp.writeFile(DATA_FILE, `${JSON.stringify(result.site, null, 2)}\n`, "utf8");
      sendJson(res, 200, result);
    } catch (error) {
      try {
        const site = sanitizeSite(JSON.parse(await fsp.readFile(DATA_FILE, "utf8")));
        site.integrations.twitterCoffee.lastError = error.message;
        await fsp.writeFile(DATA_FILE, `${JSON.stringify(site, null, 2)}\n`, "utf8");
      } catch {
        // Keep the original error if recording sync status fails.
      }
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/upload") {
    try {
      const body = await readBody(req, 100 * 1024 * 1024);
      const parts = parseMultipart(body, req.headers["content-type"]);
      const file = parts.find(part => part.name === "file" && part.filename);

      if (!file) {
        sendJson(res, 400, { error: "没有找到图片文件。" });
        return;
      }

      if (!/^image\/(png|jpe?g|webp|gif|avif)$/i.test(file.type)) {
        sendJson(res, 400, { error: "只支持 png、jpg、webp 或 gif 图片。" });
        return;
      }

      const filename = safeFilename(file.filename);
      await fsp.writeFile(path.join(UPLOAD_DIR, filename), file.content);
      sendJson(res, 200, { url: `/uploads/${filename}` });
    } catch (error) {
      sendJson(res, 400, { error: "上传失败。", detail: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: "API not found" });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      handleApi(req, res).catch(error => {
        sendJson(res, 500, { error: "Server error", detail: error.message });
      });
      return;
    }

    serveStatic(req, res).catch(error => {
      send(res, 500, error.message, { "Content-Type": "text/plain; charset=utf-8" });
    });
  });
}

async function start(port = PORT) {
  await ensureStorage();

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
      const port = typeof address === "object" && address ? address.port : PORT;
      console.log(`Personal site running at http://localhost:${port}`);
      console.log(`Admin page: http://localhost:${port}/admin`);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  start,
  sanitizeSite,
  parseMultipart,
  syncTwitterCoffeeIntoSite
};
