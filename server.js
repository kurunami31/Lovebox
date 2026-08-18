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
const PHOTOS_DIR = path.join(__dirname, 'public', 'photos');
const DEFAULT_CODE = 'NOELL';

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

function seedDefault() {
  const LETTER = `Hi baby, happy 4 years and 6 months nato po. 🥹❤️ Grabe no, 4 years and 6 months na diay ta. Murag dugay nagud diay ta together, layo na pero layo pa diba. And after everything we've been through, I'm still so thankful nga ikaw akong kauban.

Thank you kaayo sa pag-keep up sa akong kabadlongon ug sa akong pagka-gahi ug ulo. 😭😂 Kabalo ko nga usahay lisod ko sabton, usahay samokan kaayo ko, ug naa gyud koy mga moments nga kabalo ko samok kaayo ko, kanang murag gusto na nimo ko kumoton tungod sa akong kabadlongon HAHAHA 😭😂. Pero despite all of that, naa gihapon ka. Thank you kay patient ka sa akoa and for choosing to understand me even during the times nga lisod ko sabton. Thank you pud kaayo for always making me feel beautiful, especially sa mga times nga feeling nako pangit kaayo ko. Thank you for reminding me nga beautiful ko even when I can't see it myself. Thank you sa pag-boost sa akong confidence sa mga panahon nga ako mismo dili kabalo unsaon pag-believe sa akong sarili. Sometimes, I forget my worth, I doubt myself, and I become too hard on myself, pero somehow, you always find a way to remind me that I am enough. Thank you for always making me feel loved and appreciated, labi na gyud sa mga times nga makalimot ko unsaon pag-love ug appreciate sa akong sarili. You have this way of making me feel safe and loved without even realizing how much it means to me. And I hope you know nga tanan nimong little efforts, even the smallest ones, na-appreciate gyud nako. Bisan dili nako pirmi maingon or ma-express, please know nga I notice them and I keep them close to my heart.

Spending this day with you feels extra special. Special man gyud ang every day nga naa ka sa akong life, pero mas special lang gyud ron kay monthsary nato hehe. 🥹❤️ Another month, another memory, another reminder kung unsa ta kalayo na ang naagian together. I know nga dili perfect atong relationship, and I know pud nga lisod atong situation karon. Daghan pa siguro tag challenges nga atubangon, ug naa gyud mga panahon nga mahimong kapoy ug lisod ang tanan. Pero despite everything, naa koy salig sa atong duha. I believe in us, and I believe nga kaya nato ni i-face as long as magpabilin tang mag uban, mag-sinabtanay, ug dili ta ma stop choosing each other. Thank you for staying. Thank you for loving me the way you do. Thank you for being patient with me, for making me smile, for comforting me, and for being one of the best parts of my life. I may not always say it perfectly, and sometimes kulang ra gyud akong words para ma-explain unsa ko ka-thankful nga naa ka, pero I hope you always know how much you mean to me.

Happy 4 years and 6 months, baby. ❤️ I love you so much, palangga. And no matter how difficult things get, I hope we continue choosing each other, just like how we did from the very beginning. Here's to more months, more years, more memories, more kulit, more away nga ma-solve ra gihapon 😂, and more moments together.

I love you so much, palangga. Thank you for being you, and thank you for staying with me through everything. Happy 4 years and 6 months to us. ❤️🥹`;

  const LILY = `fun fact: lilies were considered one of the most beautiful and sacred flowers in ancient Egypt. And just like a lily, you are sacred and beautiful to me. Among all the people I have seen and known, you are the most beautiful person in my eyes — not just because of how you look, but because of who you are and the way you make my world feel so special. 🤍🌸`;

  if (!store.boxes[DEFAULT_CODE]) {
    store.boxes[DEFAULT_CODE] = {
      code: DEFAULT_CODE,
      name: "Noelle's Lovebox",
      createdAt: Date.now(),
      notes: [
        {
          id: 'greeting',
          ts: Date.now(),
          sender: 'your palangga',
          content: LETTER,
          sealed: false,
          read: false,
        },
        {
          id: 'lilies',
          ts: Date.now() + 1,
          sender: 'your palangga',
          content: LILY,
          sealed: false,
          read: false,
        },
      ],
      reads: 0,
      spins: 0,
      cover: '/photos/noelle-01.jpg',
      invite: { asked: true, confirmed: false, by: '', at: null },
    };
    persist();
    return;
  }

  const b = store.boxes[DEFAULT_CODE];
  const greeting = (b.notes || []).find((n) => n.id === 'greeting');
  if (greeting && !/monthsary/.test(greeting.content)) {
    greeting.content = LETTER;
    persist();
  }
  if (!(b.notes || []).some((n) => n.id === 'lilies')) {
    b.notes.unshift({
      id: 'lilies',
      ts: Date.now(),
      sender: 'your palangga',
      content: LILY,
      sealed: false,
      read: false,
    });
    b.notes = b.notes.slice(-200);
    persist();
  }
  if (!b.invite) {
    b.invite = { asked: true, confirmed: false, by: '', at: null };
    persist();
  }
}
seedDefault();

app.use(express.json({ limit: '16mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Regenerate QR code with correct PUBLIC_URL on startup
function regenerateQR() {
  const PUBLIC_URL = process.env.PUBLIC_URL || '';
  if (!PUBLIC_URL) {
    console.log('No PUBLIC_URL set, skipping QR regeneration');
    return;
  }
  
  const QRCode = require('qrcode');
  const qrUrl = `${PUBLIC_URL}/send.html?box=NOELL`;
  
  console.log('Regenerating QR code for:', qrUrl);
  
  QRCode.toFile(path.join(__dirname, 'public', 'qr-code.png'), qrUrl, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#c04660', light: '#fffdfb' }
  }, (err) => {
    if (err) console.error('QR generation error:', err);
    else console.log('QR code regenerated successfully');
  });
  
  // Also regenerate SVG
  QRCode.toString(qrUrl, {
    type: 'svg',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#c04660', light: '#fffdfb' }
  }, (err, svg) => {
    if (err) { console.error('QR SVG error:', err); return; }
    const heart = '<g transform="translate(226, 226) scale(0.8)"><path d="M0 -10 C-10 -10 -10 0 0 10 C0 0 10 -10 10 -10 C10 -10 10 0 0 10 C0 0 -10 -10 0 -10" fill="#c04660"/></g>';
    const svgWithHeart = svg.replace('</svg>', heart + '</svg>');
    fs.writeFileSync(path.join(__dirname, 'public', 'qr-code.svg'), svgWithHeart);
    console.log('QR code SVG regenerated successfully');
  });
}
regenerateQR();

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
  if (/^\/photos\/[^/]+\.(jpe?g|png|gif|webp)$/i.test(v)) return v;
  if (!/^data:image\/(jpeg|png|gif|webp);base64,/.test(v)) return '';
  if (v.length > 3000000) return '';
  return v;
}

function cleanNote(n) {
  return {
    id: String(n.id || '').slice(0, 40),
    ts: n.ts || Date.now(),
    sender: String(n.sender || '').slice(0, 30) || 'Someone',
    content: String(n.content || '').slice(0, 4000),
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
    invite: b.invite || null,
  };
}

app.get('/health', (req, res) => res.json({ ok: true, boxes: Object.keys(store.boxes).length }));

app.get('/api/default', (req, res) => {
  res.json({ code: store.boxes[DEFAULT_CODE] ? DEFAULT_CODE : null });
});

app.get('/api/photos', (req, res) => {
  let files = [];
  try {
    files = fs.readdirSync(PHOTOS_DIR)
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
      .sort();
  } catch {}
  res.json({ photos: files });
});

app.get('/api/config', (req, res) => {
  res.json({ publicUrl: process.env.PUBLIC_URL || '' });
});

app.post('/api/box', (req, res) => {
  const name = String((req.body || {}).name || '').trim().slice(0, 60);
  const greeting = String((req.body || {}).greeting || '').trim().slice(0, 4000);
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
  if (body.invite && typeof body.invite === 'object') {
    const inv = b.invite || { asked: false, confirmed: false, by: '' };
    if (typeof body.invite.asked === 'boolean') inv.asked = body.invite.asked;
    if (typeof body.invite.confirmed === 'boolean') {
      inv.confirmed = body.invite.confirmed;
      if (inv.confirmed) inv.at = Date.now();
      else inv.at = null;
    }
    if (typeof body.invite.by === 'string') inv.by = String(body.invite.by).slice(0, 30);
    b.invite = inv;
    persist();
    broadcast(code, { type: 'invite', invite: b.invite });
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
        const content = String(m.content || '').trim().slice(0, 4000);
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