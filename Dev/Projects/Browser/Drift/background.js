// Drift - Mindful Browsing
// Background Service Worker: Accurate Active Time, Categories & Domain Tracking

"use strict";

const DEFAULT_CATEGORIES = {
  // Productive Tools & Knowledge
  "github.com": "productive",
  "gitlab.com": "productive",
  "bitbucket.org": "productive",
  "stackoverflow.com": "productive",
  "stackexchange.com": "productive",
  "codepen.io": "productive",
  "leetcode.com": "productive",
  "hackerrank.com": "productive",
  "docs.google.com": "productive",
  "drive.google.com": "productive",
  "notion.so": "productive",
  "figma.com": "productive",
  "linear.app": "productive",
  "jira.com": "productive",
  "atlassian.net": "productive",
  "slack.com": "productive",
  "trello.com": "productive",
  "asana.com": "productive",
  "wikipedia.org": "productive",
  "chatgpt.com": "productive",
  "claude.ai": "productive",
  "anthropic.com": "productive",
  "gemini.google.com": "productive",
  "medium.com": "productive",
  "dev.to": "productive",
  "developer.mozilla.org": "productive",
  "w3schools.com": "productive",

  // Distracting & Social / Video Feeds
  "youtube.com": "distracting",
  "x.com": "distracting",
  "twitter.com": "distracting",
  "tiktok.com": "distracting",
  "instagram.com": "distracting",
  "reddit.com": "distracting",
  "facebook.com": "distracting",
  "threads.net": "distracting",
  "netflix.com": "distracting",
  "twitch.tv": "distracting",
  "pinterest.com": "distracting",
  "tumblr.com": "distracting",
  "9gag.com": "distracting",
  "buzzfeed.com": "distracting",
  "amazon.com": "distracting",
  "ebay.com": "distracting",
  "steampowered.com": "distracting",

  // Neutral (Search, Utilities, Mail)
  "google.com": "neutral",
  "bing.com": "neutral",
  "duckduckgo.com": "neutral",
  "yahoo.com": "neutral",
  "mail.google.com": "neutral",
  "outlook.com": "neutral"
};

const DEFAULT_SETTINGS = {
  floatingPill: true,
  idleDetection: true,
  pillCorner: "top-right",
  pillMaximized: false,
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

function resolveCategory(domain) {
  if (cachedSettings.categories && cachedSettings.categories[domain]) {
    return cachedSettings.categories[domain];
  }
  if (DEFAULT_CATEGORIES[domain]) {
    return DEFAULT_CATEGORIES[domain];
  }
  if (/github|gitlab|stackoverflow|notion|figma|linear|jira|slack|chatgpt|claude|gemini|wiki/i.test(domain)) {
    return "productive";
  }
  if (/youtube|tiktok|instagram|twitter|reddit|facebook|netflix|twitch/i.test(domain)) {
    return "distracting";
  }
  return "neutral";
}

// Load initial settings and data
async function init() {
  try {
    const stored = await chrome.storage.local.get(["drift_settings", "drift_data"]);
    if (stored.drift_settings) {
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...stored.drift_settings,
        categories: { ...DEFAULT_CATEGORIES, ...(stored.drift_settings.categories || {}) }
      };
    } else {
      await chrome.storage.local.set({ drift_settings: DEFAULT_SETTINGS });
    }

    if (chrome.idle?.setDetectionInterval) {
      chrome.idle.setDetectionInterval(60);
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

// FLUSH BUFFERED SECONDS TO STORAGE
async function flushBuffer() {
  const domainsToFlush = Object.keys(bufferedSeconds);
  if (domainsToFlush.length === 0) return;

  const currentBufferSec = { ...bufferedSeconds };
  bufferedSeconds = {};

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
        domains: {}
      };
    }

    const dayEntry = driftData.days[today];
    let totalSecAdded = 0;
    let focusSecAdded = 0;

    for (const [dom, sec] of Object.entries(currentBufferSec)) {
      if (!sec) continue;
      const cat = dayEntry.domains[dom]?.category || resolveCategory(dom);
      if (!dayEntry.domains[dom]) {
        dayEntry.domains[dom] = { seconds: 0, category: cat };
      }
      dayEntry.domains[dom].seconds += sec;
      dayEntry.domains[dom].category = cat;
      totalSecAdded += sec;

      if (cat === "productive") {
        focusSecAdded += sec;
      }
    }

    dayEntry.totalSeconds += totalSecAdded;
    dayEntry.focusSeconds += focusSecAdded;

    const legacyKey = `drift-${today}`;
    const legacyVal = {
      seconds: dayEntry.totalSeconds
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

    if (activeTabId && cachedSettings.floatingPill) {
      chrome.tabs.sendMessage(activeTabId, {
        type: "DRIFT_TICK",
        domain: activeDomain,
        isPaused: isGloballyPaused
      }).catch(() => {});
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
      const data = res.drift_data?.days?.[today] || { totalSeconds: 0, focusSeconds: 0, domains: {} };
      const domSec = (data.domains?.[activeDomain]?.seconds || 0) + (bufferedSeconds[activeDomain] || 0);

      sendResponse({
        activeDomain: activeDomain || "",
        domainSeconds: domSec,
        totalSeconds: data.totalSeconds + Object.values(bufferedSeconds).reduce((a, b) => a + b, 0),
        isPaused: isGloballyPaused,
        settings: cachedSettings
      });
    });
    return true;
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

  if (message.type === "DRIFT_TOGGLE_PAUSE") {
    isGloballyPaused = !isGloballyPaused;
    sendResponse({ isPaused: isGloballyPaused });
    return true;
  }

  if (message.type === "DRIFT_SET_CATEGORY") {
    const { domain, category } = message;
    if (domain && ["productive", "distracting", "neutral"].includes(category)) {
      cachedSettings.categories = cachedSettings.categories || {};
      cachedSettings.categories[domain] = category;

      chrome.storage.local.get("drift_data").then(async (res) => {
        const driftData = res.drift_data || { days: {} };
        for (const day of Object.values(driftData.days || {})) {
          if (day.domains && day.domains[domain]) {
            day.domains[domain].category = category;
            let newFocus = 0;
            for (const [d, stats] of Object.entries(day.domains)) {
              if (stats.category === "productive") {
                newFocus += stats.seconds || 0;
              }
            }
            day.focusSeconds = newFocus;
          }
        }

        await chrome.storage.local.set({
          drift_settings: cachedSettings,
          drift_data: driftData
        });
        sendResponse({ success: true, settings: cachedSettings });
      });
      return true;
    }
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
    const today = getTodayKey();
    chrome.storage.local.get("drift_data").then(async (res) => {
      const driftData = res.drift_data || { days: {} };
      delete driftData.days[today];
      await chrome.storage.local.set({
        drift_data: driftData,
        [`drift-${today}`]: { seconds: 0 }
      });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "DRIFT_CLEAR_ALL_DATA") {
    bufferedSeconds = {};
    chrome.storage.local.remove(["drift_data"]).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

init();
