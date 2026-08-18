# The Keepsake Box

An interactive lovebox — a wooden box with a heart that has moods. Send **notes**, **doodles** and **secrets** to someone you love, from anywhere. It grew out of the original [Lovebox](https://en.lovebox.love/) idea, reimagined as a hand-crafted web experience.

Scan the QR code on the box's share card → send a note → the heart on their box spins → they open the lid to read it, and spin the heart back to make hearts fly on your phone.

## What makes it special

- **A heart with a personality.** A hand-drawn pixel heart (rendered on canvas) with moods: a gentle idle beat, an ecstatic spin when a note arrives, sleepy pulsing at night, and a lonely sway when no one has opened the box for a while. Read its feelings through motion alone.
- **The secret knock.** Tap the lid in a rhythm (recorded by *you*) to unlock a hidden private drawer where sealed secrets wait.
- **The Keeper's diary.** The box writes its own little diary of moments — auto-composed from real events, in a *poetic* or *playful* voice of your choosing.
- **The trinket drawer.** Senders tuck in pixel-art treasures — a star, a paper crane, a shell — that accumulate like keepsakes.
- **The garden.** A tiny plant inside the box grows with every note, doodle and trinket exchanged.
- **Three note styles.** Handwritten letters, pixel doodles, and *sealed notes* that reveal letter-by-letter as the heart is spun.
- **Deep customization.** Wood finish (Walnut / Cherry / Bamboo / fully custom tint), accent color, heart color, box name, the Keeper's name, chime style, interior light, knock pattern and diary voice — all tuned live from the box.
- **Procedural sound.** Everything (knocks, the hinge, chimes, hearts-burst sparkle) is synthesized with WebAudio. No audio files.
- **Mobile-first + QR.** Designed for a phone held in one hand. The box generates its own QR code so senders pair with a single scan, and can print a gift card to tuck inside a physical box.

## Run it locally

```bash
npm install
npm start
```

Then open <http://localhost:3000>. First visit names the box and creates it. To send from another device on the same network, open the box's **share** card and scan the QR (or open `/send.html?box=CODE`).

- The box page keeps its code in `localStorage` — no accounts, no passwords. The code *is* the key.
- Data lives in `data/boxes.json` (auto-created, gitignored).
- Node 18+.

## Deploy to the internet (free, no credit card needed)

The box is designed to run on any Node host. It binds `process.env.PORT` and exposes a `/health` endpoint for keep-alives.

### Option A — Koyeb (recommended, usually no credit card)

1. Push this repo to GitHub.
2. Create a free account at [koyeb.com](https://koyeb.com) (no card required for most regions).
3. **Create Service → Web Service → connect your GitHub repo.**
4. Builder picks the `Dockerfile` — none is present, so choose **Buildpack** (or Nixpacks). Keep the defaults:
   - Build command: `npm install`
   - Run command: `npm start`
   - Exposed port: `3000`
5. Deploy. You get `https://<service>.koyeb.app` with HTTPS automatically.

> **Keep it awake.** The Koyeb free tier can scale the instance to zero after ~1 hour without traffic (a 1–5 s wake on the next request). Add a free ping from [UptimeRobot](https://uptimerobot.com) (HTTP monitor on `https://<service>.koyeb.app/health`, every 30 minutes) and the box stays warm. The `/health` endpoint is already there for exactly this.

### Option B — Render (also free; requires a card to verify identity)

1. Push to GitHub → [render.com](https://render.com) → **New → Web Service** → connect repo.
2. Build: `npm install` · Start: `npm start`.
3. Free tier spins down after 15 idle minutes, so add the same UptimeRobot ping to `/health`. The free allowance (~750 instance-hours/mo) covers continuous uptime.

### Upgrading later

The code is host-agnostic: move the same repo to Railway (paid, ~$5/mo), Fly.io, or any VPS — nothing changes except the URL. Your QR codes are generated client-side, so they always point at whichever host the box is served from.

## How it works

```
public/            hand-written front-end, no framework, no build step
  index.html       the box (receiver)
  send.html        the sender page (QR target)
  js/              heart, box, messages, trinkets, garden, diary,
                   theme, settings, share, sound (WebAudio), net (WS)
  fonts/           Caveat handwriting font, bundled (OFL)
server.js          Express + WebSocket + JSON-file store
data/              boxes.json (auto-created, gitignored)
```

- **Realtime:** one WebSocket per box. Senders and the box exchange `note`, `trinket`, `spin`, `read`, `presence` events; the box broadcasts live to everyone paired with it.
- **The magic of "kept" notes:** any note can be *kept*, preserving it forever in a stash inside the box.
- **Secrets:** sealed notes go to a separate drawer the server never returns in the public box payload — the drawer endpoint only opens it.

## Notes

- The heart, trinkets and garden are original pixel art defined as small string grids — easy to redraw if you want your own.
- Everything is self-contained: fonts and the QR library are bundled locally (no CDN), so the box works on a private network too.
- Say the word on a gift: name the box, write the first note, print the gift card, ship a physical box with the QR tucked inside.