# 🎬 Series & Movie Tracker

![Status](https://img.shields.io/badge/status-active-success)
![Version](https://img.shields.io/badge/version-1.16-blue)
![Made with](https://img.shields.io/badge/made%20with-HTML%20%7C%20CSS%20%7C%20JavaScript-orange)
![Creative Commons](https://img.shields.io/badge/license-CC_BY_4.0-red)

---

## 📖 About The Project

**Series & Movie Tracker** is a lightweight, privacy-friendly web application that helps you track your watched, ongoing, and planned **TV series and movies** — all directly in your browser.

No accounts. No servers. No tracking. Everything is stored **locally in your browser**.

Perfect for binge-watchers, movie lovers, and anyone who wants full control over their watch history.

It runs entirely as a set of static files — open the hosted page in your browser (no install, no build step). It can also be installed as a PWA for an app-like, offline experience.

---

## ✨ Features

* 📺 Track **series & movies** separately, with status: Watching / Want to Watch / Completed
* 👤 Up to **5 local user profiles**, each with its own library and stats
* ⏱️ Season & episode progress with a one-tap **"Episode Watched"** that advances you (season rollovers included)
* 🔎 **Smart add** — type a couple of letters and the title, cover, genre, seasons, rating and streaming service are filled in for you (local catalogue + live TVMaze fallback)
* 🛒 **Marketplace** — browse a curated catalogue and add titles (or whole collections) in one click
* 📋 **Watchlist** with drag-to-reorder, plus a **"What tonight?"** random picker (filter by genre / time)
* 📊 **Statistics**, genre breakdown, an activity timeline and a yearly **Year in Review** recap
* ⭐ Personal rating system + IMDb/TMDb rating field, 🏷️ tags & personal notes
* 🔔 Notification calendar for upcoming seasons/episodes
* 🎨 Dark, light & fully **custom themes** (with a color picker), optional gradient text, adjustable view sizes
* 📥 **Export & Import** your data, with optional auto-export
* 📱 Installable **PWA** with offline support

---

## 📡 Supported Streaming Services

Netflix · Disney+ · HBO Max · Prime Video · Hulu · Apple TV+ · Paramount+ · Peacock · Crunchyroll · Custom

---

## 🌍 Tested Browsers

[![Google Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?logo=GoogleChrome&logoColor=white)](#)
[![Firefox](https://img.shields.io/badge/Firefox-FF7139?logo=firefoxbrowser&logoColor=white)](#)
[![Microsoft Edge](https://custom-icon-badges.demolab.com/badge/Microsoft%20Edge-2771D8?logo=edge-white&logoColor=white)](#)
[![Brave](https://img.shields.io/badge/Brave-FB542B?logo=Brave&logoColor=white)](#)
[![Opera GX](https://img.shields.io/badge/Opera%20GX-EE2950?logo=operagx&logoColor=fff)](#)
[![Safari](https://img.shields.io/badge/Safari-006CFF?logo=safari&logoColor=fff)](#)

> ⚠️ **Safari Note:** LocalStorage restrictions may apply.

---

## 🚀 Getting Started

1. Open Series & Movie Tracker in your browser
2. Create your **user profile**
3. Click the **+** button (or **Add Content** in the menu)
4. Choose **Series** or **Movie**, or add from the **Marketplace**
5. Start tracking 🎉

---

## 📦 Data Storage

* All data is stored using **LocalStorage** (per profile)
* No internet connection required for the app itself (the Marketplace catalogue and cover images load from the network)
* Full offline support via the service worker

### 🔐 Backup Recommendation

Use the **Export List** feature regularly to avoid data loss — clearing your browser's site data will erase your library.

---

## 🛠️ Built With

* HTML5
* CSS3
* Vanilla JavaScript
* LocalStorage API
* Service Worker + Web App Manifest (PWA)

---

## 🧩 Project Structure

```
📁 Series-Movie-Tracker
 ├── index.html              # The tracker app
 ├── landing.html            # Marketing / entry landing page
 ├── marketplace.html        # Curated catalogue browser
 ├── marketplace-data.json   # Catalogue data
 ├── app.js                  # App logic
 ├── styles.css              # App styles
 ├── manifest.json           # PWA manifest
 ├── sw.js                   # Service worker (offline + update prompt)
 ├── favicon.png / icon-192.png
 ├── SeriesTracker_Guide.html
 ├── ChangelogSerien.html
 └── Legal.html
```

---

## ❤️ Final Notes

Made with love by **twillightmay & x4ndrrr**.

If you enjoy this project:

* ⭐ Star the repository
* 🐛 Report bugs
* 💡 Suggest features

Happy watching & tracking! 🍿📽️
