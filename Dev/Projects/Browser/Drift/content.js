// Drift - Floating Pill (Website Icon + Time Spent, Expands on Click)
// Content Script: Website Overlay & Feed Swipe Tracker

(function () {
  "use strict";

  if (window.__drift_initialized) return;
  window.__drift_initialized = true;

  // --- STATE ---
  let isMaximized = false; // default is minimized: icon + time spent
  let isPaused = false;
  let isDragging = false;
  let hasDragged = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let currentCorner = "top-right";
  let isShortFeed = false;
  let lastShortId = null;
  let idleTimer = null;
  let domainSeconds = 0;
  let domainSwipes = 0;

  const currentDomain = location.hostname.toLowerCase().replace(/^www\./, "");

  function formatTime(sec) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  // --- SHADOW DOM HOST ---
  const host = document.createElement("div");
  host.id = "drift-overlay-host";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "visible";
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });

  // CSS Styles inside Shadow Root (System Themed & Translucent)
  const style = document.createElement("style");
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }

    #drift-container {
      position: fixed;
      z-index: 2147483647;
      display: flex;
      pointer-events: auto;
      touch-action: none;
      opacity: 1;

      /* Light Theme Variables */
      --drift-bg: rgba(255, 255, 255, 0.82);
      --drift-border: rgba(226, 232, 240, 0.85);
      --drift-shadow: 0 4px 20px rgba(49, 91, 219, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
      --drift-text: #0f172a;
      --drift-muted: #64748b;
      --drift-favicon-bg: rgba(241, 245, 249, 0.9);
      --drift-favicon-border: rgba(226, 232, 240, 0.8);
      --drift-btn-bg: #e8f0ff;
      --drift-btn-color: #315bdb;
      --drift-btn-hover: #d6e4ff;
      --drift-paused-bg: #fef3c7;
      --drift-paused-color: #d97706;
      --drift-chevron: #94a3b8;
      --drift-chevron-hover: #315bdb;

      transition: opacity 0.3s ease,
                  transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  top 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                  left 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                  right 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                  bottom 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Dark Theme (Automatic System Adaptation) */
    @media (prefers-color-scheme: dark) {
      #drift-container {
        --drift-bg: rgba(15, 23, 42, 0.78);
        --drift-border: rgba(255, 255, 255, 0.14);
        --drift-shadow: 0 4px 22px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25);
        --drift-text: #f8fafc;
        --drift-muted: #94a3b8;
        --drift-favicon-bg: rgba(255, 255, 255, 0.08);
        --drift-favicon-border: rgba(255, 255, 255, 0.12);
        --drift-btn-bg: rgba(49, 91, 219, 0.25);
        --drift-btn-color: #60a5fa;
        --drift-btn-hover: rgba(49, 91, 219, 0.38);
        --drift-paused-bg: rgba(245, 158, 11, 0.25);
        --drift-paused-color: #fbbf24;
        --drift-chevron: rgba(255, 255, 255, 0.55);
        --drift-chevron-hover: #60a5fa;
      }
    }

    #drift-container.corner-top-right {
      top: 20px;
      right: 20px;
      left: auto;
      bottom: auto;
    }
    #drift-container.corner-top-left {
      top: 20px;
      left: 20px;
      right: auto;
      bottom: auto;
    }
    #drift-container.corner-bottom-right {
      bottom: 20px;
      right: 20px;
      top: auto;
      left: auto;
    }
    #drift-container.corner-bottom-left {
      bottom: 20px;
      left: 20px;
      top: auto;
      right: auto;
    }

    #drift-container.drift-dragging {
      transition: none !important;
    }
    #drift-container.drift-dragging .drift-pill {
      cursor: grabbing !important;
      transform: scale(1.04);
      box-shadow: 0 12px 28px rgba(49, 91, 219, 0.25), 0 4px 10px rgba(0, 0, 0, 0.12) !important;
    }

    #drift-container.drift-idle:not(:hover):not(.maximized) {
      opacity: 0.42;
    }

    /* THE TRANSLUCENT GLASS PILL */
    .drift-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      background: var(--drift-bg);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid var(--drift-border);
      box-shadow: var(--drift-shadow);
      cursor: grab;
      color: var(--drift-text);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    #drift-container:not(.drift-dragging) .drift-pill:hover {
      box-shadow: 0 8px 24px rgba(49, 91, 219, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
      transform: scale(1.02);
    }

    /* 1. MINIMIZED: Website Icon + Time Spent */
    .drift-pill.minimized {
      height: 32px;
      padding: 4px 11px 4px 6px;
      gap: 7px;
    }

    .drift-pill.minimized .drift-favicon-box {
      width: 22px;
      height: 22px;
      border-radius: 6px;
    }

    .drift-pill.minimized .drift-favicon {
      width: 13px;
      height: 13px;
    }

    .drift-pill.minimized .drift-time {
      font-size: 12px;
      font-weight: 700;
      color: var(--drift-text);
    }

    .drift-pill.minimized .drift-domain-link,
    .drift-pill.minimized .drift-pill-controls {
      display: none !important;
    }

    /* 2. MAXIMIZED: Icon, Link, Time Spent, Pause & Toggle */
    .drift-pill.maximized {
      height: 46px;
      padding: 6px 12px 6px 9px;
      gap: 10px;
    }

    .drift-pill.maximized .drift-favicon-box {
      width: 28px;
      height: 28px;
      border-radius: 8px;
    }

    .drift-pill.maximized .drift-favicon {
      width: 16px;
      height: 16px;
    }

    .drift-pill.maximized .drift-time {
      font-size: 13px;
      font-weight: 700;
      color: var(--drift-text);
    }

    .drift-pill.maximized .drift-domain-link {
      display: block;
    }

    .drift-pill.maximized .drift-pill-controls {
      display: flex;
    }

    /* Favicon Box */
    .drift-favicon-box {
      background: var(--drift-favicon-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid var(--drift-favicon-border);
      transition: all 0.2s ease;
    }

    .drift-favicon {
      border-radius: 3px;
      object-fit: contain;
    }

    /* Info Column */
    .drift-pill-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .drift-pill-time-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .drift-time {
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
      line-height: 1.1;
      color: var(--drift-text);
      transition: font-size 0.2s ease, color 0.2s ease;
    }

    .drift-pill.paused .drift-time {
      color: var(--drift-paused-color);
    }

    .drift-swipes-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 600;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.12);
      padding: 1px 5px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .drift-swipes-badge.drift-hidden {
      display: none !important;
    }

    .drift-swipes-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #ef4444;
    }

    /* Domain Link */
    .drift-domain-link {
      font-size: 10px;
      font-weight: 500;
      color: var(--drift-muted);
      text-decoration: none;
      line-height: 1.1;
      max-width: 115px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color 0.15s ease;
    }

    .drift-domain-link:hover {
      color: var(--drift-btn-color);
      text-decoration: underline;
    }

    /* Controls: Pause & Collapse Chevron */
    .drift-pill-controls {
      align-items: center;
      gap: 6px;
      margin-left: 2px;
    }

    .drift-pill-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      border-radius: 8px;
      transition: all 0.15s ease;
    }

    .drift-pause-btn {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: var(--drift-btn-bg);
      color: var(--drift-btn-color);
    }

    .drift-pause-btn:hover {
      background: var(--drift-btn-hover);
      transform: scale(1.05);
    }

    .drift-pause-btn.paused {
      background: var(--drift-paused-bg);
      color: var(--drift-paused-color);
    }

    .drift-icon-pause {
      font-size: 10px;
      letter-spacing: 0.5px;
      font-weight: 700;
    }

    .drift-toggle-btn {
      width: 20px;
      height: 26px;
      color: var(--drift-chevron);
    }

    .drift-toggle-btn:hover {
      color: var(--drift-chevron-hover);
    }

    .drift-chevron {
      transform: rotate(180deg);
      transition: transform 0.2s ease;
    }

    .drift-hidden {
      display: none !important;
    }
  `;

  shadow.appendChild(style);

  // --- CONTAINER HTML ---
  const container = document.createElement("div");
  container.id = "drift-container";
  container.className = "corner-top-right";

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${currentDomain}&sz=32`;

  container.innerHTML = `
    <div id="drift-pill" class="drift-pill minimized" role="button" tabindex="0" title="Drift: Click to expand, drag to move">
      <!-- Website Favicon -->
      <div class="drift-favicon-box">
        <img id="drift-favicon" class="drift-favicon" src="${faviconUrl}" alt="" />
      </div>

      <!-- Info Column: Time + Link -->
      <div class="drift-pill-info">
        <div class="drift-pill-time-row">
          <span id="drift-time" class="drift-time">00:00</span>
          <span id="drift-swipes-badge" class="drift-swipes-badge drift-hidden">
            <span class="drift-swipes-dot"></span>
            <span id="drift-swipes-count">0</span>
          </span>
        </div>
        <a id="drift-domain-link" class="drift-domain-link" href="${location.href}" target="_blank" title="${currentDomain}">
          ${currentDomain}
        </a>
      </div>

      <!-- Controls (Maximized State) -->
      <div class="drift-pill-controls">
        <button id="drift-pause-btn" class="drift-pill-btn drift-pause-btn" title="Pause / Resume tracking">
          <span id="drift-pause-icon" class="drift-icon-pause">❚❚</span>
        </button>
        <button id="drift-toggle-btn" class="drift-pill-btn drift-toggle-btn" title="Collapse">
          <svg class="drift-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  shadow.appendChild(container);

  function mount() {
    const target = document.fullscreenElement || document.body || document.documentElement;
    if (target && !target.contains(host)) {
      target.appendChild(host);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  document.addEventListener("fullscreenchange", mount);

  // --- ELEMENT REFERENCES ---
  const pillEl = shadow.getElementById("drift-pill");
  const timeEl = shadow.getElementById("drift-time");
  const pauseBtn = shadow.getElementById("drift-pause-btn");
  const pauseIcon = shadow.getElementById("drift-pause-icon");
  const toggleBtn = shadow.getElementById("drift-toggle-btn");
  const domainLink = shadow.getElementById("drift-domain-link");
  const swipesBadge = shadow.getElementById("drift-swipes-badge");
  const swipesCount = shadow.getElementById("drift-swipes-count");

  // --- CORNER DOCKING ---
  function setCorner(corner, save = true) {
    currentCorner = corner;
    container.classList.remove("corner-top-right", "corner-top-left", "corner-bottom-right", "corner-bottom-left");
    container.classList.add(`corner-${corner}`);

    container.style.left = "";
    container.style.top = "";
    container.style.right = "";
    container.style.bottom = "";

    if (save && chrome?.storage?.local) {
      chrome.storage.local.get("drift_settings", (res) => {
        const s = res.drift_settings || {};
        s.pillCorner = corner;
        chrome.storage.local.set({ drift_settings: s });
      });
    }
  }

  // --- MAXIMIZE / MINIMIZE TOGGLE ---
  function setMaximized(maximized, save = true) {
    isMaximized = maximized;
    if (isMaximized) {
      pillEl.classList.remove("minimized");
      pillEl.classList.add("maximized");
      container.classList.add("maximized");
      pillEl.title = "Drift: Click to collapse, drag to move";
    } else {
      pillEl.classList.remove("maximized");
      pillEl.classList.add("minimized");
      container.classList.remove("maximized");
      pillEl.title = "Drift: Click to expand, drag to move";
    }

    if (save && chrome?.storage?.local) {
      chrome.storage.local.get("drift_settings", (res) => {
        const s = res.drift_settings || {};
        s.pillMaximized = maximized;
        chrome.storage.local.set({ drift_settings: s });
      });
    }
  }

  // Clicking the pill toggles between minimized and maximized
  pillEl.addEventListener("click", (e) => {
    if (hasDragged) return;
    if (e.target.closest("#drift-pause-btn") || e.target.closest("#drift-domain-link")) return;

    if (isMaximized) {
      setMaximized(false, true);
    } else {
      setMaximized(true, true);
    }
  });

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setMaximized(false, true);
  });

  // Close / collapse when clicking outside if maximized
  window.addEventListener("mousedown", (e) => {
    if (!isMaximized) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(container)) {
      setMaximized(false, true);
    }
  });

  // --- DRAGGING & MAGNETIC CORNER SNAPPING ---
  pillEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("#drift-pause-btn") || e.target.closest("#drift-toggle-btn") || e.target.closest("#drift-domain-link")) return;

    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    resetIdle();
  });

  window.addEventListener("mousemove", (e) => {
    resetIdle();
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!hasDragged && Math.hypot(dx, dy) > 4) {
      hasDragged = true;
      container.classList.add("drift-dragging");
    }

    if (hasDragged) {
      const width = container.offsetWidth || 120;
      const height = container.offsetHeight || 36;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const margin = 10;
      newLeft = Math.max(margin, Math.min(window.innerWidth - width - margin, newLeft));
      newTop = Math.max(margin, Math.min(window.innerHeight - height - margin, newTop));

      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
      container.style.right = "auto";
      container.style.bottom = "auto";
    }
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;

    if (hasDragged) {
      container.classList.remove("drift-dragging");

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const isLeft = centerX < window.innerWidth / 2;
      const isTop = centerY < window.innerHeight / 2;

      const corner = `${isTop ? "top" : "bottom"}-${isLeft ? "left" : "right"}`;
      setCorner(corner, true);
    }
  });

  // --- SMART IDLE DIMMING ---
  function resetIdle() {
    container.classList.remove("drift-idle");
    clearTimeout(idleTimer);

    if (isDragging || isMaximized) return;

    idleTimer = setTimeout(() => {
      if (!isDragging && !isMaximized) {
        container.classList.add("drift-idle");
      }
    }, 3500);
  }

  window.addEventListener("mousemove", resetIdle, { passive: true });
  window.addEventListener("scroll", resetIdle, { passive: true });
  window.addEventListener("keydown", resetIdle, { passive: true });
  container.addEventListener("mouseenter", resetIdle);
  resetIdle();

  // --- PAUSE / RESUME ---
  function updatePauseUI(paused) {
    isPaused = paused;
    if (isPaused) {
      pauseBtn.classList.add("paused");
      pillEl.classList.add("paused");
      pauseIcon.textContent = "▶";
    } else {
      pauseBtn.classList.remove("paused");
      pillEl.classList.remove("paused");
      pauseIcon.textContent = "❚❚";
    }
  }

  pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: "DRIFT_TOGGLE_PAUSE" }, (res) => {
      if (res) updatePauseUI(res.isPaused);
    });
  });

  // --- WEBSITE-AWARE SHORT VIDEO FEEDS ---
  function checkFeed() {
    const host = location.hostname.toLowerCase();
    const path = location.pathname.toLowerCase();

    isShortFeed =
      (host.includes("youtube.com") && path.startsWith("/shorts")) ||
      (host.includes("instagram.com") && (path.includes("/reels/") || path.includes("/reel/"))) ||
      (host.includes("tiktok.com") && (path.includes("/video/") || path.startsWith("/@")));

    if (isShortFeed) {
      swipesBadge.classList.remove("drift-hidden");
      swipesCount.textContent = `${domainSwipes} swipes`;
      checkShortSwipe();
    } else {
      swipesBadge.classList.add("drift-hidden");
    }
  }

  function checkShortSwipe() {
    if (!isShortFeed) return;
    let currentId = null;
    const path = location.pathname;

    if (location.hostname.includes("youtube.com")) {
      const parts = path.split("/shorts/");
      if (parts[1]) currentId = parts[1].split(/[?&#/]/)[0];
    } else if (location.hostname.includes("instagram.com")) {
      const parts = path.split(/\/reel(?:s)?\//);
      if (parts[1]) currentId = parts[1].split(/[?&#/]/)[0];
    } else if (location.hostname.includes("tiktok.com")) {
      const parts = path.split("/video/");
      if (parts[1]) currentId = parts[1].split(/[?&#/]/)[0];
    }

    if (currentId && currentId !== lastShortId) {
      if (lastShortId !== null) {
        domainSwipes++;
        swipesCount.textContent = `${domainSwipes} swipes`;
        chrome.runtime.sendMessage({ type: "DRIFT_RECORD_SWIPE", domain: currentDomain });
      }
      lastShortId = currentId;
    }
  }

  window.addEventListener("popstate", checkFeed);
  window.addEventListener("yt-navigate-finish", checkFeed);
  const feedObserver = new MutationObserver(checkFeed);
  feedObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.addEventListener("keydown", (e) => {
    if (!isShortFeed) return;
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "j", "k"].includes(e.key)) {
      setTimeout(checkShortSwipe, 300);
    }
  }, { passive: true });

  let wheelTimeout = null;
  window.addEventListener("wheel", (e) => {
    if (!isShortFeed) return;
    if (Math.abs(e.deltaY) > 40) {
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(checkShortSwipe, 350);
    }
  }, { passive: true });

  // --- BACKGROUND TICK LISTENER ---
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "DRIFT_TICK") {
      domainSeconds++;
      timeEl.textContent = formatTime(domainSeconds);
      if (message.isPaused !== undefined && message.isPaused !== isPaused) {
        updatePauseUI(message.isPaused);
      }
    }
  });

  // Settings listener
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.drift_settings?.newValue) {
      const s = changes.drift_settings.newValue;
      if (s.floatingPill === false) {
        container.classList.add("drift-hidden");
      } else {
        container.classList.remove("drift-hidden");
      }
      if (s.pillCorner && s.pillCorner !== currentCorner) {
        setCorner(s.pillCorner, false);
      }
    }
  });

  // --- INITIALIZATION ---
  function init() {
    checkFeed();

    chrome.runtime.sendMessage({ type: "DRIFT_GET_STATE" }, (state) => {
      if (chrome.runtime.lastError || !state) return;

      domainSeconds = state.domainSeconds || 0;
      domainSwipes = state.domainSwipes || 0;
      timeEl.textContent = formatTime(domainSeconds);
      swipesCount.textContent = `${domainSwipes} swipes`;
      updatePauseUI(state.isPaused);

      const s = state.settings || {};
      if (s.floatingPill === false) {
        container.classList.add("drift-hidden");
      }
      if (s.pillCorner) {
        setCorner(s.pillCorner, false);
      }
      if (s.pillMaximized) {
        setMaximized(true, false);
      } else {
        setMaximized(false, false);
      }
    });
  }

  init();
})();
