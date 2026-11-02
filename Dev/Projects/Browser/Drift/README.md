# Drift — Mindful Browsing

> **See where your time goes. Decide where it should go.**

Drift is a lightweight, mindful browser extension that helps you track your screen time across all websites, stay aware of your short-form video consumption, and view actionable daily and weekly analytics.

---

## Features

### 1. Adaptive Floating Pill (Minimized by Default, Expands on Click)
- **Minimized State**:
  - Super compact and distraction-free: shows only the **website favicon** and **time spent** (`[ Favicon ] 24:38`).
  - Automatically includes a subtle swipe badge (`• 17 swipes`) on short-video feeds.
- **Maximized State (on Click)**:
  - Expands smoothly to reveal:
    - **Website Icon**
    - **Link / Domain** (`youtube.com`)
    - **Time Spent** (`24:38`)
    - **Pause / Resume Button** (`❚❚` / `▶`)
    - **Collapse Chevron** (`⌄`)
  - Clicking the pill again or clicking outside collapses it back to minimized mode.
- **Draggable & Magnetic Corner Snapping**: Drag anywhere in either state; snaps magnetically to `top-right`, `top-left`, `bottom-right`, or `bottom-left` and persists across tabs.
- **Smart Idle Dimming**: Dims to 42% opacity when inactive and restores to 100% on hover.

### 2. Accurate Active Time Tracking Across All Websites
- Automatically tracks time on whatever website you visit.
- **Window & Tab Focus Aware**: Only counts browsing time for the actively focused tab. When you switch tabs or switch desktop applications, tracking automatically pauses.
- **Idle Detection**: Uses Chrome's `idle` API to detect when you step away from your keyboard and mouse (60s threshold), pausing the timer until you return.

### 3. Specialized Shorts & Reels Swipe Counter
- Detects short-form video feeds on **YouTube Shorts**, **Instagram Reels**, and **TikTok**.
- Tracks swipes accurately across video ID changes, keyboard shortcuts (Arrow keys, J/K), and scrolls.
- Displayed on the floating pill and in the dashboard highlight card.

### 4. Daily & Weekly Popup Dashboard
- Designed with **Plus Jakarta Sans** and the **Drift Core Design System** (`#315BDB`, `#E8F0FF`, `#F6F9FF`, `#0F172A`):
  - **Filters**: `Today`, `This Week`, `All Time`.
  - **Hero Metric**: Big total browsing time display (e.g. `2h 14m`).
  - **Interactive Weekly Bar Chart**: 7-day columns (`Mon` through `Today`) with proportional heights and hover tooltips.
  - **Highlight Cards**: `Shorts & Reels` swipe counts and `Focus time` on productive websites.
  - **Top Websites**: Live favicons, domain names, proportional progress bars, and duration.
  - **Settings Subview**: Toggle floating pill, toggle idle detection, and manage local data.

---

## How to Test / Reload

1. Navigate to `chrome://extensions/` in your browser.
2. Click the reload icon on **Drift** (or click **Load unpacked** and select `/home/vhx/Dev/Projects/Browser/Drift`).
3. Visit any website:
   - Notice the compact minimized pill: `[ Website Icon ] 00:00`.
   - Click it to expand and see: `[ Website Icon ] 00:00  domain.com  [❚❚] [⌄]`.
   - Click it again to collapse. Drag it anywhere to test corner docking!
