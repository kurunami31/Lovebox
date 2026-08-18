# The Keepsake Box

A small, simple web app: a flat card with a little pixel heart that collects **notes, sealed secrets and hearts** from the people you love.

Open the box page and the **first thing you see is a QR code** — scan it with another phone and it takes you straight to the send page. Anyone with the code can send.

## Features

- **QR-first welcome** — the box's share code is the landing screen
- **Notes** — arrive live, in a handwritten font
- **Pictures** — senders can attach a photo (gallery or camera) to a note; it shows in the box. The box owner can also upload their own cover picture at the top of the box page (change or remove it anytime)
- **Sealed secrets** — a sender ticks "seal it"; to read it, tap the wax and the heart spins to break the seal
- **The heart** — spins when a note arrives or when a sender sends a heart; each message grows the box
- **Sender page** (`/send.html?box=CODE`) — note, photo, sealed secret, or a heart; shows if the box owner is online
- One box per code, no accounts. Codes are 5 characters.

## Run it

```bash
npm install
npm start
```

Open `http://localhost:3000`, make the box, and scan the QR from a phone on the same Wi-Fi.

## Deploy

Free hosting with an ephemeral disk **forgets the box on redeploy** — back up by just copying the code/link, or note that the QR always points at the live URL.

### Koyeb (free, no card)
1. Push to GitHub, then at koyeb.com: **Create Service → Web Service → Deploy from GitHub**.
2. Build: `npm install` · Run: `npm start` · Port: `3000`.

### Render (free)
1. Push to GitHub, then at render.com: **New → Blueprint** (the included `render.yaml` sets it all up) or **New → Web Service**.
2. Build: `npm install` · Start: `npm start`.

### Keep it awake
Free tiers sleep after idle minutes. Add a free [UptimeRobot](https://uptimerobot.com) monitor hitting `https://<your-url>/health` every 30 minutes.

### Custom URL (LAN testing)
Set `PUBLIC_URL` (e.g. `http://192.168.1.5:3000`) and the QR will point there instead of localhost.

## Files

- `server.js` — express + WebSocket, JSON store in `data/boxes.json`
- `public/index.html` + `public/js/app.js` — the box page
- `public/send.html` + `public/js/sender.js` — the sender page
- `public/css/base.css` — everything, flat and warm
- `public/js/heart.js` — the pixel heart · `share.js` — QR · `sound.js` — WebAudio