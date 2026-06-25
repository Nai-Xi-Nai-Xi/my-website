const state = {
  site: null,
  saving: false,
  twitterStatus: { configured: false, source: "", tokenPreview: "" }
};

const $ = selector => document.querySelector(selector);

const elements = {
  save: $("[data-save]"),
  status: $("[data-status]"),
  profileForm: $("[data-profile-form]"),
  sectionEditor: $("[data-section-editor]"),
  integrationEditor: $("[data-integration-editor]"),
  socialEditor: $("[data-social-editor]"),
  addSocial: $("[data-add-social]")
};

const profileFields = [
  ["siteName", "网站标题", "input"],
  ["ownerName", "显示昵称", "input"],
  ["tagline", "主页短句", "input"],
  ["intro", "主页介绍", "textarea"],
  ["location", "位置", "input"],
  ["status", "状态", "input"],
  ["contactNote", "索引旁说明", "textarea"],
  ["heroImage", "主页图片地址", "input"]
];

async function loadSite() {
  const response = await fetch("/api/site", { cache: "no-store" });
  state.site = await response.json();
  ensureSiteShape();
  await loadTwitterStatus();
  render();
  setStatus("内容已读取。");
}

async function loadTwitterStatus() {
  try {
    const response = await fetch("/api/twitter/status", { cache: "no-store" });
    if (response.ok) {
      state.twitterStatus = await response.json();
    }
  } catch {
    state.twitterStatus = { configured: false, source: "", tokenPreview: "" };
  }
}

function ensureSiteShape() {
  state.site.profile ||= {};
  state.site.sections ||= [];
  state.site.socials ||= [];
  state.site.integrations ||= {};
  state.site.integrations.twitterCoffee = {
    enabled: false,
    username: "",
    keyword: "咖啡",
    query: "",
    sectionId: "coffee",
    maxResults: 10,
    lastSyncedAt: "",
    lastError: "",
    ...(state.site.integrations.twitterCoffee || {})
  };
}

function render() {
  ensureSiteShape();
  renderProfile();
  renderSections();
  renderIntegrations();
  renderSocials();
}

function renderProfile() {
  elements.profileForm.innerHTML = profileFields
    .map(([key, label, type]) => fieldTemplate(`profile.${key}`, label, state.site.profile[key] || "", type))
    .join("");

  const heroImageInput = document.querySelector('[data-path="profile.heroImage"]');
  if (heroImageInput) {
    const uploadLabel = document.createElement("label");
    uploadLabel.className = "upload-field";
    uploadLabel.style.marginTop = "8px";
    uploadLabel.innerHTML = `
      <span>上传首页图片</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" data-upload-hero-image>
    `;
    heroImageInput.closest(".field").append(uploadLabel);
  }
}

function renderSections() {
  elements.sectionEditor.innerHTML = state.site.sections
    .map(
      (section, sectionIndex) => `
        <article class="editor-card" data-section-card="${sectionIndex}">
          <div class="editor-card-head">
            <div>
              <small>/${String(sectionIndex).padStart(2, "0")} ${escapeHtml(section.kicker || "")}</small>
              <h3>${escapeHtml(section.title || section.nav || "栏目")}</h3>
            </div>
            <div class="compact-actions">
              <button class="tiny-button" type="button" data-add-item="${sectionIndex}">添加条目</button>
              <button class="tiny-button danger" type="button" data-delete-section="${sectionIndex}">删除栏目</button>
            </div>
          </div>

          <div class="form-grid">
            ${fieldTemplate(`sections.${sectionIndex}.id`, "栏目 ID", section.id, "input")}
            ${fieldTemplate(`sections.${sectionIndex}.nav`, "顶部菜单名称", section.nav, "input")}
            ${fieldTemplate(`sections.${sectionIndex}.title`, "板块主标题", section.title, "input")}
            ${fieldTemplate(`sections.${sectionIndex}.kicker`, "板块上方小字", section.kicker, "input")}
            ${fieldTemplate(`sections.${sectionIndex}.description`, "板块说明", section.description, "textarea")}
            ${fieldTemplate(`sections.${sectionIndex}.tags`, "板块标签", (section.tags || []).join(", "), "input")}
            ${fieldTemplate(`sections.${sectionIndex}.protection.hint`, "密码提示文字", (section.protection && section.protection.hint) || "", "input")}
            ${fieldTemplate(`sections.${sectionIndex}.protection.password`, "访问密码", (section.protection && section.protection.password) || "", "input")}
            ${checkboxTemplate(`sections.${sectionIndex}.protection.enabled`, "启用密码保护", section.protection && section.protection.enabled)}
          </div>

          <div class="item-editor-list">
            ${(section.items || []).map((item, itemIndex) => itemEditorTemplate(item, sectionIndex, itemIndex)).join("")}
          </div>
        </article>
      `
    )
    .join("");

  elements.sectionEditor.insertAdjacentHTML(
    "beforeend",
    `<button class="ghost-button" type="button" data-add-section>添加栏目</button>`
  );
}

function itemEditorTemplate(item, sectionIndex, itemIndex) {
  const imageList = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
  const sourceNote = item.source === "twitter" ? `<p class="editor-note">来自 X/Twitter 同步。再次同步时会更新这个条目。</p>` : "";

  return `
    <article class="item-editor" data-section-index="${sectionIndex}" data-item-index="${itemIndex}">
      <div class="editor-card-head">
        <div>
          <small>${escapeHtml(item.meta || "条目")}</small>
          <h4>${escapeHtml(item.title || "未命名")}</h4>
        </div>
        <button class="tiny-button danger" type="button" data-delete-item="${sectionIndex}.${itemIndex}">删除</button>
      </div>
      ${sourceNote}

      <div class="form-grid">
        ${fieldTemplate(`sections.${sectionIndex}.items.${itemIndex}.title`, "标题", item.title, "input")}
        ${fieldTemplate(`sections.${sectionIndex}.items.${itemIndex}.meta`, "时间或类型", item.meta, "input")}
        ${fieldTemplate(`sections.${sectionIndex}.items.${itemIndex}.url`, "外链", item.url, "input")}
        ${fieldTemplate(`sections.${sectionIndex}.items.${itemIndex}.tags`, "标签", (item.tags || []).join(", "), "input")}
        ${fieldTemplate(`sections.${sectionIndex}.items.${itemIndex}.body`, "正文", item.body, "textarea")}
        ${fieldTemplate(`sections.${sectionIndex}.items.${itemIndex}.images`, "图片地址", imageList.join("\n"), "textarea")}
      </div>

      ${
        imageList.length
          ? `<div class="admin-image-strip">
              ${imageList
                .map(
                  (image, imageIndex) => `
                    <figure>
                      <img src="${escapeAttribute(image)}" alt="${escapeAttribute(item.title || "图片")}">
                      <button class="tiny-button danger" type="button" data-remove-image="${sectionIndex}.${itemIndex}.${imageIndex}">移除</button>
                    </figure>
                  `
                )
                .join("")}
            </div>`
          : ""
      }

      <label class="upload-field">
        <span>上传图片</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" data-upload="${sectionIndex}.${itemIndex}">
      </label>
    </article>
  `;
}

function renderIntegrations() {
  const settings = state.site.integrations.twitterCoffee;
  const syncStatus = settings.lastSyncedAt
    ? `上次同步：${new Date(settings.lastSyncedAt).toLocaleString()}`
    : "尚未同步。";
  const tokenStatus = state.twitterStatus.configured
    ? `Bearer Token 已配置（${escapeHtml(state.twitterStatus.source || "local-config")}${state.twitterStatus.tokenPreview ? `，${escapeHtml(state.twitterStatus.tokenPreview)}` : ""}）`
    : "Bearer Token 尚未配置。";

  elements.integrationEditor.innerHTML = `
    <article class="editor-card">
      <div class="editor-card-head">
        <div>
          <small>X / TWITTER</small>
          <h3>把含“咖啡”的推文同步到咖啡日常</h3>
        </div>
        <button class="primary-button" type="button" data-sync-twitter>同步咖啡推文</button>
      </div>

      <p class="editor-note">
        在下方粘贴 Bearer Token 并保存即可，无需改环境变量。Token 会保存在本机 <code>.private/twitter.json</code>，不会写进公开内容文件。
        默认使用 X API 最近搜索，只能稳定同步公开且在接口可检索范围内的推文。
      </p>

      <div class="form-grid">
        <label class="field">
          <span>Bearer Token</span>
          <input type="password" data-bearer-token placeholder="从 developer.x.com 复制 Bearer Token 后粘贴到这里">
        </label>
      </div>
      <div class="compact-actions">
        <button class="ghost-button" type="button" data-save-twitter-token>保存 Token</button>
      </div>
      <p class="editor-note ${state.twitterStatus.configured ? "" : "error-note"}">${tokenStatus}</p>

      <div class="form-grid">
        ${checkboxTemplate("integrations.twitterCoffee.enabled", "启用同步配置", settings.enabled)}
        ${fieldTemplate("integrations.twitterCoffee.username", "X/Twitter 用户名（不带 @）", settings.username, "input")}
        ${fieldTemplate("integrations.twitterCoffee.keyword", "关键词", settings.keyword, "input")}
        ${fieldTemplate("integrations.twitterCoffee.sectionId", "同步到哪个栏目 ID", settings.sectionId, "input")}
        ${fieldTemplate("integrations.twitterCoffee.maxResults", "同步条数（10-100）", settings.maxResults, "input")}
        ${fieldTemplate("integrations.twitterCoffee.query", "高级搜索 Query（可留空）", settings.query, "input")}
      </div>

      <p class="editor-note">${escapeHtml(syncStatus)}</p>
      ${settings.lastError ? `<p class="editor-note error-note">${escapeHtml(settings.lastError)}</p>` : ""}
    </article>

    <article class="editor-card" style="margin-top: 18px;">
      <div class="editor-card-head">
        <div>
          <small>MANUAL IMPORT</small>
          <h3>手动导入咖啡推文</h3>
        </div>
      </div>
      <p class="editor-note">如果 X API 额度不足，可以在这里手动粘贴推文内容。每行一条推文，会自动导入到「咖啡日常」栏目。</p>
      <div class="form-grid">
        <label class="field">
          <span>推文内容（每行一条，可用日期开头）</span>
          <textarea data-manual-tweets rows="6" placeholder="在这里粘贴推文，每行一条...&#10;格式1：纯文字（不带日期）&#10;例如：今天喝了一杯耶加雪菲，果味很浓&#10;&#10;格式2：日期 + 文字&#10;例如：2026-06-01 手冲参数：1:15，92度，中细研磨&#10;2026-05-28 哥伦比亚蕙兰，坚果风味很明显"></textarea>
        </label>
      </div>
      <div class="compact-actions">
        <button class="primary-button" type="button" data-import-tweets>导入推文</button>
      </div>
    `;
}

function renderSocials() {
  elements.socialEditor.innerHTML = (state.site.socials || [])
    .map(
      (social, index) => `
        <article class="item-editor" data-social-index="${index}">
          <div class="editor-card-head">
            <div>
              <small>${escapeHtml(social.platform || "平台")}</small>
              <h4>${escapeHtml(social.handle || "账号")}</h4>
            </div>
            <button class="tiny-button danger" type="button" data-delete-social="${index}">删除</button>
          </div>
          <div class="form-grid">
            ${fieldTemplate(`socials.${index}.platform`, "平台", social.platform, "input")}
            ${fieldTemplate(`socials.${index}.handle`, "账号", social.handle, "input")}
            ${fieldTemplate(`socials.${index}.url`, "链接", social.url, "input")}
            ${fieldTemplate(`socials.${index}.note`, "备注", social.note, "input")}
          </div>
        </article>
      `
    )
    .join("");
}

function fieldTemplate(path, label, value, type) {
  const escaped = escapeHtml(value ?? "");
  const control =
    type === "textarea"
      ? `<textarea data-path="${escapeAttribute(path)}" rows="4">${escaped}</textarea>`
      : `<input data-path="${escapeAttribute(path)}" value="${escaped}">`;

  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      ${control}
    </label>
  `;
}

function checkboxTemplate(path, label, checked) {
  return `
    <label class="field checkbox-field">
      <input type="checkbox" data-path="${escapeAttribute(path)}" ${checked ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function syncFromInputs() {
  document.querySelectorAll("[data-path]").forEach(input => {
    const path = input.dataset.path.split(".");
    const key = path[path.length - 1];
    let value;

    if (input.type === "checkbox") {
      value = input.checked;
    } else if (key === "tags" || key === "images") {
      value = splitList(input.value);
    } else if (key === "maxResults") {
      value = Number(input.value || 10);
    } else {
      value = input.value.trim();
    }

    setDeep(state.site, path, value);
  });
}

function setDeep(target, path, value) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const rawSegment = path[index];
    const segment = Number.isNaN(Number(rawSegment)) ? rawSegment : Number(rawSegment);
    cursor[segment] ||= {};
    cursor = cursor[segment];
  }
  const rawLast = path[path.length - 1];
  const last = Number.isNaN(Number(rawLast)) ? rawLast : Number(rawLast);
  cursor[last] = value;
}

function splitList(value) {
  return value
    .split(/[\n,，]/)
    .map(item => item.trim())
    .filter(Boolean);
}

async function saveSite(options = {}) {
  if (state.saving) return false;

  const { skipSync = false, successMessage = "已保存。" } = options;
  if (!skipSync) syncFromInputs();
  state.saving = true;
  setStatus("正在保存...");

  try {
    const response = await fetch("/api/site", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(state.site)
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "保存失败");
    }

    state.site = payload;
    render();
    setStatus(successMessage);
    return true;
  } catch (error) {
    setStatus(error.message);
    return false;
  } finally {
    state.saving = false;
  }
}

async function saveTwitterToken() {
  const bearerInput = document.querySelector("[data-bearer-token]");
  const bearerToken = bearerInput?.value.trim() || "";

  if (!bearerToken) {
    setStatus("请先粘贴 Bearer Token。");
    return;
  }

  setStatus("正在保存 Bearer Token...");

  try {
    const response = await fetch("/api/twitter/token", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bearerToken })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "保存 Token 失败");
    }

    state.twitterStatus = payload;
    if (bearerInput) bearerInput.value = "";
    renderIntegrations();
    setStatus("Bearer Token 已保存。现在可以点「同步咖啡推文」。");
  } catch (error) {
    setStatus(error.message);
  }
}

async function syncTwitterCoffee() {
  syncFromInputs();
  const saved = await saveSite({ skipSync: true, successMessage: "同步配置已保存，正在请求 X API..." });
  if (!saved) return;

  setStatus("正在同步 X/Twitter 咖啡推文...");

  try {
    const response = await fetch("/api/twitter/coffee/sync", {
      method: "POST"
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "同步失败");
    }

    state.site = payload.site;
    render();
    setStatus(`同步完成：${payload.count} 条推文已写入咖啡日常。`);
  } catch (error) {
    setStatus(error.message);
  }
}

async function uploadImage(input, sectionIndex, itemIndex) {
  const file = input.files[0];
  if (!file) return;

  syncFromInputs();
  setStatus("正在上传图片...");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "上传失败");
    }

    const item = state.site.sections[sectionIndex].items[itemIndex];
    item.images = [...(item.images || []), payload.url];
    const saved = await saveSite({
      skipSync: true,
      successMessage: "图片已上传并保存。"
    });

    if (!saved) {
      render();
      setStatus("图片已上传，但内容没有保存。请重试。");
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    input.value = "";
  }
}

async function uploadHeroImage(input) {
  const file = input.files[0];
  if (!file) return;

  syncFromInputs();
  setStatus("正在上传首页图片...");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "上传失败");
    }

    state.site.profile.heroImage = payload.url;
    const saved = await saveSite({
      skipSync: true,
      successMessage: "首页图片已上传并保存。"
    });

    if (!saved) {
      render();
      setStatus("首页图片已上传，但内容没有保存。请重试。");
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    input.value = "";
  }
}

function addSection() {
  syncFromInputs();
  const index = state.site.sections.length + 1;
  state.site.sections.push({
    id: `section-${index}`,
    nav: "新栏目",
    kicker: "NEW",
    title: "新栏目",
    description: "",
    tags: [],
    items: []
  });
  render();
}

function addItem(sectionIndex) {
  syncFromInputs();
  state.site.sections[sectionIndex].items.push({
    title: "新条目",
    meta: "Update",
    body: "",
    tags: [],
    url: "",
    images: []
  });
  render();
}

function addSocial() {
  syncFromInputs();
  state.site.socials.push({
    platform: "新平台",
    handle: "",
    url: "",
    note: ""
  });
  render();
}

function removeImage(sectionIndex, itemIndex, imageIndex) {
  syncFromInputs();
  const item = state.site.sections[sectionIndex].items[itemIndex];
  item.images.splice(imageIndex, 1);
  render();
  setStatus("图片已从条目移除，记得保存全部。");
}

function importTweets() {
  const textarea = document.querySelector("[data-manual-tweets]");
  const rawText = textarea?.value?.trim() || "";

  if (!rawText) {
    setStatus("请先粘贴推文内容。");
    return;
  }

  syncFromInputs();
  const sectionId = state.site.integrations.twitterCoffee.sectionId || "coffee";
  const sectionIndex = state.site.sections.findIndex(section => section.id === sectionId);

  if (sectionIndex === -1) {
    setStatus(`没有找到目标栏目：${sectionId}，请先在下方栏目列表里确认栏目 ID。`);
    return;
  }

  const lines = rawText.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const now = new Date().toISOString();
  const newItems = lines.map((line, index) => {
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s+(.+)$/);
    let title, body, createdAt, meta;

    if (dateMatch) {
      const dateStr = dateMatch[1];
      const content = dateMatch[2];
      createdAt = new Date(dateStr).toISOString();
      body = content;
      title = `咖啡推文 ${state.site.sections[sectionIndex].items.length + index + 1}`;
      meta = dateStr.split(" ")[0];
    } else {
      createdAt = now;
      body = line;
      title = `咖啡推文 ${state.site.sections[sectionIndex].items.length + index + 1}`;
      meta = "手动导入";
    }

    return {
      title,
      meta,
      body,
      tags: ["咖啡", "Twitter"],
      url: "",
      images: [],
      source: "twitter-manual",
      externalId: `manual-${createdAt}-${index}`,
      createdAt
    };
  });

  state.site.sections[sectionIndex].items = [...newItems, ...(state.site.sections[sectionIndex].items || [])];
  if (textarea) textarea.value = "";
  render();
  setStatus(`已导入 ${newItems.length} 条推文到「${state.site.sections[sectionIndex].title || sectionId}」，记得点「保存全部」。`);
}

function setStatus(message) {
  elements.status.textContent = message;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

elements.save.addEventListener("click", () => saveSite());
elements.addSocial.addEventListener("click", addSocial);

document.addEventListener("click", event => {
  const addSectionButton = event.target.closest("[data-add-section]");
  if (addSectionButton) addSection();

  const addItemButton = event.target.closest("[data-add-item]");
  if (addItemButton) addItem(Number(addItemButton.dataset.addItem));

  const deleteSectionButton = event.target.closest("[data-delete-section]");
  if (deleteSectionButton) {
    syncFromInputs();
    state.site.sections.splice(Number(deleteSectionButton.dataset.deleteSection), 1);
    render();
  }

  const deleteItemButton = event.target.closest("[data-delete-item]");
  if (deleteItemButton) {
    syncFromInputs();
    const [sectionIndex, itemIndex] = deleteItemButton.dataset.deleteItem.split(".").map(Number);
    state.site.sections[sectionIndex].items.splice(itemIndex, 1);
    render();
  }

  const deleteSocialButton = event.target.closest("[data-delete-social]");
  if (deleteSocialButton) {
    syncFromInputs();
    state.site.socials.splice(Number(deleteSocialButton.dataset.deleteSocial), 1);
    render();
  }

  const removeImageButton = event.target.closest("[data-remove-image]");
  if (removeImageButton) {
    const [sectionIndex, itemIndex, imageIndex] = removeImageButton.dataset.removeImage.split(".").map(Number);
    removeImage(sectionIndex, itemIndex, imageIndex);
  }

  const syncTwitterButton = event.target.closest("[data-sync-twitter]");
  if (syncTwitterButton) {
    syncTwitterCoffee();
  }

  const saveTwitterTokenButton = event.target.closest("[data-save-twitter-token]");
  if (saveTwitterTokenButton) {
    saveTwitterToken();
  }

  const importTweetsButton = event.target.closest("[data-import-tweets]");
  if (importTweetsButton) {
    importTweets();
  }
});

document.addEventListener("change", event => {
  const upload = event.target.closest("[data-upload]");
  if (!upload) return;

  const [sectionIndex, itemIndex] = upload.dataset.upload.split(".").map(Number);
  uploadImage(upload, sectionIndex, itemIndex);

  const heroUpload = event.target.closest("[data-upload-hero-image]");
  if (heroUpload) {
    uploadHeroImage(heroUpload);
  }
});

loadSite().catch(error => setStatus(error.message));
