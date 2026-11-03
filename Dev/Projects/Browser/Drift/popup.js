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
const statFocusVal = document.getElementById("stat-focus-val");
const statDistCardVal = document.getElementById("stat-dist-card-val");
const sitesListContainer = document.getElementById("sites-list-container");
const btnSeeAll = document.getElementById("btn-see-all");

// Category Breakdown Elements
const statusIndicator = document.getElementById("status-indicator");
const breakdownLabel = document.getElementById("breakdown-label");
const breakdownRatio = document.getElementById("breakdown-ratio");
const segProductive = document.getElementById("seg-productive");
const segDistracting = document.getElementById("seg-distracting");
const segNeutral = document.getElementById("seg-neutral");
const txtProdTime = document.getElementById("txt-prod-time");
const txtDistTime = document.getElementById("txt-dist-time");
const txtNeutTime = document.getElementById("txt-neut-time");

// Settings Elements
const toggleFloatingPill = document.getElementById("toggle-floating-pill");
const toggleIdleDetection = document.getElementById("toggle-idle-detection");
const btnDataSetting = document.getElementById("btn-data-setting");
const dataActionsBox = document.getElementById("data-actions-box");
const btnResetToday = document.getElementById("btn-reset-today");
const btnClearAll = document.getElementById("btn-clear-all");

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
  const dayOfWeek = now.getDay();
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

function getDomainCategory(domain) {
  if (cachedSettings?.categories?.[domain]) {
    return cachedSettings.categories[domain];
  }
  if (/github|gitlab|stackoverflow|notion|figma|linear|jira|slack|chatgpt|claude|gemini|wiki/i.test(domain)) {
    return "productive";
  }
  if (/youtube|tiktok|instagram|twitter|x\.com|reddit|facebook|netflix|twitch/i.test(domain)) {
    return "distracting";
  }
  return "neutral";
}

// Fetch dashboard state from background
async function loadDashboard() {
  chrome.runtime.sendMessage({ type: "DRIFT_GET_DASHBOARD" }, (response) => {
    if (chrome.runtime.lastError || !response) return;

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
  let aggregatedDomains = {}; // { [domain]: { seconds, category } }

  let prodSeconds = 0;
  let distSeconds = 0;
  let neutSeconds = 0;

  function processDayEntry(dayData) {
    if (!dayData) return;
    targetTotalSec += dayData.totalSeconds || 0;

    for (const [dom, stats] of Object.entries(dayData.domains || {})) {
      const sec = stats.seconds || 0;
      const cat = getDomainCategory(dom);

      if (!aggregatedDomains[dom]) {
        aggregatedDomains[dom] = { seconds: 0, category: cat };
      }
      aggregatedDomains[dom].seconds += sec;
      aggregatedDomains[dom].category = cat;

      if (cat === "productive") prodSeconds += sec;
      else if (cat === "distracting") distSeconds += sec;
      else neutSeconds += sec;
    }
  }

  if (currentRange === "today") {
    processDayEntry(cachedData.days?.[todayKey]);
  } else if (currentRange === "week") {
    for (const key of weekKeys) {
      processDayEntry(cachedData.days?.[key]);
    }
  } else {
    for (const dayData of Object.values(cachedData.days || {})) {
      processDayEntry(dayData);
    }
  }

  // Update Hero & Highlight Cards
  heroTotalTime.textContent = formatDuration(targetTotalSec);
  statFocusVal.textContent = formatDuration(prodSeconds);
  statDistCardVal.textContent = formatDuration(distSeconds);

  // Update Category Breakdown
  renderCategoryBreakdown(prodSeconds, distSeconds, neutSeconds, targetTotalSec);

  // Render Bar Chart (7 days)
  renderWeeklyChart(weekKeys, todayKey);

  // Render Top Websites
  renderTopWebsites(aggregatedDomains);
}

// Render Category Breakdown (Productive, Distracting, Neutral)
function renderCategoryBreakdown(prodSec, distSec, neutSec, totalSec) {
  txtProdTime.textContent = formatDuration(prodSec);
  txtDistTime.textContent = formatDuration(distSec);
  txtNeutTime.textContent = formatDuration(neutSec);

  if (totalSec === 0) {
    breakdownLabel.textContent = "No Activity";
    breakdownRatio.textContent = "0%";
    statusIndicator.className = "status-indicator neutral";
    segProductive.style.width = "0%";
    segDistracting.style.width = "0%";
    segNeutral.style.width = "0%";
    return;
  }

  const prodPct = Math.round((prodSec / totalSec) * 100);
  const distPct = Math.round((distSec / totalSec) * 100);
  const neutPct = Math.max(0, 100 - prodPct - distPct);

  segProductive.style.width = `${prodPct}%`;
  segDistracting.style.width = `${distPct}%`;
  segNeutral.style.width = `${neutPct}%`;

  if (prodSec >= distSec && prodSec >= neutSec && prodSec > 0) {
    breakdownLabel.textContent = "Mostly Productive";
    breakdownRatio.textContent = `${prodPct}%`;
    statusIndicator.className = "status-indicator";
  } else if (distSec >= prodSec && distSec >= neutSec && distSec > 0) {
    breakdownLabel.textContent = "Mostly Distracting";
    breakdownRatio.textContent = `${distPct}%`;
    statusIndicator.className = "status-indicator distracting";
  } else {
    breakdownLabel.textContent = "Mostly Neutral";
    breakdownRatio.textContent = `${neutPct}%`;
    statusIndicator.className = "status-indicator neutral";
  }
}

// Render 7-day Weekly Bar Chart (Aligned Uniform Columns)
function renderWeeklyChart(weekKeys, todayKey) {
  barsContainer.innerHTML = "";
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  let maxSec = 1;
  const dayTotals = weekKeys.map((key) => {
    const total = cachedData?.days?.[key]?.totalSeconds || 0;
    if (total > maxSec) maxSec = total;
    return total;
  });

  weekKeys.forEach((key, index) => {
    const isToday = key === todayKey;
    const totalSec = dayTotals[index];
    const percentage = Math.max(6, Math.round((totalSec / maxSec) * 52));

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

// Render Top Websites List with Interactive Category Badges
function renderTopWebsites(domainMap) {
  sitesListContainer.innerHTML = "";

  const sortedDomains = Object.entries(domainMap)
    .filter(([_, data]) => data.seconds > 0)
    .sort((a, b) => b[1].seconds - a[1].seconds);

  if (sortedDomains.length === 0) {
    sitesListContainer.innerHTML = `<div class="empty-state">No browsing recorded yet for this period.</div>`;
    btnSeeAll.style.display = "none";
    return;
  }

  const maxDomainSec = sortedDomains[0][1].seconds || 1;
  const displayLimit = showAllSites ? sortedDomains.length : 4;
  const domainsToRender = sortedDomains.slice(0, displayLimit);

  domainsToRender.forEach(([domain, data]) => {
    const sec = data.seconds;
    const category = data.category || "neutral";
    const barWidth = Math.max(5, Math.round((sec / maxDomainSec) * 100));
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    const row = document.createElement("div");
    row.className = "site-row";
    row.innerHTML = `
      <img class="site-icon" src="${faviconUrl}" alt="" />
      <div class="site-meta">
        <div class="site-title-row">
          <span class="site-name" title="${domain}">${domain}</span>
          <span class="site-category-tag ${category}" title="Click to change category">${category}</span>
        </div>
        <div class="site-bar-track">
          <div class="site-bar-fill" style="width: ${barWidth}%;"></div>
        </div>
      </div>
      <span class="site-time">${formatDuration(sec)}</span>
    `;

    // Interactive category switcher: cycle productive -> distracting -> neutral
    const tagEl = row.querySelector(".site-category-tag");
    tagEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextCategory =
        category === "productive"
          ? "distracting"
          : category === "distracting"
          ? "neutral"
          : "productive";

      chrome.runtime.sendMessage(
        {
          type: "DRIFT_SET_CATEGORY",
          domain,
          category: nextCategory
        },
        () => {
          loadDashboard();
        }
      );
    });

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

// Navigation: Dashboard <-> Settings
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
