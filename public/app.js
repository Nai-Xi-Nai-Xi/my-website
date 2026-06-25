const state = {
  site: null,
  search: "",
  liked: new Set(JSON.parse(localStorage.getItem("likedItems") || "[]"))
};

const $ = selector => document.querySelector(selector);

const elements = {
  siteName: $("[data-site-name]"),
  nav: $("[data-nav]"),
  menuButton: $("[data-menu-button]"),
  indexList: $("[data-index-list]"),
  sections: $("[data-sections]"),
  socials: $("[data-socials]"),
  search: $("[data-search]"),
  clearSearch: $("[data-clear-search]"),
  heroTitle: $("[data-hero-title]"),
  heroTagline: $("[data-hero-tagline]"),
  heroLocation: $("[data-hero-location]"),
  heroStatus: $("[data-hero-status]"),
  heroIntro: $("[data-hero-intro]"),
  heroImage: $("[data-hero-image]"),
  contactNote: $("[data-contact-note]"),
  lightbox: $("[data-lightbox]"),
  lightboxImage: $("[data-lightbox-image]"),
  lightboxCaption: $("[data-lightbox-caption]"),
  lightboxClose: $("[data-lightbox-close]")
};

async function loadSite() {
  const response = await fetch("/api/site", { cache: "no-store" });
  if (!response.ok) throw new Error("内容读取失败");
  state.site = await response.json();
  render();
}

function render() {
  const { profile, sections, socials } = state.site;

  document.title = profile.siteName || "个人网站";
  elements.siteName.textContent = profile.ownerName || profile.siteName || "乃希";
  elements.heroTitle.textContent = profile.siteName || "个人网站";
  elements.heroTagline.textContent = profile.tagline || "";
  elements.heroLocation.textContent = profile.location || "Online";
  elements.heroStatus.textContent = profile.status || "更新中";
  elements.heroIntro.textContent = profile.intro || "";
  elements.contactNote.textContent = profile.contactNote || "";

  renderHeroImage(profile);
  renderNav(sections);
  renderIndex(sections);
  renderSections(sections);
  renderSocials(socials || []);
}

function renderHeroImage(profile) {
  elements.heroImage.innerHTML = "";
  elements.heroImage.classList.toggle("is-empty", !profile.heroImage);

  if (profile.heroImage) {
    const image = document.createElement("img");
    image.src = profile.heroImage;
    image.alt = `${profile.ownerName || "主页"}照片`;
    image.loading = "lazy";
    elements.heroImage.append(image);
    return;
  }

  elements.heroImage.innerHTML = `
    <span>NAIXI</span>
    <small>archive / daily / works</small>
  `;
}

function renderNav(sections) {
  elements.nav.innerHTML = sections
    .map(section => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.nav)}</a>`)
    .join("");
}

function renderIndex(sections) {
  elements.indexList.innerHTML = sections
    .map(
      (section, index) => `
        <li>
          <span>/${String(index).padStart(2, "0")}</span>
          <a href="#${escapeHtml(section.id)}">${escapeHtml(section.nav)}</a>
        </li>
      `
    )
    .join("");
}

function renderSections(sections) {
  const query = state.search.trim().toLowerCase();
  const filtered = sections
    .map(section => ({
      ...section,
      items: filterItems(section, query)
    }))
    .filter(section => !query || section.items.length || sectionMatches(section, query));

  elements.sections.innerHTML = filtered.map((section, index) => sectionTemplate(section, index)).join("");
  bindSectionEvents();
}

function filterItems(section, query) {
  if (!query) return section.items || [];
  return (section.items || []).filter(item => itemMatches(item, query) || sectionMatches(section, query));
}

function sectionMatches(section, query) {
  return [section.nav, section.kicker, section.title, section.description, ...(section.tags || [])]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function itemMatches(item, query) {
  return [item.title, item.meta, item.body, item.url, ...(item.tags || [])]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sectionTemplate(section, index) {
  const items = section.items || [];
  const protection = section.protection;
  const isProtected = protection && protection.enabled && protection.password;

  if (isProtected) {
    return `
      <article class="content-section" id="${escapeHtml(section.id)}" data-protected="${escapeHtml(section.id)}">
        <div class="section-title">
          <small>/${String(index).padStart(2, "0")} ${escapeHtml(section.kicker || "")}</small>
          <h2>🔒 ${escapeHtml(section.title)}</h2>
          <p>此栏目已加密，需要密码才能查看。</p>
        </div>
        <div class="item-list">
          <div class="entry">
            <div class="entry-main">
              <p style="margin:0 0 12px;">${escapeHtml(protection.hint || "请输入访问密码：")}</p>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <input type="password" data-unlock-password="${escapeHtml(section.id)}" placeholder="输入密码" style="width:220px;">
                <button class="tiny-button" type="button" data-unlock="${escapeHtml(section.id)}">解锁</button>
              </div>
              <p class="unlock-error" data-unlock-error="${escapeHtml(section.id)}" style="color:var(--accent);margin:8px 0 0;display:none;">密码错误，请重试。</p>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  return `
    <article class="content-section" id="${escapeHtml(section.id)}">
      <div class="section-title">
        <small>/${String(index).padStart(2, "0")} ${escapeHtml(section.kicker || "")}</small>
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.description || "")}</p>
        ${tagList(section.tags)}
      </div>

      <div class="item-list">
        ${items.length ? items.map((item, itemIndex) => itemTemplate(item, section.id, itemIndex)).join("") : emptyTemplate()}
      </div>
    </article>
  `;
}

function itemTemplate(item, sectionId, itemIndex) {
  const key = `${sectionId}-${itemIndex}-${item.title}`;
  const liked = state.liked.has(key);
  const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];

  return `
    <article class="entry" data-entry-key="${escapeHtml(key)}">
      <div class="entry-main">
        <div class="entry-head">
          <small>${escapeHtml(item.meta || "Update")}</small>
          <h3>${escapeHtml(item.title || "未命名")}</h3>
        </div>
        <p>${formatBody(item.body || "")}</p>
        ${tagList(item.tags)}
        <div class="entry-actions">
          ${
            item.url
              ? `<a class="inline-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">打开链接</a>`
              : ""
          }
          <button class="tiny-button" type="button" data-like aria-pressed="${liked}">${liked ? "已收藏" : "收藏"}</button>
        </div>
      </div>
      ${
        images.length
          ? `<div class="image-grid">${images
              .map(
                (image, imageIndex) => `
                  <button class="photo-button" type="button" data-image="${escapeAttribute(image)}" data-caption="${escapeAttribute(item.title)} ${imageIndex + 1}">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(item.title)}" loading="lazy">
                  </button>
                `
              )
              .join("")}</div>`
          : ""
      }
    </article>
  `;
}

function emptyTemplate() {
  return `<div class="empty-state">这里还在等待新的内容。</div>`;
}

function tagList(tags = []) {
  const cleanTags = tags.filter(Boolean);
  if (!cleanTags.length) return "";
  return `<ul class="tags">${cleanTags.map(tag => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>`;
}

function formatBody(text) {
  return escapeHtml(text).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
}

function renderSocials(socials) {
  elements.socials.innerHTML = socials
    .map(
      social => `
        <a class="social-card" href="${escapeAttribute(social.url || "#")}" target="_blank" rel="noreferrer">
          <small>${escapeHtml(social.platform || "平台")}</small>
          <strong>${escapeHtml(social.handle || "")}</strong>
          <span>${escapeHtml(social.note || "")}</span>
        </a>
      `
    )
    .join("");
}

function handleUnlock(sectionId) {
  const section = state.site.sections.find(s => s.id === sectionId);
  if (!section || !section.protection) return;

  const input = document.querySelector(`[data-unlock-password="${escapeAttribute(sectionId)}"]`);
  const error = document.querySelector(`[data-unlock-error="${escapeAttribute(sectionId)}"]`);
  const entered = input ? input.value : "";

  if (entered === section.protection.password) {
    const originalPassword = section.protection.password;
    section.protection.password = "";
    renderSections(state.site.sections);
    section.protection.password = originalPassword;
  } else {
    if (error) {
      error.style.display = "block";
      setTimeout(() => { error.style.display = "none"; }, 3000);
    }
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

function bindSectionEvents() {
  document.querySelectorAll("[data-like]").forEach(button => {
    button.addEventListener("click", () => {
      const entry = button.closest("[data-entry-key]");
      const key = entry.dataset.entryKey;

      if (state.liked.has(key)) {
        state.liked.delete(key);
      } else {
        state.liked.add(key);
      }

      localStorage.setItem("likedItems", JSON.stringify([...state.liked]));
      renderSections(state.site.sections);
    });
  });

  document.querySelectorAll("[data-image]").forEach(button => {
    button.addEventListener("click", () => openLightbox(button.dataset.image, button.dataset.caption));
  });

  document.querySelectorAll("[data-unlock]").forEach(button => {
    button.addEventListener("click", () => handleUnlock(button.dataset.unlock));
  });

  document.querySelectorAll("[data-unlock-password]").forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        handleUnlock(input.dataset.unlockPassword);
      }
    });
  });
}

function openLightbox(src, caption) {
  elements.lightboxImage.src = src;
  elements.lightboxImage.alt = caption || "";
  elements.lightboxCaption.textContent = caption || "";
  elements.lightbox.showModal();
}

function closeLightbox() {
  elements.lightbox.close();
  elements.lightboxImage.removeAttribute("src");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

elements.menuButton.addEventListener("click", () => {
  const isOpen = elements.nav.classList.toggle("nav-open");
  elements.menuButton.setAttribute("aria-expanded", String(isOpen));
});

elements.search.addEventListener("input", event => {
  state.search = event.target.value;
  renderSections(state.site.sections);
});

elements.clearSearch.addEventListener("click", () => {
  state.search = "";
  elements.search.value = "";
  renderSections(state.site.sections);
});

elements.lightboxClose.addEventListener("click", closeLightbox);
elements.lightbox.addEventListener("click", event => {
  if (event.target === elements.lightbox) closeLightbox();
});

loadSite().catch(error => {
  elements.sections.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
});
