# Drift — Mindful Browsing

> **See where your time goes. Decide where it should go.**

Drift is a lightweight, mindful browser extension crafted with a calm, subtle aesthetic (no harsh neon, no AI-style glows). It tracks your active screen time across websites, automatically categorizes your browsing into **Productive**, **Distracting**, and **Neutral**, and provides a floating translucent glass pill on your active tab.

---

## Design Philosophy: Subtle & Grounded

- **Zero Neon / Non-AI Feel**: Stripped of hyper-saturated cobalt blues, electric glowing shadows, and artificial saturations.
- **Natural, Human-Crafted Palette**:
  - **Light Theme**: Soft off-white canvas (`#FAFAFA`), natural white cards with delicate ambient shadows, charcoal text (`#18181B`), and subtle zinc accents.
  - **Dark Theme**: Deep matte obsidian (`#121214`), elevated graphite cards, and soft warm text (`#F4F4F5`).
  - **Organic Category Accents**: Subdued emerald sage for Productive, muted rose for Distracting, and warm slate for Neutral.
- **Native Typography**: Native system typography stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) with balanced letter-spacing and tabular numbers.

---

## Features

### 1. Subtle, Clean Floating Pill
- **Minimized State (Default)**:
  - Clean, tactile floating pill (42px height).
  - Clear **16px semibold** active domain timer with live site favicon (`[ Favicon ] 24:38`).
- **Maximized State (on Click)**:
  - Expands smoothly (52px height) to show:
    - **Website Icon**
    - **17px Timer**
    - **Domain Link** (`youtube.com`)
    - **Pause / Resume Button** (`❚❚` / `▶`)
    - **Collapse Chevron** (`⌄`)
- **System-Themed Translucency**:
  - Automatically switches between frosted dark glass (`rgba(24, 24, 27, 0.88)`) and frosted light glass (`rgba(255, 255, 255, 0.92)`) with `backdrop-filter: blur(12px)`.
- **Draggable & Corner Docking**: Drag anywhere on screen; magnetically snaps to `top-right`, `top-left`, `bottom-right`, or `bottom-left`.
- **Gentle Idle State**: Dims softly when inactive and restores on hover.

### 2. Website Categorization & "Where Time Was Spent"
- **Slim Category Breakdown Bar**:
  - 5px slim multi-segment progress bar showing your browsing distribution:
    - 🟢 **Productive** (`#15803D` / sage)
    - 🔴 **Distracting** (`#BE123C` / rose)
    - ⚪ **Neutral** (`#64748B` / slate)
  - Natural summary headline indicating where your time was mostly spent (e.g., **`Mostly Productive • 68%`**).
- **Interactive 1-Click Category Switching**:
  - In the **Top Websites** list, every site displays an interactive category badge (`[ productive ]`, `[ distracting ]`, `[ neutral ]`).
  - Click any badge to cycle its category and watch your focus metrics update live.

### 3. Aligned 7-Day Weekly Chart & Dashboard
- **Uniform Column Baseline**: Clean, pixel-perfect 7-day bar chart (`Mon` through `Today`) where all day labels and bars share the exact same horizontal baseline.
- **Highlight Cards**: Side-by-side **Focus time** and **Distracting** counters in understated cards.
- **Settings**: Toggle floating pill, toggle idle detection, and manage local data.

---

## How to Test / Reload

1. Navigate to `chrome://extensions/` in your browser.
2. Click the **reload** icon on **Drift**.
3. Visit any website (e.g. GitHub or YouTube):
   - Notice the subtle, matte floating pill: `[ Favicon ] 00:00`.
   - Click it to expand and view the domain and pause button.
4. Click the Drift toolbar icon to view your subtle, clean dashboard.
