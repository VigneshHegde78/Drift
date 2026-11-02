// Drift - Mindful Browsing
// Background Service Worker: Accurate Active Time & Domain Tracking

"use strict";

const DEFAULT_CATEGORIES = {
  "github.com": "productive",
  "gitlab.com": "productive",
  "stackoverflow.com": "productive",
  "docs.google.com": "productive",
  "notion.so": "productive",
  "figma.com": "productive",
  "linear.app": "productive",
  "wikipedia.org": "productive",
  "chatgpt.com": "productive",
  "claude.ai": "productive",
  "medium.com": "productive",
  "dev.to": "productive",
  "youtube.com": "distracting",
  "x.com": "distracting",
  "twitter.com": "distracting",
  "tiktok.com": "distracting",
  "instagram.com": "distracting",
  "reddit.com": "distracting",
  "facebook.com": "distracting",
  "netflix.com": "distracting",
  "twitch.tv": "distracting"
};

const DEFAULT_SETTINGS = {
  floatingPill: true,
  idleDetection: true,
  pillCorner: "top-right",
  pillMinimized: false,
  categories: DEFAULT_CATEGORIES
};

// In-Memory Tracking State
let activeTabId = null;
let activeDomain = null;
let isWindowFocused = true;
let isUserIdle = false;
let isGloballyPaused = false;

let cachedSettings = { ...DEFAULT_SETTINGS };
let bufferedSeconds = {}; // { [domain]: seconds }
let bufferedSwipes = {};  // { [domain]: swipes }

const getTodayKey = () => new Date().toLocaleDateString("en-CA");

function extractDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Load initial settings and data
async function init() {
  try {
    const stored = await chrome.storage.local.get(["drift_settings", "drift_data"]);
    if (stored.drift_settings) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...stored.drift_settings };
    } else {
      await chrome.storage.local.set({ drift_settings: DEFAULT_SETTINGS });
    }

    if (chrome.idle?.setDetectionInterval) {
      chrome.idle.setDetectionInterval(60); // 60s idle threshold
    }

    await updateActiveTab();
  } catch (err) {
    console.error("Drift init error:", err);
  }
}

async function updateActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      activeTabId = tabs[0].id;
      activeDomain = extractDomain(tabs[0].url);
    } else {
      activeTabId = null;
      activeDomain = null;
    }
  } catch {
    activeTabId = null;
    activeDomain = null;
  }
}

// FLUSH BUFFERED SECONDS & SWIPES TO STORAGE
async function flushBuffer() {
  const domainsToFlush = Object.keys(bufferedSeconds);
  const swipesToFlush = Object.keys(bufferedSwipes);

  if (domainsToFlush.length === 0 && swipesToFlush.length === 0) return;

  const currentBufferSec = { ...bufferedSeconds };
  const currentBufferSwipes = { ...bufferedSwipes };
  bufferedSeconds = {};
  bufferedSwipes = {};

  const today = getTodayKey();

  try {
    const stored = await chrome.storage.local.get(["drift_data", `drift-${today}`]);
    const driftData = stored.drift_data || { days: {} };
    if (!driftData.days) driftData.days = {};

    if (!driftData.days[today]) {
      driftData.days[today] = {
        date: today,
        totalSeconds: 0,
        focusSeconds: 0,
        swipes: 0,
        domains: {}
      };
    }

    const dayEntry = driftData.days[today];
    let totalSecAdded = 0;
    let focusSecAdded = 0;

    for (const [dom, sec] of Object.entries(currentBufferSec)) {
      if (!sec) continue;
      if (!dayEntry.domains[dom]) {
        const cat = cachedSettings.categories[dom] || "neutral";
        dayEntry.domains[dom] = { seconds: 0, swipes: 0, category: cat };
      }
      dayEntry.domains[dom].seconds += sec;
      totalSecAdded += sec;

      const category = dayEntry.domains[dom].category || cachedSettings.categories[dom] || "neutral";
      if (category === "productive") {
        focusSecAdded += sec;
      }
    }

    let totalSwipesAdded = 0;
    for (const [dom, count] of Object.entries(currentBufferSwipes)) {
      if (!count) continue;
      if (!dayEntry.domains[dom]) {
        const cat = cachedSettings.categories[dom] || "neutral";
        dayEntry.domains[dom] = { seconds: 0, swipes: 0, category: cat };
      }
      dayEntry.domains[dom].swipes = (dayEntry.domains[dom].swipes || 0) + count;
      totalSwipesAdded += count;
    }

    dayEntry.totalSeconds += totalSecAdded;
    dayEntry.focusSeconds += focusSecAdded;
    dayEntry.swipes = (dayEntry.swipes || 0) + totalSwipesAdded;

    // Backwards-compatible key for legacy popup / storage inspect
    const legacyKey = `drift-${today}`;
    const legacyVal = {
      seconds: dayEntry.totalSeconds,
      swipes: dayEntry.swipes
    };

    await chrome.storage.local.set({
      drift_data: driftData,
      [legacyKey]: legacyVal
    });
  } catch (err) {
    console.error("Drift flush error:", err);
  }
}

// 1-SECOND TRACKING TICK
setInterval(() => {
  const isTrackingAllowed =
    !isGloballyPaused &&
    isWindowFocused &&
    (!cachedSettings.idleDetection || !isUserIdle) &&
    activeDomain;

  if (isTrackingAllowed) {
    bufferedSeconds[activeDomain] = (bufferedSeconds[activeDomain] || 0) + 1;

    // Notify the active tab content script
    if (activeTabId && cachedSettings.floatingPill) {
      chrome.tabs.sendMessage(activeTabId, {
        type: "DRIFT_TICK",
        domain: activeDomain,
        isPaused: isGloballyPaused
      }).catch(() => {
        // Suppress errors when content script isn't listening yet
      });
    }
  }
}, 1000);

// Periodic storage flush every 3 seconds
setInterval(flushBuffer, 3000);

// TAB & WINDOW LISTENERS
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await flushBuffer();
  activeTabId = activeInfo.tabId;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    activeDomain = extractDomain(tab.url);
  } catch {
    activeDomain = null;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    await flushBuffer();
    activeDomain = extractDomain(changeInfo.url);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  isWindowFocused = (windowId !== chrome.windows.WINDOW_ID_NONE);
  if (!isWindowFocused) {
    await flushBuffer();
  } else {
    await updateActiveTab();
  }
});

if (chrome.idle?.onStateChanged) {
  chrome.idle.onStateChanged.addListener(async (newState) => {
    if (cachedSettings.idleDetection) {
      isUserIdle = (newState !== "active");
      if (isUserIdle) {
        await flushBuffer();
      }
    }
  });
}

// MESSAGE HANDLER FOR POPUP AND CONTENT SCRIPTS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DRIFT_GET_STATE") {
    const today = getTodayKey();
    chrome.storage.local.get(["drift_data", "drift_settings"]).then((res) => {
      const data = res.drift_data?.days?.[today] || { totalSeconds: 0, focusSeconds: 0, swipes: 0, domains: {} };
      const domSec = (data.domains?.[activeDomain]?.seconds || 0) + (bufferedSeconds[activeDomain] || 0);
      const domSwipes = (data.domains?.[activeDomain]?.swipes || 0) + (bufferedSwipes[activeDomain] || 0);

      sendResponse({
        activeDomain: activeDomain || "",
        domainSeconds: domSec,
        domainSwipes: domSwipes,
        totalSeconds: data.totalSeconds + Object.values(bufferedSeconds).reduce((a, b) => a + b, 0),
        totalSwipes: data.swipes + Object.values(bufferedSwipes).reduce((a, b) => a + b, 0),
        isPaused: isGloballyPaused,
        settings: cachedSettings
      });
    });
    return true; // Keep sendResponse open for async
  }

  if (message.type === "DRIFT_GET_DASHBOARD") {
    flushBuffer().then(async () => {
      const res = await chrome.storage.local.get(["drift_data", "drift_settings"]);
      sendResponse({
        data: res.drift_data || { days: {} },
        settings: cachedSettings,
        isPaused: isGloballyPaused,
        activeDomain: activeDomain || ""
      });
    });
    return true;
  }

  if (message.type === "DRIFT_RECORD_SWIPE") {
    const domain = message.domain || activeDomain;
    if (domain) {
      bufferedSwipes[domain] = (bufferedSwipes[domain] || 0) + 1;
      flushBuffer();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "DRIFT_TOGGLE_PAUSE") {
    isGloballyPaused = !isGloballyPaused;
    sendResponse({ isPaused: isGloballyPaused });
    return true;
  }

  if (message.type === "DRIFT_UPDATE_SETTINGS") {
    cachedSettings = { ...cachedSettings, ...message.settings };
    chrome.storage.local.set({ drift_settings: cachedSettings }).then(() => {
      sendResponse({ success: true, settings: cachedSettings });
    });
    return true;
  }

  if (message.type === "DRIFT_RESET_TODAY") {
    bufferedSeconds = {};
    bufferedSwipes = {};
    const today = getTodayKey();
    chrome.storage.local.get("drift_data").then(async (res) => {
      const driftData = res.drift_data || { days: {} };
      delete driftData.days[today];
      await chrome.storage.local.set({
        drift_data: driftData,
        [`drift-${today}`]: { seconds: 0, swipes: 0 }
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "DRIFT_CLEAR_ALL_DATA") {
    bufferedSeconds = {};
    bufferedSwipes = {};
    chrome.storage.local.remove(["drift_data"]).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

init();

