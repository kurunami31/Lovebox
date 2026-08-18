/* ============================================================
   The Keepsake Box — messages: letters, sketches, sealed notes
   ============================================================ */

const Messages = (() => {
  const SKETCH_PALETTE = ['#3b2e23', '#e2354f', '#e0a53c', '#6fae62', '#4f7fd9', '#e8a0b8', '#8a5c33', '#b7b0a5', '#f7efdf'];
  const GRID = 16;

  const WAX_STEP = 22; /* chars revealed per full spin */

  /* ---------- rendering ---------- */

  function timeStr(ts) {
    const d = new Date(ts);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const hm = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${day}, ${hm}`;
  }

  function sketchCanvas(note, canvas, cell) {
    const rows = JSON.parse(note.content || '[]');
    canvas.width = GRID * cell;
    canvas.height = GRID * cell;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < rows.length && i < GRID * GRID; i++) {
      const c = rows[i];
      if (c == null || c < 0) continue;
      const col = i % GRID, r = Math.floor(i / GRID);
      ctx.fillStyle = SKETCH_PALETTE[c % SKETCH_PALETTE.length];
      ctx.fillRect(col * cell, r * cell, cell, cell);
    }
  }

  function renderCard(note) {
    const card = document.createElement('article');
    card.className = 'card' + (note.secret ? ' is-secret' : '');

    const meta = document.createElement('div');
    meta.className = 'card__meta';
    const from = document.createElement('span');
    from.className = 'card__from';
    from.textContent = note.secret ? 'a secret' : (note.sender || 'Someone');
    const time = document.createElement('span');
    time.className = 'card__time';
    time.textContent = timeStr(note.ts);
    meta.append(from, time);
    card.appendChild(meta);

    if (note.style === 'sketch') {
      const wrap = document.createElement('div');
      wrap.className = 'card__sketch';
      const cv = document.createElement('canvas');
      sketchCanvas(note, cv, 6);
      wrap.appendChild(cv);
      card.appendChild(wrap);
      if (note.sender && !note.secret) {
        const sig = document.createElement('div');
        sig.className = 'card__from';
        sig.style.textAlign = 'right';
        sig.textContent = note.sender;
        card.appendChild(sig);
      }
    } else {
      const body = document.createElement('div');
      body.className = 'card__body';
      body.textContent = note.content;
      card.appendChild(body);
    }

    return card;
  }

  /* ---------- sealed note reveal ---------- */

  const WAX_HEART = [
    '......##.##.......',
    '....###....###....',
    '...####....####...',
    '..##############..',
    '.################.',
    '##################',
    '##################',
    '##################',
    '.################.',
    '..##############..',
    '...############...',
    '....##########....',
    '.....########.....',
    '......######......',
    '.......####.......',
    '........##........',
  ];

  function drawWaxHeart(cv) {
    const cell = 5;
    cv.width = 18 * cell;
    cv.height = 16 * cell;
    const ctx = cv.getContext('2d');
    const cols = { '#': '#ff6478', '.': null };
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 18; c++) {
        const ch = WAX_HEART[r][c];
        if (!cols[ch]) continue;
        ctx.fillStyle = ch === '#' && c >= 2 && c <= 4 && r >= 2 && r <= 4 ? '#ff8fa0' : cols[ch];
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }

  function drawHeart(cv, palette) {
    const cell = cv.dataset.cell ? Number(cv.dataset.cell) : 6;
    cv.width = 18 * cell;
    cv.height = 16 * cell;
    const ctx = cv.getContext('2d');
    const base = (palette && palette.base) || '#e2354f';
    const light = (palette && palette.light) || '#ff7a8c';
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 18; c++) {
        if (WAX_HEART[r][c] !== '#') continue;
        ctx.fillStyle = c >= 2 && c <= 4 && r >= 2 && r <= 4 ? light : base;
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }

  function sealedView(note, onFullyRevealed) {
    const wrap = document.createElement('div');
    wrap.className = 'seal';

    const stamp = document.createElement('div');
    stamp.className = 'seal__stamp';
    const cv = document.createElement('canvas');
    drawWaxHeart(cv);
    stamp.appendChild(cv);
    wrap.appendChild(stamp);

    const hint = document.createElement('div');
    hint.className = 'seal__hint';
    hint.textContent = 'spin the heart to break the wax';
    wrap.appendChild(hint);

    const bar = document.createElement('div');
    bar.className = 'seal__progress';
    const fill = document.createElement('i');
    bar.appendChild(fill);
    wrap.appendChild(bar);

    const revealed = document.createElement('div');
    revealed.className = 'seal__revealed hidden';
    wrap.appendChild(revealed);

    const text = note.content || '';
    let progress = 0;
    const total = Math.max(1, Math.ceil(text.length / WAX_STEP));

    function tick() {
      progress++;
      fill.style.width = `${Math.min(100, (progress / total) * 100)}%`;
      const shown = text.slice(0, progress * WAX_STEP);
      revealed.textContent = shown;
      revealed.classList.remove('hidden');
      hint.textContent = `one full spin · ${progress}/${total} seal${total > 1 ? 's' : ''} broken`;
      if (progress >= total) {
        hint.textContent = 'the seal is broken';
        fill.style.width = '100%';
        onFullyRevealed && onFullyRevealed();
        return true;
      }
      return false;
    }

    return { el: wrap, tick, isDone: () => progress >= total };
  }

  return { renderCard, sealedView, sketchCanvas, timeStr, drawHeart, SKETCH_PALETTE, GRID };
})();

window.Messages = Messages;