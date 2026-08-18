# Noelle's Lovebox

A small, romantic web app made for Noelle: a lovebox that collects **notes, sealed secrets, hearts and memories** from the people who love her.

The box opens with an **anniversary letter** — a 4 years & 6 months love note from the one who made it — followed by a note about **lilies**, the sacred flower of ancient Egypt, because to that someone Noelle is sacred and beautiful too. `🤍🌸`

Open the box page and the **first thing you see is a QR code** — scan it with another phone and it takes you straight to the send page. Anyone with the code can send.

## Features

- **QR-first welcome** — the box's share code is the very first screen
- **The anniversary letter** — the first note in the box, the full 4 years & 6 months message, delivered live with a handwritten font
- **The lilies note** — an ancient-Egypt lily fact and a declaration that Noelle is the most beautiful person of all, styled with a lily
- **A date invitation** — an invitation card on the box page: *"Noelle, will you go out with me?"* — no details, just one button. When she taps **yes**, the heart bursts and it's sealed forever
- **Lily motif** — a soft lily blooms in the welcome screen, in the memories header and on the lilies note
- **Memories gallery** — Noelle's photos sit in a polaroid grid; tap one to open a full-screen lightbox
- **Notes** — arrive live, in a handwritten font, with optional photo attachments
- **Sealed secrets** — a sender ticks "seal it"; to read it, tap the wax and the heart spins to break the seal
- **The heart** — spins when a note arrives or when a sender sends a heart; each message grows the box
- **Default box** — the server seeds box `NOELL` on first boot, so the QR is always the first thing that comes out
- **Sender page** (`/send.html?box=CODE`) — note, photo, sealed secret, or a heart; shows if the box owner is online
- One box per code, no accounts. Codes are 5 characters. Notes can be up to 4000 characters.

## Run it

```bash
npm install
npm start
```

Open `http://localhost:3000` — the QR appears first. Scan it from a phone on the same Wi-Fi to test sending.

For LAN testing, set `PUBLIC_URL` (e.g. `http://192.168.1.5:3000`) so the QR points at your machine instead of localhost.

## Deploy for free

The app is a Node/Express server with a WebSocket — it runs on any host that supports Node. **Free tiers sleep after idle minutes** and give you an ephemeral disk, so on most free hosts notes are wiped on redeploy (see *Keep your box alive* below). The QR always points at your live URL, so it keeps working no matter what.

### Render (free) — recommended
1. Push this repo to GitHub (done for you — it's at `https://github.com/kurunami31/Lovebox`).
2. Sign up at [render.com](https://render.com), then **New → Blueprint** — the included `render.yaml` sets everything up (build `npm install`, start `npm start`, port `3000`).
3. Wait for the deploy, then open the `onrender.com` URL — the QR already points there.

### Fly.io (free allowance)
1. Install the [flyctl](https://fly.io/docs/flyctl/) CLI and run `fly launch` in this folder (it detects a Node app; deploy with `fly deploy`).
2. Free allowances cover a small app; needs a credit card on file for overage protection.

### Run it yourself
This is a plain Node/Express + WebSocket app — it also runs on any VPS, Raspberry Pi or home server behind the `PUBLIC_URL` env var.

### Keep your box alive
- Free tiers sleep after ~15 idle minutes. Add a free [UptimeRobot](https://uptimerobot.com) monitor hitting `https://<your-url>/health` every 30 minutes so it stays awake.
- On free hosts the `data/` folder is temporary — it resets on redeploy. Messages are safe until then; the seeded letter, lilies note, date invitation and the photo gallery always come back automatically.

## Files

- `server.js` — express + WebSocket, JSON store in `data/boxes.json`, seeds the `NOELL` box, serves `/api/photos`
- `public/index.html` + `public/js/app.js` — the box page (QR welcome, notes, gallery, lightbox)
- `public/send.html` + `public/js/sender.js` — the sender page
- `public/photos/` — the memories gallery (22 photos)
- `public/css/base.css` — everything, soft and warm
- `public/js/heart.js` — the pixel heart · `share.js` — QR · `sound.js` — WebAudio
- `public/lily.svg` — the lily motif
