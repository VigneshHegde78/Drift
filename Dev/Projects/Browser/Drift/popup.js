// Drift - Mindful Browsing
// Popup Dashboard: Daily & Weekly Analytics, Highlights & Settings

"use strict";

let currentRange = "today"; // "today" | "week" | "all"
let cachedData = null;
let cachedSettings = null;
let showAllSites = false;

// DOM Elements
const viewDashboard = document.getElementById("view-dashboard");
const viewSettings = document.getElementById("view-settings");
const btnOpenSettings = document.getElementById("btn-open-settings");
const btnBackSettings = document.getElementById("btn-back-settings");
const tabButtons = document.querySelectorAll(".tab-btn");

const heroTotalTime = document.getElementById("hero-total-time");
const barsContainer = document.getElementById("bars-container");
const statSwipesVal = document.getElementById("stat-swipes-val");
const statFocusVal = document.getElementById("stat-focus-val");
const sitesListContainer = document.getElementById("sites-list-container");
const btnSeeAll = document.getElementById("btn-see-all");

const toggleFloatingPill = document.getElementById("toggle-floating-pill");
const toggleIdleDetection = document.getElementById("toggle-idle-detection");
const btnDataSetting = document.getElementById("btn-data-setting");
const dataActionsBox = document.getElementById("data-actions-box");
const btnResetToday = document.getElementById("btn-reset-today");
const btnClearAll = document.getElementById("btn-clear-all");

// Format helpers
function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "0m";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${totalSeconds}s`;
}

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function getWeekDateKeys() {
  const dates = [];
  const now = new Date();
  // Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = now.getDay();
  // Distance from Monday (1)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toLocaleDateString("en-CA"));
  }
  return dates;
}

// Fetch dashboard state from background
async function loadDashboard() {
  chrome.runtime.sendMessage({ type: "DRIFT_GET_DASHBOARD" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      console.warn("Drift: Unable to connect to background worker.");
      return;
    }

    cachedData = response.data || { days: {} };
    cachedSettings = response.settings || {};

    updateSettingsUI();
    renderView();
  });
}

function updateSettingsUI() {
  if (!cachedSettings) return;
  toggleFloatingPill.checked = cachedSettings.floatingPill !== false;
  toggleIdleDetection.checked = cachedSettings.idleDetection !== false;
}

function renderView() {
  if (!cachedData) return;

  const todayKey = getTodayKey();
  const weekKeys = getWeekDateKeys();

  let targetTotalSec = 0;
  let targetFocusSec = 0;
  let targetSwipes = 0;
  let aggregatedDomains = {}; // { [domain]: seconds }

  if (currentRange === "today") {
    const todayData = cachedData.days?.[todayKey] || { totalSeconds: 0, focusSeconds: 0, swipes: 0, domains: {} };
    targetTotalSec = todayData.totalSeconds || 0;
    targetFocusSec = todayData.focusSeconds || 0;
    targetSwipes = todayData.swipes || 0;

    for (const [dom, stats] of Object.entries(todayData.domains || {})) {
      aggregatedDomains[dom] = stats.seconds || 0;
    }
  } else if (currentRange === "week") {
    for (const key of weekKeys) {
      const dayData = cachedData.days?.[key];
      if (dayData) {
        targetTotalSec += dayData.totalSeconds || 0;
        targetFocusSec += dayData.focusSeconds || 0;
        targetSwipes += dayData.swipes || 0;

        for (const [dom, stats] of Object.entries(dayData.domains || {})) {
          aggregatedDomains[dom] = (aggregatedDomains[dom] || 0) + (stats.seconds || 0);
        }
      }
    }
  } else {
    // All time
    for (const dayData of Object.values(cachedData.days || {})) {
      targetTotalSec += dayData.totalSeconds || 0;
      targetFocusSec += dayData.focusSeconds || 0;
      targetSwipes += dayData.swipes || 0;

      for (const [dom, stats] of Object.entries(dayData.domains || {})) {
        aggregatedDomains[dom] = (aggregatedDomains[dom] || 0) + (stats.seconds || 0);
      }
    }
  }

  // Update Hero & Cards
  heroTotalTime.textContent = formatDuration(targetTotalSec);
  statSwipesVal.textContent = `${targetSwipes} swipes`;
  statFocusVal.textContent = formatDuration(targetFocusSec);

  // Render Bar Chart (7 days)
  renderWeeklyChart(weekKeys, todayKey);

  // Render Top Websites
  renderTopWebsites(aggregatedDomains);
}

// Render 7-day Weekly Bar Chart
function renderWeeklyChart(weekKeys, todayKey) {
  barsContainer.innerHTML = "";
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Find max time for chart scaling
  let maxSec = 1;
  const dayTotals = weekKeys.map((key) => {
    const total = cachedData?.days?.[key]?.totalSeconds || 0;
    if (total > maxSec) maxSec = total;
    return total;
  });

  weekKeys.forEach((key, index) => {
    const isToday = key === todayKey;
    const totalSec = dayTotals[index];
    const percentage = Math.max(8, Math.round((totalSec / maxSec) * 58)); // 8px min, 58px max

    const col = document.createElement("div");
    col.className = `chart-col ${isToday ? "active" : ""}`;
    col.title = `${dayNames[index]} (${key}): ${formatDuration(totalSec)}`;

    col.innerHTML = `
      <div class="chart-bar-track">
        <div class="chart-bar" style="height: ${percentage}px"></div>
      </div>
      <span class="chart-label">${isToday ? "Today" : dayNames[index]}</span>
    `;

    col.addEventListener("click", () => {
      document.querySelectorAll(".chart-col").forEach((c) => c.classList.remove("active"));
      col.classList.add("active");
    });

    barsContainer.appendChild(col);
  });
}

// Render Top Websites List
function renderTopWebsites(domainMap) {
  sitesListContainer.innerHTML = "";

  const sortedDomains = Object.entries(domainMap)
    .filter(([_, sec]) => sec > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedDomains.length === 0) {
    sitesListContainer.innerHTML = `<div class="empty-state">No browsing recorded yet for this period.</div>`;
    btnSeeAll.style.display = "none";
    return;
  }

  const maxDomainSec = sortedDomains[0][1] || 1;
  const displayLimit = showAllSites ? sortedDomains.length : 4;
  const domainsToRender = sortedDomains.slice(0, displayLimit);

  domainsToRender.forEach(([domain, sec]) => {
    const barWidth = Math.max(5, Math.round((sec / maxDomainSec) * 100));
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    const row = document.createElement("div");
    row.className = "site-row";
    row.innerHTML = `
      <div class="site-favicon-box">
        <img class="site-favicon" src="${faviconUrl}" alt="" />
      </div>
      <div class="site-info-col">
        <div class="site-domain-name" title="${domain}">${domain}</div>
        <div class="site-bar-track">
          <div class="site-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </div>
      <div class="site-time-text">${formatDuration(sec)}</div>
    `;

    sitesListContainer.appendChild(row);
  });

  if (sortedDomains.length > 4) {
    btnSeeAll.style.display = "block";
    btnSeeAll.textContent = showAllSites ? "Show less ↑" : `See all (${sortedDomains.length}) →`;
  } else {
    btnSeeAll.style.display = "none";
  }
}

btnSeeAll.addEventListener("click", () => {
  showAllSites = !showAllSites;
  renderView();
});

// Tab range switcher
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentRange = btn.getAttribute("data-range") || "today";
    renderView();
  });
});

// View Navigation: Dashboard <-> Settings
btnOpenSettings.addEventListener("click", () => {
  viewDashboard.classList.remove("active");
  viewSettings.classList.add("active");
});

btnBackSettings.addEventListener("click", () => {
  viewSettings.classList.remove("active");
  viewDashboard.classList.add("active");
});

// Settings Toggles
toggleFloatingPill.addEventListener("change", (e) => {
  const enabled = e.target.checked;
  chrome.runtime.sendMessage({
    type: "DRIFT_UPDATE_SETTINGS",
    settings: { floatingPill: enabled }
  });
});

toggleIdleDetection.addEventListener("change", (e) => {
  const enabled = e.target.checked;
  chrome.runtime.sendMessage({
    type: "DRIFT_UPDATE_SETTINGS",
    settings: { idleDetection: enabled }
  });
});

// Data actions toggle
btnDataSetting.addEventListener("click", () => {
  dataActionsBox.classList.toggle("visible");
});

btnResetToday.addEventListener("click", () => {
  if (confirm("Reset today's tracking data?")) {
    chrome.runtime.sendMessage({ type: "DRIFT_RESET_TODAY" }, () => {
      loadDashboard();
    });
  }
});

btnClearAll.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all browsing history in Drift? This cannot be undone.")) {
    chrome.runtime.sendMessage({ type: "DRIFT_CLEAR_ALL_DATA" }, () => {
      loadDashboard();
    });
  }
});

// Real-time synchronization while popup is open
setInterval(loadDashboard, 2000);

// Initial Load
loadDashboard();
