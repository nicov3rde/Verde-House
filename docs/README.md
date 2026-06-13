# Verde House Productions — Component Docs

---

## clip-bot
**Path:** `verde-house/clip-bot/`
**Status:** Built

Takes long-form video input and outputs short-form clips ready for TikTok, Reels, and YouTube Shorts. Built on vinci-clips, rebranded as Verde Bot. Uses Whisper for local transcription, Gemini AI for clip scoring and analysis, and FFmpeg for vertical formatting and caption burning.

**Run:**
```bash
# Backend (port 8080)
cd clip-bot/backend
npm start

# Frontend (port 3000)
cd clip-bot/frontend
npm run dev
```

**Requires:** `GEMINI_API_KEY` in `clip-bot/backend/.env`

---

## auto-poster
**Path:** `verde-house/auto-poster/`
**Status:** Empty — pending

n8n workflow that watches a folder for finished clips and automatically posts them to TikTok, Instagram Reels, and YouTube Shorts using Blotato. Handles scheduling, caption generation, and cross-platform distribution with no manual steps. Config files and workflow JSON exports live here.

---

## consumer-app
**Path:** `verde-house/consumer-app/`
**Status:** Empty — pending

Web app for the consumer side of the platform. Users sign up, browse active brand campaigns, record or upload a short video sharing their opinion, get verified by a bot for quality and authenticity, and receive automatic payout. The "get paid to post" layer of Verde House.

---

## verde-dashboard
**Path:** `verde-house/verde-dashboard/`
**Status:** Empty — pending

Main command center for Verde House operators. Manages all campaigns, clients, clip pipelines, posting schedules, and analytics in one place. The SaaS control layer that sits above clip-bot, auto-poster, and consumer-app.

---

## Quick Reference

```
verde-house/
├── clip-bot/          AI clip generation        → built, run with npm start
├── auto-poster/       n8n posting automation    → pending
├── consumer-app/      Earn-to-post user app     → pending
├── verde-dashboard/   Operator SaaS dashboard   → pending
└── docs/              This file
```
