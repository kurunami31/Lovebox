'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const BOXES_FILE = path.join(DATA_DIR, 'boxes.json');
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/* ---------------------------------------------------------------- store */

function loadStore() {
  try {
    const raw = fs.readFileSync(BOXES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { boxes: parsed.boxes || {}, ...(parsed.meta || {}) };
  } catch {
    return { boxes: {} };
  }
}

let store = loadStore();

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = BOXES_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ boxes: store.boxes, meta: { updatedAt: Date.now() } }, null, 2));
  fs.renameSync(tmp, BOXES_FILE);
}

/* ------------------------------------------------------------- settings */

const DEFAULT_SETTINGS = {
  wood: 'walnut',
  woodTint: '',
  accent: '#b9893b',
  heartPalette: 'ruby',
  boxName: '',
  recipientName: '',
  keeperName: 'the Keeper',
  chime: 'bell',
  soundOn: true,
  greeting: '',
  knock: [250, 250, 520, 250, 250, 250, 520, 250, 250],
  diaryStyle: 'poetic',
  interiorLight: 'candle',
};

function boxSettings(code) {
  const box = store.boxes[code];
  if (!box) return null;
  return { ...DEFAULT_SETTINGS, ...(box.settings || {}) };
}

/* ---------------------------------------------------------- diary voices */

const POETIC = {
  note: (s) => [
    `A note arrived, warm as a thumbprint on glass.`,
    `Someone folded the distance and pushed it through my slot.`,
    `A letter came. I could feel the sender smiling at the end of it.`,
    `Words landed softly, like snow on a windowsill.`,
    `A message settled inside me; I hummed its weight all evening.`,
  ],
  secret: (s) => [
    `A secret slipped into my drawer. I will not tell. Not even to the dust.`,
    `Something was hidden in me today. I guard it like a nesting bird.`,
    `A whisper came to the drawer, folded smaller than a moth.`,
  ],
  sketch: (s) => [
    `A little drawing arrived — not art, but affection in a hurry.`,
    `Someone doodled a thought and sent it over.`,
    `A sketch came in, lines a little crooked and all the better for it.`,
  ],
  trinket: (s) => [
    `A ${s.trinket} was tucked into my drawer today. It clinks pleasantly.`,
    `A ${s.trinket} arrived and claimed a corner of the drawer.`,
    `Someone sent a ${s.trinket}. Small, but it makes the drawer feel crowded with tenderness.`,
  ],
  read: (s) => [
    `The lid lifted. Something was read. I felt the reader go still.`,
    `The box was opened this evening; the note inside was held in warm hands.`,
    `The lid rose, and a message was truly met.`,
  ],
  spin: (s) => [
    `The heart was spun today — a whole little storm of hearts went back out into the world.`,
    `Someone spun me. I sent the affection onward, breathless.`,
    `A spin! The hearts flew off my front like startled sparrows.`,
  ],
  grow: (s) => [
    `Something in my garden stretched a new leaf toward the light.`,
    `The garden grew today. It does that, when there is enough love.`,
    `A new green thing has appeared. I water it with all the notes I keep.`,
  ],
  first: [
    (s) => `I was born on ${s.day}. Someone gave me to someone they loved. It is my whole purpose.`,
  ],
};

const PLAYFUL = {
  note: (s) => [
    `New note in! I did a little spin. Okay, a lot of spin.`,
    `A note landed. I pretended not to be excited. I spun anyway.`,
    `Mail call! Someone out there is very fond of you, I could tell.`,
    `A message arrived and I nearly wiggled off the shelf.`,
  ],
  secret: (s) => [
    `A secret note is hiding in the drawer. My lips are sealed. (I have no lips, but still.)`,
    `Something sneaky arrived today. I like sneaky.`,
    `Shh. A secret came in. Even I don't get to peek until the code is knocked.`,
  ],
  sketch: (s) => [
    `A doodle arrived. Not a masterpiece. Perfect.`,
    `Someone sent a little drawing — crooked lines, straight from the heart.`,
    `A sketch showed up. I'd hang it in my interior if I had walls.`,
  ],
  trinket: (s) => [
    `A ${s.trinket} just moved into the drawer. It's already bossing the paperclips.`,
    `Gift incoming: one (1) ${s.trinket}. The drawer is now 100% more charming.`,
    `A ${s.trinket} arrived and claimed squatter's rights in the drawer.`,
  ],
  read: (s) => [
    `The lid's up! Someone's reading. I'll just... pretend I'm not watching.`,
    `Opened! I held my breath. (I don't breathe. Dramatic effect.)`,
    `The lid went up and stayed up. That's my favorite move.`,
  ],
  spin: (s) => [
    `SPIN! Hearts deployed. You're welcome, sender people.`,
    `The heart just took a victory lap.`,
    `Someone spun me so hard I'm still a little dizzy.`,
  ],
  grow: (s) => [
    `The plant is showing off again. New leaf. Showoff.`,
    `Garden update: more green. My compliments to the notes.`,
    `The sprout grew! It's basically a celebrity now.`,
  ],
  first: [
    (s) => `I came alive today. First day on the job: be a good box. I'm taking it seriously.`,
  ],
};

function diaryLine(box, kind, ctx) {
  const voice = (box.settings && box.settings.diaryStyle) || 'poetic';
  const bank = voice === 'playful' ? PLAYFUL : POETIC;
  const entry = bank[kind];
  if (!entry) return null;
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const s = { ...ctx, day };
  const lines = typeof entry === 'function' ? entry(s) : entry.map((f) => f(s));
  if (!lines || !lines.length) return null;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return { ts: Date.now(), line };
}

function appendDiary(box, kind, ctx) {
  if (!box.diary) box.diary = [];
  box.diary.push(diaryLine(box, kind, ctx));
  if (box.diary.length > 60) box.diary = box.diary.slice(-60);
}

/* --------------------------------------------------------------- garden */

const GARDEN_STAGES = [
  { at: 0, name: 'seed' },
  { at: 3, name: 'sprout' },
  { at: 9, name: 'sapling' },
  { at: 18, name: 'bloom' },
  { at: 30, name: 'full' },
];

function gardenLevel(box) {
  const g = box.garden || {};
  const score = (g.score || 0) + (g.extra || 0);
  let level = 0;
  for (const s of GARDEN_STAGES) if (score >= s.at) level = GARDEN_STAGES.indexOf(s);
  return { level, score, stage: GARDEN_STAGES[level].name };
}

function gardenGrow(box, amount) {
  const before = gardenLevel(box);
  box.garden = box.garden || {};
  box.garden.score = (box.garden.score || 0) + amount;
  box.garden.extra = 0;
  const after = gardenLevel(box);
  if (after.level > before.level) appendDiary(box, 'grow', {});
  return gardenLevel(box);
}

/* ------------------------------------------------------------------ box */

function genCode() {
  let code;
  do {
    code = '';
    const bytes = crypto.randomBytes(5);
    for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  } while (store.boxes[code]);
  return code;
}

function newBox(name) {
  const code = genCode();
  const box = {
    code,
    name: name || '',
    createdAt: Date.now(),
    settings: {},
    notes: [],
    trinkets: [],
    drawer: [],            // secret notes, hidden until knock
    garden: { score: 0, extra: 0 },
    diary: [],
    spins: 0,
    firstOpenedAt: null,
    reads: 0,
    senderNames: {},
  };
  box.diary.push(diaryLine(box, 'first', {}));
  store.boxes[code] = box;
  persist();
  return { code, box };
}

/* ---------------------------------------------------------------- server */

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, up: Date.now(), boxes: Object.keys(store.boxes).length });
});

app.post('/api/box', (req, res) => {
  const { code, box } = newBox((req.body && req.body.name) || '');
  res.json({ code });
});

app.get('/api/box/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const box = store.boxes[code];
  if (!box) return res.status(404).json({ error: 'no_such_box' });
  const settings = boxSettings(code);
  res.json({
    code,
    name: box.name,
    settings,
    notes: box.notes,
    trinkets: box.trinkets,
    garden: gardenLevel(box),
    diary: box.diary,
    spins: box.spins,
    reads: box.reads,
    firstOpenedAt: box.firstOpenedAt,
    hasSecretDrawer: box.drawer.length > 0,
    senderNames: box.senderNames,
  });
});

app.get('/api/box/:code/drawer', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const box = store.boxes[code];
  if (!box) return res.status(404).json({ error: 'no_such_box' });
  res.json({ notes: box.drawer });
});

app.get('/api/box/:code/export', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const box = store.boxes[code];
  if (!box) return res.status(404).json({ error: 'no_such_box' });
  res.json({
    app: 'keepsake-box',
    version: 1,
    exportedAt: Date.now(),
    code,
    box: { ...box, settings: boxSettings(code) },
  });
});

app.post('/api/box/:code/import', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!store.boxes[code]) return res.status(404).json({ error: 'no_such_box' });
  const b = (req.body && req.body.box) || null;
  if (!b || !Array.isArray(b.notes)) return res.status(400).json({ error: 'bad_backup' });
  store.boxes[code] = {
    code,
    name: String(b.name || '').slice(0, 60),
    createdAt: b.createdAt || Date.now(),
    settings: b.settings && typeof b.settings === 'object' ? b.settings : {},
    notes: Array.isArray(b.notes) ? b.notes.slice(0, 200) : [],
    trinkets: Array.isArray(b.trinkets) ? b.trinkets.slice(0, 80) : [],
    drawer: Array.isArray(b.drawer) ? b.drawer.slice(0, 50) : [],
    garden: b.garden && typeof b.garden === 'object' ? b.garden : { score: 0, extra: 0 },
    diary: Array.isArray(b.diary) ? b.diary.slice(0, 60) : [],
    spins: b.spins || 0,
    firstOpenedAt: b.firstOpenedAt || null,
    reads: b.reads || 0,
    senderNames: b.senderNames && typeof b.senderNames === 'object' ? b.senderNames : {},
  };
  persist();
  broadcastTo(code, { type: 'box:reload' });
  res.json({ ok: true });
});

app.patch('/api/box/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const box = store.boxes[code];
  if (!box) return res.status(404).json({ error: 'no_such_box' });
  const patch = req.body || {};
  if (typeof patch.name === 'string') box.name = patch.name.slice(0, 60);
  if (patch.settings && typeof patch.settings === 'object') {
    const merged = { ...(box.settings || {}), ...patch.settings };
    if (Array.isArray(merged.knock)) merged.knock = merged.knock.map(Number).slice(0, 12);
    box.settings = merged;
  }
  persist();
  broadcastTo(code, { type: 'box:update', settings: box.settings });
  res.json({ ok: true });
});

/* -------------------------------------------------------------- websocket */

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 128 * 1024 });

const clients = new Map(); // code -> Set of ws

function broadcastTo(code, msg, except) {
  const set = clients.get(code);
  if (!set) return;
  const data = JSON.stringify(msg);
  for (const ws of set) {
    if (ws !== except && ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function onlineSenders(code) {
  const set = clients.get(code);
  if (!set) return 0;
  let n = 0;
  for (const ws of set) if (ws.role === 'sender' && ws.readyState === WebSocket.OPEN) n++;
  return n;
}

function pushPresence(code) {
  broadcastTo(code, { type: 'presence', senders: onlineSenders(code) });
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const code = (url.searchParams.get('box') || '').toUpperCase();
  const role = url.searchParams.get('role') === 'sender' ? 'sender' : 'box';
  ws.role = role;
  ws.box = code;

  if (!store.boxes[code]) {
    ws.send(JSON.stringify({ type: 'error', error: 'no_such_box' }));
    ws.close();
    return;
  }

  if (!clients.has(code)) clients.set(code, new Set());
  clients.get(code).add(ws);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.send(JSON.stringify({ type: 'hello', role, code, serverTime: Date.now() }));
  pushPresence(code);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const box = store.boxes[code];
    if (!box) return;

    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'note': {
        const note = {
          id: crypto.randomBytes(6).toString('hex'),
          ts: Date.now(),
          sender: String(msg.sender || 'Someone').slice(0, 30),
          style: ['note', 'sketch', 'sealed'].includes(msg.style) ? msg.style : 'note',
          secret: !!msg.secret,
          content: String(msg.content || '').slice(0, 2000),
          read: false,
        };
        if (note.secret) {
          box.drawer.unshift(note);
          box.drawer = box.drawer.slice(0, 50);
          appendDiary(box, 'secret', {});
        } else {
          box.notes.unshift(note);
          box.notes = box.notes.slice(0, 200);
          appendDiary(box, note.style === 'sketch' ? 'sketch' : 'note', {});
          gardenGrow(box, 1);
        }
        if (msg.sender) box.senderNames[note.sender] = true;
        persist();
        broadcastTo(code, { type: 'note', note });
        break;
      }

      case 'trinket': {
        const item = {
          id: crypto.randomBytes(6).toString('hex'),
          ts: Date.now(),
          sender: String(msg.sender || 'Someone').slice(0, 30),
          trinket: String(msg.trinket || 'star').slice(0, 30),
          note: String(msg.note || '').slice(0, 300),
        };
        box.trinkets.unshift(item);
        box.trinkets = box.trinkets.slice(0, 80);
        appendDiary(box, 'trinket', { trinket: item.trinket });
        gardenGrow(box, 1);
        if (msg.sender) box.senderNames[item.sender] = true;
        persist();
        broadcastTo(code, { type: 'trinket', item });
        break;
      }

      case 'spin': {
        box.spins += 1;
        appendDiary(box, 'spin', {});
        persist();
        broadcastTo(code, { type: 'heartspin', by: role });
        break;
      }

      case 'read': {
        const id = String(msg.id || '');
        const note = box.notes.find((n) => n.id === id);
        if (note && !note.read) {
          note.read = true;
          box.reads += 1;
          if (box.firstOpenedAt === null) {
            box.firstOpenedAt = Date.now();
            appendDiary(box, 'read', {});
          }
          appendDiary(box, 'read', {});
          persist();
        }
        broadcastTo(code, { type: 'note:read', id });
        break;
      }

      case 'keep': {
        const id = String(msg.id || '');
        const note = box.notes.find((n) => n.id === id) || box.drawer.find((n) => n.id === id);
        if (note && !box.kept) box.kept = [];
        if (note && !box.kept.some((k) => k.id === note.id)) {
          box.kept.push(note);
          box.kept = box.kept.slice(-40);
          persist();
        }
        ws.send(JSON.stringify({ type: 'kept', id: note.id }));
        break;
      }
    }
  });

  ws.on('close', () => {
    const set = clients.get(code);
    if (set) {
      set.delete(ws);
      if (set.size === 0) clients.delete(code);
    }
    pushPresence(code);
  });
});

/* heartbeats */
setInterval(() => {
  for (const set of clients.values()) {
    for (const ws of set) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }
}, 25000);

server.listen(PORT, () => {
  console.log(`The Keepsake Box is open. → http://localhost:${PORT}`);
});
