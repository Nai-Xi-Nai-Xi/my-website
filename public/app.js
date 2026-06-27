/* === Naixi Personal Site - Frontend App === */

(async function () {
  // --- DOM refs ---
  const header = document.querySelector("[data-header]");
  const siteName = document.querySelector("[data-site-name]");
  const nav = document.querySelector("[data-nav]");
  const menuBtn = document.querySelector("[data-menu-button]");
  const heroTitle = document.querySelector("[data-hero-title]");
  const heroTagline = document.querySelector("[data-hero-tagline]");
  const heroLocation = document.querySelector("[data-hero-location]");
  const heroStatus = document.querySelector("[data-hero-status]");
  const heroImage = document.querySelector("[data-hero-image]");
  const heroIntro = document.querySelector("[data-hero-intro]");
  const contactNote = document.querySelector("[data-contact-note]");
  const indexList = document.querySelector("[data-index-list]");
  const sectionsContainer = document.querySelector("[data-sections]");
  const socialsGrid = document.querySelector("[data-socials]");
  const searchInput = document.querySelector("[data-search]");
  const clearSearchBtn = document.querySelector("[data-clear-search]");
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImg = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");

  // --- Fetch data ---
  let data;
  try {
    const res = await fetch("/api/site");
    if (!res.ok) throw new Error("API error " + res.status);
    data = await res.json();
    if (data.message) {
      // Fallback: try to load from window or show empty state
      console.warn("API returned message:", data.message);
    }
  } catch (err) {
    console.error("Failed to load site data:", err);
    showError("无法加载网站数据，请确认服务器正在运行。");
    return;
  }

  // --- Populate profile ---
  const p = data.profile || {};
  if (siteName) siteName.textContent = p.ownerName || p.siteName || "乃希";
  if (heroTitle) heroTitle.textContent = p.siteName || "乃希的个人网站";
  if (heroTagline) heroTagline.textContent = p.tagline || "";
  if (heroLocation) heroLocation.textContent = p.location || "Online";
  if (heroStatus) heroStatus.textContent = p.status || "";
  if (heroIntro) heroIntro.textContent = p.intro || "";
  if (contactNote) contactNote.textContent = p.contactNote || "";

  if (heroImage && p.heroImage) {
    heroImage.innerHTML = `<img src="${escapeHTML(p.heroImage)}" alt="Hero image">`;
  }

  document.title = p.siteName || "乃希的个人网站";

  // --- Sections ---
  const sections = data.sections || [];

  // Build nav
  if (nav) {
    nav.innerHTML = sections
      .filter(s => s.nav)
      .map(s => `<a href="#${escapeHTML(s.id)}">${escapeHTML(s.nav)}</a>`)
      .join("");
  }

  // Build index
  if (indexList) {
    indexList.innerHTML = sections
      .filter(s => s.nav)
      .map(s => `<li><a href="#${escapeHTML(s.id)}">${escapeHTML(s.nav)}</a></li>`)
      .join("");
  }

  // Build sections
  if (sectionsContainer) {
    sectionsContainer.innerHTML = sections.map(renderSection).join("");
  }

  // --- Socials ---
  if (socialsGrid) {
    const socials = data.socials || [];
    socialsGrid.innerHTML = socials.length
      ? socials.map(s => `
          <a class="social-card" href="${escapeHTML(s.url || "#")}" target="_blank" rel="noopener">
            <div class="platform">${escapeHTML(s.platform)}</div>
            <div class="handle">${escapeHTML(s.handle)}</div>
            ${s.note ? `<div class="note">${escapeHTML(s.note)}</div>` : ""}
          </a>`).join("")
      : `<div class="empty-state">暂无社交链接</div>`;
  }

  // --- Events ---
  // Mobile menu
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const expanded = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open");
    });
  }

  // Smooth scroll for nav links
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    e.preventDefault();
    const id = link.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      filterSections(q);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterSections("");
      searchInput.focus();
    });
  }

  // Lightbox
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".card-image img, .hero-image img");
    if (!img) return;
    if (lightboxImg && lightbox) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      if (lightboxCaption) {
        const card = img.closest(".item-card");
        lightboxCaption.textContent = card
          ? (card.querySelector(".card-title")?.textContent || "")
          : "";
      }
      lightbox.showModal();
    }
  });

  if (lightboxClose && lightbox) {
    lightboxClose.addEventListener("click", () => lightbox.close());
  }

  if (lightbox) {
    // 点空白处关闭
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close();
    });

    // ESC 键关闭（移动端也能用蓝牙键盘）
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.open) lightbox.close();
    });

    // 移动端下滑关闭
    let touchStartY = 0;
    lightbox.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
    });
    lightbox.addEventListener("touchend", (e) => {
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (dy > 80) lightbox.close();
    });
  }

  // Password unlock
  document.addEventListener("click", (e) => {
    const unlockBtn = e.target.closest(".unlock-btn");
    if (!unlockBtn) return;
    const container = unlockBtn.closest(".protection-banner");
    const input = container.querySelector("input");
    const sectionId = container.dataset.section;
    const errorEl = container.querySelector(".protection-error");

    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (input.value === section.protection.password) {
      // Replace the protected section content with actual items
      const sectionBlock = document.getElementById(sectionId);
      if (sectionBlock) {
        const oldContainer = sectionBlock.querySelector(".section-content");
        if (oldContainer) {
          oldContainer.outerHTML = renderSectionContent(section);
          // Re-filter
          if (searchInput) filterSections(searchInput.value.toLowerCase().trim());
        }
      }
    } else {
      if (errorEl) errorEl.textContent = "密码不正确，请重试。";
    }
  });

  // Enter key for password
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const input = e.target.closest(".protection-banner input");
      if (input) {
        input.closest(".protection-banner").querySelector(".unlock-btn").click();
      }
    }
  });

  console.log("✨ 乃希的个人网站已就绪");
})();

// --- Render helpers ---

function renderSection(section) {
  const tags = (section.tags || [])
    .map(t => `<span class="tag">${escapeHTML(t)}</span>`)
    .join("");

  const isProtected = section.protection?.enabled && section.protection?.password;

  return `
    <div class="section-block" id="${escapeHTML(section.id)}">
      <div class="section-header">
        ${section.kicker ? `<p class="eyebrow">${escapeHTML(section.kicker)}</p>` : ""}
        <h3>${escapeHTML(section.title)}</h3>
        ${section.description ? `<p class="section-desc">${escapeHTML(section.description)}</p>` : ""}
        ${tags ? `<div class="section-tags">${tags}</div>` : ""}
      </div>
      <div class="section-content">
        ${isProtected
          ? renderProtectionBanner(section)
          : renderSectionContent(section)}
      </div>
    </div>`;
}

function renderProtectionBanner(section) {
  return `
    <div class="protection-banner" data-section="${escapeHTML(section.id)}">
      <p>🔒 ${escapeHTML(section.protection.hint || "此栏目需要密码访问")}</p>
      <input type="password" placeholder="请输入密码">
      <button class="unlock-btn" type="button">解锁</button>
      <div class="protection-error"></div>
    </div>`;
}

function renderSectionContent(section) {
  const items = section.items || [];
  if (!items.length) return `<div class="empty-state">暂无内容</div>`;

  return `<div class="items-grid">${items.map(renderItem).join("")}</div>`;
}

function renderItem(item) {
  const imageHTML = (item.images || []).length
    ? `<div class="card-image"><img src="${escapeHTML(item.images[0])}" alt="${escapeHTML(item.title)}" loading="lazy"></div>`
    : "";

  return `
    <div class="item-card" data-tags="${escapeHTML((item.tags || []).join(","))}" data-title="${escapeHTML(item.title)}" data-body="${escapeHTML(item.body || "")}">
      ${imageHTML}
      <div class="card-body">
        <div class="card-title">${escapeHTML(item.title)}</div>
        ${item.meta ? `<div class="card-meta">${escapeHTML(item.meta)}</div>` : ""}
        ${item.body ? `<div class="card-text">${escapeHTML(item.body)}</div>` : ""}
        ${item.url ? `<a class="card-url" href="${escapeHTML(item.url)}" target="_blank" rel="noopener">查看 →</a>` : ""}
      </div>
    </div>`;
}

function filterSections(query) {
  const blocks = document.querySelectorAll(".section-block");
  blocks.forEach(block => {
    if (!query) {
      block.style.display = "";
      // Show all cards in this block
      block.querySelectorAll(".item-card").forEach(card => {
        card.style.display = "";
      });
      return;
    }

    const blockText = block.textContent.toLowerCase();
    const cards = block.querySelectorAll(".item-card");
    let hasVisibleCard = false;

    cards.forEach(card => {
      const tags = (card.dataset.tags || "").toLowerCase();
      const title = (card.dataset.title || "").toLowerCase();
      const body = (card.dataset.body || "").toLowerCase();
      const match = tags.includes(query) || title.includes(query) || body.includes(query);

      card.style.display = match ? "" : "none";
      if (match) hasVisibleCard = true;
    });

    // Hide section block if no cards match AND the section header doesn't match
    const headerMatch = blockText.includes(query);
    block.style.display = (hasVisibleCard || headerMatch) ? "" : "none";
  });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function showError(msg) {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div style="background:#fef2f2;color:#c7512e;padding:16px 24px;text-align:center;font-size:.9rem;border-bottom:1px solid #fecaca;">${escapeHTML(msg)}</div>`
  );
}
