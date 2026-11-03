# Drift — Mindful Browsing

> **See where your time goes. Decide where it should go.**

Drift is a lightweight, mindful browser extension that helps you track your screen time across all websites, automatically categorizes your browsing into **Productive**, **Distracting**, and **Neutral**, and provides a floating translucent glass pill on your active tab.

---

## Features

### 1. Large, Glancable Floating Pill
- **Minimized State (Default)**:
  - Generously sized (46px height), comfortable, and easy to read.
  - Large **18px bold** active domain timer with live site favicon (`[ Favicon ] 24:38`).
- **Maximized State (on Click)**:
  - Expands smoothly (58px height) to show:
    - **Website Icon**
    - **Bold 19px Timer**
    - **Domain Link** (`youtube.com`)
    - **Pause / Resume Button** (`❚❚` / `▶`)
    - **Collapse Chevron** (`⌄`)
- **System-Themed Translucency**:
  - Automatically switches between frosted dark glass (`rgba(15, 23, 42, 0.84)`) and frosted light glass (`rgba(255, 255, 255, 0.85)`) with `backdrop-filter: blur(20px)`.
- **Draggable & Corner Docking**: Drag anywhere on screen; magnetically snaps to `top-right`, `top-left`, `bottom-right`, or `bottom-left`.
- **Smart Idle Dimming**: Dims to 45% opacity when inactive and restores to 100% on hover.

### 2. Website Categorization & "Where Time Was Spent"
- **Category Breakdown Bar**:
  - Multi-segment progress bar showing your browsing distribution:
    - 🟢 **Productive** (`#10B981`)
    - 🔴 **Distracting** (`#EF4444`)
    - ⚪ **Neutral** (`#94A3B8`)
  - Summary headline indicating where your time was mostly spent (e.g., **`Mostly Productive • 68%`** or **`Mostly Distracting • 72%`**).
- **Interactive 1-Click Category Switching**:
  - In the **Top Websites** list, every site displays an interactive category badge (`[ productive ]`, `[ distracting ]`, `[ neutral ]`).
  - Click any badge to cycle its category and watch your focus metrics update live.
- **Smart Built-in Classifier**:
  - Automatically classifies developer tools, work suites, documentation, AI tools, social networks, and video platforms.

### 3. Aligned 7-Day Weekly Chart & Dashboard
- **Uniform Column Baseline**: Clean, pixel-perfect 7-day bar chart (`Mon` through `Today`) where all day labels and bars share the exact same horizontal baseline.
- **System-Themed Translucent Cards**: The entire popup adapts to light and dark modes with frosted glass aesthetics.
- **Highlight Cards**: Side-by-side **Focus time** and **Distracting time** counters.
- **Settings**: Toggle floating pill, toggle idle detection, and manage local data.

---

## How to Test / Reload

1. Navigate to `chrome://extensions/` in your browser.
2. Click the **reload** icon on **Drift**.
3. Visit any website (e.g. GitHub or YouTube):
   - Notice the larger, easily visible floating pill with bold 18px time.
   - Click it to expand and view the domain link and pause button.
4. Click the Drift toolbar icon to view your system-themed translucent dashboard, category breakdown, and aligned weekly chart.
