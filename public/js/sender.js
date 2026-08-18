/* ============================================================
   The Keepsake Box — the sender page
   ============================================================ */

(() => {
  const $ = (id) => document.getElementById(id);

  let code = null;
  let ws = null;
  let name = localStorage.getItem('keepsake.sender') || '';
  let trinketPick = null;

  const GRID = 16;

  /* ---------------- pairing ---------------- */

  async function boot() {
    const fromUrl = new URLSearchParams(location.search).get('box');
    if (fromUrl) {
      if (await loadBox(String(fromUrl).toUpperCase())) return;
      $('wrongbox').classList.remove('hidden');
      return;
    }
    const stored = localStorage.getItem('keepsake.lastbox');
    if (stored && await loadBox(stored)) return;
    showPairing();
  }

  async function loadBox(c) {
    try {
      const res = await fetch(`/api/box/${c}`);
      if (!res.ok) return false;
      const data = await res.json();
      code = c;
      localStorage.setItem('keepsake.lastbox', c);
      initSend(data);
      connect();
      return true;
    } catch {
      return false;
    }
  }

  function showPairing() {
    $('pairing').classList.remove('hidden');
    $('pair-code').focus();
  }

  $('wrongback').addEventListener('click', () => {
    $('wrongbox').classList.add('hidden');
    showPairing();
  });

  $('pair-go').addEventListener('click', async () => {
    const c = String($('pair-code').value || '').trim().toUpperCase();
    if (!c) return;
    if (await loadBox(c)) {
      $('pairing').classList.add('hidden');
    } else {
      $('pair-err').textContent = 'no box with that code \u2014 check the card';
    }
  });

  $('pair-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('pair-go').click();
  });

  /* ---------------- send page ---------------- */

  function initSend(data) {
    const s = data.settings;
    $('sendcard').classList.remove('hidden');
    $('sc-title').textContent = s.boxName || 'The Keepsake Box';
    $('sc-code').textContent = code;

    $('sender-name').value = name;
    $('sender-char').textContent = name ? `${name.length}/30` : '';
    $('sender-name').addEventListener('input', () => {
      name = $('sender-name').value.trim();
      localStorage.setItem('keepsake.sender', name);
      $('sender-char').textContent = `${$('sender-name').value.length}/30`;
      updateSendState();
    });

    buildTabs();
    buildDoodle();
    buildTrinkets();
    updateSendState();

    $('note-text').addEventListener('input', updateSendState);
    $('trinket-note').addEventListener('input', updateSendState);
    $('send-btn').addEventListener('click', send);
  }

  function buildTabs() {
    document.querySelectorAll('.sendcard__tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sendcard__tab').forEach((t) => t.classList.remove('is-on'));
        document.querySelectorAll('.pane').forEach((p) => p.classList.remove('is-on'));
        tab.classList.add('is-on');
        $('pane-' + tab.dataset.tab).classList.add('is-on');
        updateSendState();
      });
    });
  }

  function updateSendState() {
    const tab = document.querySelector('.sendcard__tab.is-on').dataset.tab;
    const hasName = name.length > 0;
    let canSend = hasName;
    if (tab === 'note') canSend = hasName && $('note-text').value.trim().length > 0;
    if (tab === 'doodle') canSend = hasName && doodleHasInk();
    if (tab === 'trinket') canSend = hasName && !!trinketPick;
    $('send-btn').disabled = !canSend;
  }

  /* ---------------- doodle ---------------- */

  const doodleCanvas = $('doodle');
  const doodleCtx = doodleCanvas.getContext('2d');
  const CELL = 20;
  doodleCanvas.width = GRID * CELL;
  doodleCanvas.height = GRID * CELL;
  let grid = new Array(GRID * GRID).fill(-1);
  let history = [];
  let pen = 1;
  let drawing = false;

  function doodleHasInk() {
    return grid.some((c) => c >= 0);
  }

  function paintGrid() {
    for (let i = 0; i < grid.length; i++) {
      const c = grid[i];
      const x = (i % GRID) * CELL, y = Math.floor(i / GRID) * CELL;
      doodleCtx.fillStyle = c >= 0 ? Messages.SKETCH_PALETTE[c] : '#fffdf6';
      doodleCtx.fillRect(x, y, CELL, CELL);
    }
    doodleCtx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let i = 1; i < GRID; i++) {
      doodleCtx.beginPath();
      doodleCtx.moveTo(i * CELL, 0);
      doodleCtx.lineTo(i * CELL, GRID * CELL);
      doodleCtx.stroke();
      doodleCtx.beginPath();
      doodleCtx.moveTo(0, i * CELL);
      doodleCtx.lineTo(GRID * CELL, i * CELL);
      doodleCtx.stroke();
    }
  }

  function buildDoodle() {
    const pal = $('doodle-palette');
    Messages.SKETCH_PALETTE.forEach((c, i) => {
      const b = document.createElement('button');
      b.style.background = c;
      if (i === pen) b.classList.add('is-on');
      b.title = 'color ' + (i + 1);
      b.addEventListener('click', () => {
        pen = i;
        pal.querySelectorAll('button').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
      });
      pal.appendChild(b);
    });

    const pos = (e) => {
      const r = doodleCanvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * GRID);
      const y = Math.floor(((e.clientY - r.top) / r.height) * GRID);
      return y * GRID + Math.min(GRID - 1, Math.max(0, x));
    };

    doodleCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drawing = true;
      doodleCanvas.setPointerCapture(e.pointerId);
      stamp(pos(e));
    });
    doodleCanvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      stamp(pos(e));
    });
    doodleCanvas.addEventListener('pointerup', () => { drawing = false; });
    doodleCanvas.addEventListener('pointercancel', () => { drawing = false; });

    function stamp(idx) {
      if (grid[idx] === pen) return;
      history.push([idx, grid[idx]]);
      if (history.length > 400) history.shift();
      grid[idx] = pen;
      paintGrid();
      updateSendState();
      Sound.tap();
    }

    $('doodle-clear').addEventListener('click', () => {
      history.push([-1, grid.slice()]);
      grid = new Array(GRID * GRID).fill(-1);
      paintGrid();
      updateSendState();
    });

    $('doodle-undo').addEventListener('click', () => {
      const last = history.pop();
      if (!last) return;
      if (last[0] === -1) grid = new Array(GRID * GRID).fill(-1).map((_, i) => last[1][i]);
      else grid[last[0]] = last[1];
      paintGrid();
      updateSendState();
    });

    paintGrid();
  }

  /* ---------------- trinkets ---------------- */

  function buildTrinkets() {
    const pick = $('trinkets-pick');
    Trinkets.ALL.forEach((t) => {
      const cell = document.createElement('button');
      cell.className = 'trinket-cell';
      const cv = document.createElement('canvas');
      Trinkets.draw(cv, t.id, 8);
      const span = document.createElement('span');
      span.textContent = t.name;
      cell.append(cv, span);
      cell.addEventListener('click', () => {
        trinketPick = t.id;
        pick.querySelectorAll('.trinket-cell').forEach((x) => x.classList.remove('is-on'));
        cell.classList.add('is-on');
        updateSendState();
      });
      pick.appendChild(cell);
    });
  }

  /* ---------------- send ---------------- */

  function send() {
    const tab = document.querySelector('.sendcard__tab.is-on').dataset.tab;
    const btn = $('send-btn');
    const label = $('send-label');
    const ok = ws.send(buildPayload(tab));
    if (!ok) {
      label.textContent = 'reconnecting\u2026';
      setTimeout(() => { label.textContent = 'send'; }, 1200);
      return;
    }
    sendFly();
    btn.classList.add('is-sent');
    label.textContent = 'sent \u2014 the heart is spinning at home';
    Sound.noteIn();
    setTimeout(() => {
      btn.classList.remove('is-sent');
      label.textContent = 'send';
      if (tab === 'note') $('note-text').value = '';
      if (tab === 'trinket') { $('trinket-note').value = ''; trinketPick = null; $('trinkets-pick').querySelectorAll('.trinket-cell').forEach((x) => x.classList.remove('is-on')); }
      grid = new Array(GRID * GRID).fill(-1);
      history = [];
      paintGrid();
      updateSendState();
    }, 1600);
  }

  function buildPayload(tab) {
    if (tab === 'note') {
      return {
        type: 'note',
        sender: name,
        style: 'note',
        secret: $('note-secret').checked,
        content: $('note-text').value.trim(),
      };
    }
    if (tab === 'doodle') {
      return { type: 'note', sender: name, style: 'sketch', content: JSON.stringify(grid) };
    }
    return { type: 'trinket', sender: name, trinket: trinketPick, note: $('trinket-note').value.trim() };
  }

  function sendFly() {
    const btn = $('send-btn');
    for (let i = 0; i < 8; i++) {
      const f = document.createElement('i');
      f.className = 'fly';
      const a = (i / 8) * Math.PI * 2;
      f.style.setProperty('--fx', `${Math.cos(a) * 46}px`);
      f.style.setProperty('--fy', `${Math.sin(a) * 46 - 8}px`);
      f.style.left = '50%';
      f.style.top = '50%';
      f.style.animationDelay = `${i * 40}ms`;
      btn.appendChild(f);
      setTimeout(() => f.remove(), 1300);
    }
  }

  /* ---------------- websocket ---------------- */

  function connect() {
    ws = connectWS(code, 'sender', {
      onMessage: (msg) => {
        if (msg.type === 'presence') {
          const p = $('sc-presence');
          p.classList.toggle('is-on', msg.senders > 0);
          p.querySelector('span').textContent = msg.senders > 0 ? `${msg.senders} connected` : 'offline';
        } else if (msg.type === 'heartspin') {
          onHeartspin();
        } else if (msg.type === 'error') {
          $('sc-presence').querySelector('span').textContent = 'box not found';
        }
      },
      onOpen: () => {
        $('sc-presence').querySelector('span').textContent = 'online';
        $('sc-presence').classList.add('is-on');
      },
      onClose: () => {
        $('sc-presence').querySelector('span').textContent = 'reconnecting\u2026';
        $('sc-presence').classList.remove('is-on');
      },
    });
  }

  let lastSpin = 0;
  function onHeartspin() {
    const now = Date.now();
    if (now - lastSpin < 1500) return;
    lastSpin = now;
    Sound.burst();
    const b = $('spun');
    b.classList.add('is-on');
    burst();
    setTimeout(() => b.classList.remove('is-on'), 3200);
  }

  function burst() {
    const layer = $('burst');
    const chars = ['\u2764', '\u2764\uFE0F', '\u{1F49C}', '\u{1F497}'];
    for (let i = 0; i < 16; i++) {
      const h = document.createElement('i');
      h.textContent = chars[i % chars.length];
      h.style.left = `${window.innerWidth / 2 + Math.cos((i / 16) * Math.PI * 2) * 140}px`;
      h.style.top = `${window.innerHeight / 2 + Math.sin((i / 16) * Math.PI * 2) * 90}px`;
      h.style.setProperty('--dx', `${Math.cos((i / 16) * Math.PI * 2) * 160}px`);
      h.style.setProperty('--dy', `${Math.sin((i / 16) * Math.PI * 2) * 140 - 60}px`);
      h.style.fontSize = `${18 + Math.random() * 14}px`;
      h.style.animationDelay = `${Math.random() * 0.3}s`;
      layer.appendChild(h);
    }
    setTimeout(() => { layer.innerHTML = ''; }, 3000);
  }

  document.addEventListener('pointerdown', () => Sound.init(), { once: true });

  boot();
})();