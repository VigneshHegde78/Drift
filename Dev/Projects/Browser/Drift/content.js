// Drift - Subtle, Clean Floating Pill
// Content Script: Website Overlay

(function () {
  "use strict";

  if (window.__drift_initialized) return;
  window.__drift_initialized = true;

  // --- STATE ---
  let isMaximized = false; // default is minimized: icon + time
  let isPaused = false;
  let isDragging = false;
  let hasDragged = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let currentCorner = "top-right";
  let idleTimer = null;
  let domainSeconds = 0;

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

  // CSS Styles inside Shadow Root
  const style = document.createElement("style");
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }

    #drift-pill {
      position: fixed;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      pointer-events: auto;
      touch-action: none;
      border-radius: 9999px;
      cursor: grab;
      overflow: hidden;

      /* Subtle Light Theme */
      --pill-bg: rgba(255, 255, 255, 0.92);
      --pill-border: rgba(0, 0, 0, 0.08);
      --pill-shadow: 0 2px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
      --pill-text: #18181b;
      --pill-muted: #71717a;
      --pill-icon-bg: #f4f4f5;
      --pill-btn-bg: #f4f4f5;
      --pill-btn-hover: #e4e4e7;
      --pill-btn-color: #27272a;
      --pill-paused: #c2410c;
      --pill-paused-bg: #ffedd5;
      --pill-chevron: #71717a;

      background: var(--pill-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--pill-border);
      box-shadow: var(--pill-shadow);
      color: var(--pill-text);

      opacity: 1;
      transition: opacity 0.25s ease,
                  transform 0.18s ease,
                  box-shadow 0.2s ease,
                  top 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  left 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  right 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  height 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                  padding 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Subtle Dark Theme */
    @media (prefers-color-scheme: dark) {
      #drift-pill {
        --pill-bg: rgba(24, 24, 27, 0.88);
        --pill-border: rgba(255, 255, 255, 0.1);
        --pill-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        --pill-text: #f4f4f5;
        --pill-muted: #a1a1aa;
        --pill-icon-bg: rgba(255, 255, 255, 0.06);
        --pill-btn-bg: rgba(255, 255, 255, 0.08);
        --pill-btn-hover: rgba(255, 255, 255, 0.14);
        --pill-btn-color: #e4e4e7;
        --pill-paused: #fb923c;
        --pill-paused-bg: rgba(234, 88, 12, 0.15);
        --pill-chevron: #a1a1aa;
      }
    }

    /* Corner Presets */
    #drift-pill.corner-top-right {
      top: 20px;
      right: 20px;
      left: auto;
      bottom: auto;
    }
    #drift-pill.corner-top-left {
      top: 20px;
      left: 20px;
      right: auto;
      bottom: auto;
    }
    #drift-pill.corner-bottom-right {
      bottom: 20px;
      right: 20px;
      top: auto;
      left: auto;
    }
    #drift-pill.corner-bottom-left {
      bottom: 20px;
      left: 20px;
      top: auto;
      right: auto;
    }

    /* Dragging Mode */
    #drift-pill.drift-dragging {
      cursor: grabbing !important;
      transform: scale(1.03);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
      transition: none !important;
    }

    /* Idle State */
    #drift-pill.drift-idle:not(:hover):not(.maximized) {
      opacity: 0.5;
    }

    #drift-pill:not(.drift-dragging):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
    }

    /* 1. MINIMIZED: Clean Favicon + Legible Time */
    #drift-pill.minimized {
      height: 42px;
      padding: 0 16px 0 10px;
      gap: 10px;
    }

    #drift-pill.minimized .drift-icon {
      width: 22px;
      height: 22px;
    }

    #drift-pill.minimized .drift-time {
      font-size: 16px;
      font-weight: 600;
      color: var(--pill-text);
      line-height: 1;
    }

    #drift-pill.minimized .drift-domain,
    #drift-pill.minimized .drift-btn {
      display: none !important;
    }

    /* 2. MAXIMIZED: Favicon, Time, Domain, Pause & Chevron */
    #drift-pill.maximized {
      height: 52px;
      padding: 0 16px 0 12px;
      gap: 12px;
    }

    #drift-pill.maximized .drift-icon {
      width: 26px;
      height: 26px;
    }

    #drift-pill.maximized .drift-time {
      font-size: 17px;
      font-weight: 600;
      color: var(--pill-text);
      line-height: 1.1;
    }

    #drift-pill.maximized .drift-domain {
      display: block;
    }

    #drift-pill.maximized .drift-btn {
      display: flex;
    }

    /* Favicon */
    .drift-icon {
      border-radius: 5px;
      background: var(--pill-icon-bg);
      padding: 2px;
      object-fit: contain;
      flex-shrink: 0;
      transition: width 0.2s, height 0.2s;
    }

    /* Text Container */
    .drift-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .drift-time {
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
      transition: font-size 0.2s ease, color 0.2s ease;
    }

    #drift-pill.paused .drift-time {
      color: var(--pill-paused);
    }

    /* Domain Link */
    .drift-domain {
      font-size: 11px;
      font-weight: 500;
      color: var(--pill-muted);
      text-decoration: none;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.15;
      transition: color 0.15s ease;
    }

    .drift-domain:hover {
      color: var(--pill-text);
      text-decoration: underline;
    }

    /* Action Buttons */
    .drift-btn {
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      border-radius: 8px;
      transition: all 0.15s ease;
    }

    .drift-pause {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--pill-btn-bg);
      color: var(--pill-btn-color);
      font-size: 10px;
      font-weight: 600;
    }

    .drift-pause:hover {
      background: var(--pill-btn-hover);
    }

    .drift-pause.paused {
      background: var(--pill-paused-bg);
      color: var(--pill-paused);
    }

    .drift-toggle {
      width: 20px;
      height: 28px;
      color: var(--pill-chevron);
    }

    .drift-toggle:hover {
      color: var(--pill-text);
    }

    .drift-toggle svg {
      transform: rotate(180deg);
      transition: transform 0.2s ease;
    }

    .drift-hidden {
      display: none !important;
    }
  `;

  shadow.appendChild(style);

  // --- CLEAN MINIMAL PILL DOM ---
  const pill = document.createElement("div");
  pill.id = "drift-pill";
  pill.className = "corner-top-right minimized";
  pill.setAttribute("role", "button");
  pill.setAttribute("tabindex", "0");
  pill.title = "Drift: Click to expand, drag to move";

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${currentDomain}&sz=32`;

  pill.innerHTML = `
    <img id="drift-favicon" class="drift-icon" src="${faviconUrl}" alt="" />
    <div class="drift-text">
      <span id="drift-time" class="drift-time">00:00</span>
      <a id="drift-domain" class="drift-domain" href="${location.href}" target="_blank" title="${currentDomain}">
        ${currentDomain}
      </a>
    </div>
    <button id="drift-pause-btn" class="drift-btn drift-pause" title="Pause / Resume tracking">❚❚</button>
    <button id="drift-toggle-btn" class="drift-btn drift-toggle" title="Collapse">
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  shadow.appendChild(pill);

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
  const timeEl = shadow.getElementById("drift-time");
  const pauseBtn = shadow.getElementById("drift-pause-btn");
  const toggleBtn = shadow.getElementById("drift-toggle-btn");
  const domainLink = shadow.getElementById("drift-domain");

  // --- CORNER DOCKING ---
  function setCorner(corner, save = true) {
    currentCorner = corner;
    pill.classList.remove("corner-top-right", "corner-top-left", "corner-bottom-right", "corner-bottom-left");
    pill.classList.add(`corner-${corner}`);

    pill.style.left = "";
    pill.style.top = "";
    pill.style.right = "";
    pill.style.bottom = "";

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
      pill.classList.remove("minimized");
      pill.classList.add("maximized");
      pill.title = "Drift: Click to collapse, drag to move";
    } else {
      pill.classList.remove("maximized");
      pill.classList.add("minimized");
      pill.title = "Drift: Click to expand, drag to move";
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
  pill.addEventListener("click", (e) => {
    if (hasDragged) return;
    if (e.target.closest("#drift-pause-btn") || e.target.closest("#drift-domain")) return;

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

  // Close when clicking outside if maximized
  window.addEventListener("mousedown", (e) => {
    if (!isMaximized) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(pill)) {
      setMaximized(false, true);
    }
  });

  // --- DRAGGING & MAGNETIC CORNER SNAPPING ---
  pill.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("#drift-pause-btn") || e.target.closest("#drift-toggle-btn") || e.target.closest("#drift-domain")) return;

    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = pill.getBoundingClientRect();
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
      pill.classList.add("drift-dragging");
    }

    if (hasDragged) {
      const width = pill.offsetWidth || 140;
      const height = pill.offsetHeight || 42;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const margin = 10;
      newLeft = Math.max(margin, Math.min(window.innerWidth - width - margin, newLeft));
      newTop = Math.max(margin, Math.min(window.innerHeight - height - margin, newTop));

      pill.style.left = `${newLeft}px`;
      pill.style.top = `${newTop}px`;
      pill.style.right = "auto";
      pill.style.bottom = "auto";
    }
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;

    if (hasDragged) {
      pill.classList.remove("drift-dragging");

      const rect = pill.getBoundingClientRect();
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
    pill.classList.remove("drift-idle");
    clearTimeout(idleTimer);

    if (isDragging || isMaximized) return;

    idleTimer = setTimeout(() => {
      if (!isDragging && !isMaximized) {
        pill.classList.add("drift-idle");
      }
    }, 3500);
  }

  window.addEventListener("mousemove", resetIdle, { passive: true });
  window.addEventListener("scroll", resetIdle, { passive: true });
  window.addEventListener("keydown", resetIdle, { passive: true });
  pill.addEventListener("mouseenter", resetIdle);
  resetIdle();

  // --- PAUSE / RESUME ---
  function updatePauseUI(paused) {
    isPaused = paused;
    if (isPaused) {
      pauseBtn.classList.add("paused");
      pill.classList.add("paused");
      pauseBtn.textContent = "▶";
    } else {
      pauseBtn.classList.remove("paused");
      pill.classList.remove("paused");
      pauseBtn.textContent = "❚❚";
    }
  }

  pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: "DRIFT_TOGGLE_PAUSE" }, (res) => {
      if (res) updatePauseUI(res.isPaused);
    });
  });

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
        pill.classList.add("drift-hidden");
      } else {
        pill.classList.remove("drift-hidden");
      }
      if (s.pillCorner && s.pillCorner !== currentCorner) {
        setCorner(s.pillCorner, false);
      }
    }
  });

  // --- INITIALIZATION ---
  function init() {
    chrome.runtime.sendMessage({ type: "DRIFT_GET_STATE" }, (state) => {
      if (chrome.runtime.lastError || !state) return;

      domainSeconds = state.domainSeconds || 0;
      timeEl.textContent = formatTime(domainSeconds);
      updatePauseUI(state.isPaused);

      const s = state.settings || {};
      if (s.floatingPill === false) {
        pill.classList.add("drift-hidden");
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
