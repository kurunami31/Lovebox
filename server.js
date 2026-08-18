/* ============================================================
   The Keepsake Box — simple server
   Box codes, notes, sealed secrets, heart-spins, over WebSocket
   ============================================================ */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'boxes.json');

let store = { boxes: {} };

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}
function load() {
  try {
    if (fs.existsSync(FILE)) store = JSON.parse(fs.readFileSync(FILE, 'utf8')) || { boxes: {} };
  } catch {}
}
load();

app.use(express.json({ limit: '16mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  } while (store.boxes[code]);
  return code;
}

function cleanImg(v) {
  if (typeof v !== 'string') return '';
  if (!/^data:image\/(jpeg|png|gif|webp);base64,/.test(v)) return '';
  if (v.length > 3000000) return '';
  return v;
}

function cleanNote(n) {
  return {
    id: String(n.id || '').slice(0, 40),
    ts: n.ts || Date.now(),
    sender: String(n.sender || '').slice(0, 30) || 'Someone',
    content: String(n.content || '').slice(0, 900),
    img: cleanImg(n.img),
    sealed: !!n.sealed,
    read: !!n.read,
  };
}

function boxView(code) {
  const b = store.boxes[code];
  return {
    code: b.code,
    name: b.name || 'The Keepsake Box',
    createdAt: b.createdAt,
    cover: cleanImg(b.cover),
    notes: (b.notes || []).map(cleanNote),
    reads: b.reads || 0,
    spins: b.spins || 0,
  };
}

app.get('/health', (req, res) => res.json({ ok: true, boxes: Object.keys(store.boxes).length }));

app.get('/api/config', (req, res) => {
  res.json({ publicUrl: process.env.PUBLIC_URL || '' });
});

app.post('/api/box', (req, res) => {
  const name = String((req.body || {}).name || '').trim().slice(0, 60);
  const greeting = String((req.body || {}).greeting || '').trim().slice(0, 900);
  const code = newCode();
  const notes = [];
  if (greeting) {
    notes.push({
      id: 'greeting',
      ts: Date.now(),
      sender: 'the one who made this box',
      content: greeting,
      sealed: false,
      read: false,
    });
  }
  store.boxes[code] = {
    code,
    name,
    createdAt: Date.now(),
    notes,
    reads: 0,
    spins: 0,
  };
  persist();
  res.json({ code });
});

app.get('/api/box/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!store.boxes[code]) return res.status(404).json({ error: 'no_such_box' });
  res.json(boxView(code));
});

app.patch('/api/box/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const b = store.boxes[code];
  if (!b) return res.status(404).json({ error: 'no_such_box' });
  const body = req.body || {};
  if ('cover' in body) {
    b.cover = cleanImg(body.cover);
    persist();
    broadcast(code, { type: 'cover', cover: b.cover });
  }
  res.json({ ok: true });
});

/* ---------------- websocket ---------------- */

const clients = new Map(); /* ws -> { box, role } */

function broadcast(boxCode, msg) {
  const data = JSON.stringify(msg);
  for (const [ws, meta] of clients) {
    if (meta.box !== boxCode) continue;
    if (ws.readyState === 1) ws.send(data);
  }
}

function senderCount(boxCode) {
  let n = 0;
  for (const meta of clients.values()) if (meta.box === boxCode && meta.role === 'sender') n++;
  return n;
}

function boxClientCount(boxCode) {
  let n = 0;
  for (const meta of clients.values()) if (meta.box === boxCode && meta.role === 'box') n++;
  return n;
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const boxCode = String(url.searchParams.get('box') || '').toUpperCase();
  const role = url.searchParams.get('role') === 'sender' ? 'sender' : 'box';
  const box = store.boxes[boxCode];
  if (!box) {
    ws.send(JSON.stringify({ type: 'error', error: 'no_such_box' }));
    ws.close();
    return;
  }

  clients.set(ws, { box: boxCode, role });
  ws.send(JSON.stringify({ type: 'hello', code: boxCode, role }));
  broadcast(boxCode, { type: 'presence', senders: senderCount(boxCode), boxes: boxClientCount(boxCode) });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    const b = store.boxes[boxCode];
    if (!b) return;

    switch (m.type) {
      case 'note': {
        const content = String(m.content || '').trim().slice(0, 900);
        const img = cleanImg(m.img);
        if (!content && !img) return;
        const sender = String(m.sender || '').trim().slice(0, 30) || 'Someone';
        const note = {
          id: Math.random().toString(36).slice(2, 10),
          ts: Date.now(),
          sender,
          content,
          img,
          sealed: !!m.sealed,
          read: false,
        };
        b.notes.push(note);
        b.notes = b.notes.slice(-200);
        persist();
        broadcast(boxCode, { type: 'note', note: cleanNote(note) });
        break;
      }
      case 'heart': {
        b.spins++;
        persist();
        broadcast(boxCode, { type: 'heartspin', from: String(m.from || '') });
        break;
      }
      case 'spin': {
        broadcast(boxCode, { type: 'heartspin' });
        break;
      }
      case 'read': {
        const n = b.notes.find((x) => x.id === m.id);
        if (n) {
          n.read = true;
          if (n.id === 'greeting') b.reads++;
          persist();
          broadcast(boxCode, { type: 'note:read', id: m.id });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast(boxCode, { type: 'presence', senders: senderCount(boxCode), boxes: boxClientCount(boxCode) });
  });
});

server.listen(PORT, () => console.log(`keepsake box on http://localhost:${PORT}`));