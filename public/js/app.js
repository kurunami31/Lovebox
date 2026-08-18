/* ============================================================
   The Keepsake Box — the box page
   ============================================================ */

(() => {
  let boxCode = null;
  let boxData = null;
  let ws = null;
  let unread = 0;
  let sealedView = null;
  let lastHeartspinAt = 0;

  const $ = (id) => document.getElementById(id);

  const els = {
    box: document.querySelector('.box'),
    headTitle: $('head-title'),
    headCode: $('head-code'),
    status: $('status-line'),
    heart: $('heart'),
    interior: $('interior-view'),
    notesBadge: $('notes-badge'),
    drawerBadge: $('drawer-badge'),
    trinketsBadge: $('trinkets-badge'),
    gardenBadge: $('garden-badge'),
    diaryBadge: $('diary-badge'),
    printQr: $('print-qr'),
    printName: $('print-name'),
    printCode: $('print-code'),
  };

  /* ---------------- boot ---------------- */

  async function boot() {
    const codeFromUrl = new URLSearchParams(location.search).get('box');
    const stored = localStorage.getItem('keepsake.code');
    const candidate = codeFromUrl ? String(codeFromUrl).toUpperCase() : stored;

    if (candidate) {
      const ok = await loadBox(candidate);
      if (ok) { run(); return; }
    }
    if (codeFromUrl && !stored) {
      /* someone visited a link but the box doesn't exist */
      showPairingFail();
      return;
    }
    startOnboarding();
  }

  async function loadBox(code) {
    try {
      const res = await fetch(`/api/box/${code}`);
      if (!res.ok) return false;
      boxData = await res.json();
      boxCode = code;
      localStorage.setItem('keepsake.code', code);
      return true;
    } catch {
      return false;
    }
  }

  function showPairingFail() {
    els.headTitle.textContent = 'a box that isn\u2019t here';
    els.status.textContent = 'This link belongs to a box that doesn\u2019t exist yet.';
  }

  function run() {
    applyBox();
    connect();
    Heart.setup(els.heart);
    Heart.setPalette(boxData.settings.heartPalette);
    Theme.apply(boxData.settings);
    Box.setSettings(boxData.settings);
    Sound.setEnabled(boxData.settings.soundOn !== false);

    Box.init(document.querySelector('.scene'), {
      onToggle: onBoxToggle,
      onSpin: onSpin,
      onKnockTap: (n) => knockDots(n),
      onKnock: onKnock,
      onKnockFail: () => { Sound.fail(); Box.vibrate(30); toast('that knock wasn\u2019t it'); },
    });

    renderAll();
    moodLoop();
    seedGreeting();
  }

  function applyBox() {
    const s = boxData.settings;
    els.headTitle.textContent = s.boxName || 'The Keepsake Box';
    els.headCode.textContent = boxData.code;
    document.title = `${s.boxName || 'The Keepsake Box'} — a lovebox`;
  }

  function seedGreeting() {
    const s = boxData.settings;
    if (s.greeting && boxData.reads === 0 && !boxData.notes.some((n) => n.system)) {
      boxData.notes.unshift({
        id: 'greeting',
        ts: boxData.firstOpenedAt || Date.now(),
        sender: s.keeperName || 'the one who gave you this box',
        style: 'note',
        content: s.greeting,
        read: false,
        system: true,
      });
    }
  }

  /* ---------------- websocket ---------------- */

  function connect() {
    ws = connectWS(boxCode, 'box', {
      onMessage: (msg) => {
        if (msg.type === 'note') onNote(msg.note);
        else if (msg.type === 'trinket') onTrinket(msg.item);
        else if (msg.type === 'heartspin') onHeartspin(msg);
        else if (msg.type === 'presence') onPresence(msg.senders);
        else if (msg.type === 'box:update') onRemoteUpdate(msg.settings);
        else if (msg.type === 'box:reload') reload();
        else if (msg.type === 'note:read') onNoteRead(msg.id);
      },
      onClose: () => els.status.textContent = 'reaching for the box\u2026',
    });
  }

  /* ---------------- events ---------------- */

  function onNote(note) {
    boxData.notes.unshift(note);
    boxData.notes = boxData.notes.slice(0, 200);
    unread++;
    updateBadges();
    Sound.noteIn();
    Sound.chime(boxData.settings.chime);
    Box.excite(6000);
    Heart.pulse(4000);
    els.heart.closest('.heart-mount').classList.remove('is-spinning');
    void els.heart.closest('.heart-mount').offsetWidth;
    els.heart.closest('.heart-mount').classList.add('is-spinning');
    setTimeout(() => els.heart.closest('.heart-mount').classList.remove('is-spinning'), 3400);
    els.heart.closest('.heart-mount').classList.add('is-excited');
    setTimeout(() => els.heart.closest('.heart-mount').classList.remove('is-excited'), 1100);
    els.status.textContent = note.style === 'sketch' ? 'a little drawing just arrived — open me' : 'a note just arrived — open me';
    if (!Box.isOpen()) Box.setOpen(true);
    refreshMirror();
    refreshNotes();
    refreshGarden();
    refreshDiary();
  }

  function onTrinket(item) {
    boxData.trinkets.unshift(item);
    Sound.grow();
    toast(`${item.sender || 'Someone'} tucked a ${item.trinket} into the drawer`);
    refreshTrinkets();
    refreshGarden();
    refreshDiary();
  }

  function onHeartspin() {
    const now = Date.now();
    if (now - lastHeartspinAt < 1200) return;
    lastHeartspinAt = now;
    Sound.burst();
    burstHearts();
    toast('they spun the heart back!');
  }

  function onPresence(n) {
    if (n > 0) els.status.textContent = `${n} ${n === 1 ? 'person' : 'people'} connected — the box is awake`;
    else moodStatus();
  }

  function onRemoteUpdate(settings) {
    boxData.settings = settings;
    Theme.apply(settings);
    Heart.setPalette(settings.heartPalette);
    Box.setSettings(settings);
    Sound.setEnabled(settings.soundOn !== false);
    applyBox();
  }

  function onNoteRead(id) {
    const n = boxData.notes.find((x) => x.id === id);
    if (n) { n.read = true; refreshNotes(); }
  }

  function onBoxToggle(open) {
    if (open) {
      Sound.hinge();
      const unreadNotes = boxData.notes.filter((n) => !n.read && !n.system);
      unreadNotes.forEach((n) => {
        ws.send({ type: 'read', id: n.id });
        n.read = true;
      });
      if (unreadNotes.length) unread = 0;
      updateBadges();
      refreshMirror();
    }
  }

  function onSpin() {
    ws.send({ type: 'spin' });
    Sound.spin();
    Sound.burst();
    burstHearts();
    if (sealedView) {
      sealedView.tick();
    }
  }

  function onKnock() {
    toast('the drawer opens');
    unlockDrawer().then(() => openSheet('drawer-sheet'));
  }

  function knockDots(n) {
    const pattern = boxData.settings.knock || [];
    els.status.textContent = `knock ${n}/${pattern.length + 1}`;
    setTimeout(() => { if (!Box.isOpen()) moodStatus(); }, 900);
  }

  /* ---------------- rendering ---------------- */

  function renderAll() {
    refreshMirror();
    refreshNotes();
    refreshDrawer();
    refreshTrinkets();
    refreshGarden();
    refreshDiary();
    updateBadges();
    moodStatus();
  }

  function refreshMirror() {
    const mirror = els.interior;
    mirror.innerHTML = '';

    if (!Box.isOpen()) {
      mirror.innerHTML = `
        <div class="in-state">
          <div class="in-state__big">a quiet box</div>
          <div>waiting to be opened</div>
        </div>`;
      return;
    }

    const current = boxData.notes.find((n) => !n.read && !n.system)
      || (boxData.notes.length ? boxData.notes[0] : null);

    if (!current) {
      mirror.innerHTML = `
        <div class="in-state">
          <div class="in-state__big">the box is empty</div>
          <div>but it holds its breath for you</div>
        </div>`;
      return;
    }

    if (current.style === 'sketch') {
      const sk = document.createElement('div');
      sk.className = 'in-sketch';
      const cv = document.createElement('canvas');
      Messages.sketchCanvas(current, cv, 4);
      sk.appendChild(cv);
      mirror.appendChild(sk);
      return;
    }

    if (current.style === 'sealed') {
      sealedView = Messages.sealedView(current, () => {
        Sound.unlock();
        toast('the seal is broken');
        ws.send({ type: 'read', id: current.id });
      });
      mirror.appendChild(sealedView.el);
      return;
    }

    const noteEl = Messages.renderCard(current);
    noteEl.querySelector('.card__meta').style.display = 'none';
    mirror.appendChild(noteEl);
  }

  function refreshNotes() {
    const list = $('notes-list');
    list.innerHTML = '';
    const notes = boxData.notes;
    if (!notes.length) {
      list.innerHTML = `<div class="empty"><div class="hand">nothing yet</div><div>share the box and a note will find its way here.</div></div>`;
      return;
    }
    notes.forEach((n) => {
      const card = Messages.renderCard(n);
      const actions = document.createElement('div');
      actions.className = 'card__actions';
      const readTag = document.createElement('span');
      readTag.className = 'cap';
      readTag.textContent = n.read ? '' : 'new';
      actions.appendChild(readTag);
      if (n.id !== 'greeting') {
        const keepBtn = document.createElement('button');
        keepBtn.className = 'btn btn--small';
        keepBtn.textContent = 'keep';
        keepBtn.addEventListener('click', () => {
          ws.send({ type: 'keep', id: n.id });
          toast('kept, safely, forever');
          Sound.tap();
        });
        actions.appendChild(keepBtn);
      }
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function refreshDrawer() {
    const holder = $('drawer-content');
    holder.innerHTML = '';
    if (!boxData.hasSecretDrawer && !boxData.drawerUnlocked) {
      holder.innerHTML = `
        <div class="empty">
          <div class="hand">the drawer is locked</div>
          <div>knock the secret knock on the lid to open it.</div>
        </div>`;
      return;
    }
    boxData.drawerUnlocked = true;
    const items = boxData.secretNotes || [];
    if (!items.length) {
      holder.innerHTML = `<div class="empty"><div class="hand">the drawer is empty</div><div>a secret sent with the seal will wait here.</div></div>`;
      return;
    }
    items.forEach((n) => holder.appendChild(Messages.renderCard(n)));
  }

  async function unlockDrawer() {
    try {
      const res = await fetch(`/api/box/${boxCode}/drawer`);
      if (!res.ok) return;
      const data = await res.json();
      boxData.secretNotes = data.notes;
      boxData.drawerUnlocked = true;
      updateBadges();
    } catch {}
  }

  function refreshTrinkets() {
    const grid = $('trinkets-grid');
    grid.innerHTML = '';
    const items = boxData.trinkets;
    if (!items.length) {
      grid.innerHTML = `<div class="trinket-empty">the drawer is empty for now —<br>someone may tuck a small treasure in soon.</div>`;
      return;
    }
    items.forEach((it) => {
      const cell = document.createElement('button');
      cell.className = 'trinket-cell';
      const cv = document.createElement('canvas');
      Trinkets.draw(cv, it.trinket, 8);
      const span = document.createElement('span');
      span.textContent = Trinkets.get(it.trinket).name;
      cell.append(cv, span);
      cell.addEventListener('click', () => showTrinketDetail(it));
      grid.appendChild(cell);
    });
  }

  function showTrinketDetail(it) {
    const detail = $('trinket-detail');
    detail.innerHTML = '';
    const cv = document.createElement('canvas');
    Trinkets.draw(cv, it.trinket, 16);
    const h = document.createElement('h3');
    h.textContent = Trinkets.get(it.trinket).name;
    const by = document.createElement('div');
    by.className = 'byline';
    by.textContent = `from ${it.sender || 'Someone'} · ${Messages.timeStr(it.ts)}`;
    detail.append(cv, h, by);
    if (it.note) {
      const msg = document.createElement('div');
      msg.className = 'msg';
      msg.textContent = it.note;
      detail.appendChild(msg);
    }
    Sound.tap();
  }

  function refreshGarden() {
    const g = boxData.garden || { level: 0, score: 0, stage: 'seed' };
    Garden.draw($('garden-canvas'), g.stage, { score: g.score });
    $('garden-name').textContent = `the garden`;
    $('garden-stage').textContent = Garden.stageName(g.stage);
    const next = [3, 9, 18, 30, 99][g.level] || 0;
    const from = [0, 3, 9, 18, 30][g.level] || 0;
    const pct = next <= from ? 100 : Math.min(100, ((g.score - from) / (next - from)) * 100);
    $('garden-bar').querySelector('i').style.width = `${pct}%`;
    $('garden-meta').textContent = `grown by ${g.score} ${g.score === 1 ? 'message' : 'messages'}`;
  }

  function refreshDiary() {
    const list = $('diary-list');
    list.innerHTML = '';
    const entries = boxData.diary || [];
    if (!entries.length) {
      list.innerHTML = `<div class="diary-empty">the Keeper has written nothing yet</div>`;
      return;
    }
    [...entries].reverse().forEach((e) => {
      const d = document.createElement('div');
      d.className = 'diary-entry' + (list.children.length === entries.length - 1 ? ' is-birth' : '');
      const line = document.createElement('div');
      line.className = 'diary-entry__line';
      line.textContent = e.line;
      const t = document.createElement('div');
      t.className = 'diary-entry__time';
      t.textContent = Messages.timeStr(e.ts);
      d.append(line, t);
      list.appendChild(d);
    });
  }

  function updateBadges() {
    els.notesBadge.textContent = unread > 0 ? unread : '';
    els.notesBadge.classList.toggle('hidden', unread === 0);
    els.drawerBadge.classList.toggle('has-news', boxData.hasSecretDrawer && !boxData.drawerUnlocked);
    els.trinketsBadge.classList.toggle('has-news', boxData.trinkets.length > 0);
    els.gardenBadge.classList.toggle('has-news', (boxData.garden.score || 0) > 0);
    els.diaryBadge.classList.toggle('has-news', (boxData.diary || []).length > 0);
  }

  /* ---------------- moods & status ---------------- */

  function moodLoop() {
    const mood = Box.updateMood(boxData.notes, Heart);
    moodStatus(mood);
    setTimeout(moodLoop, 30000);
  }

  function moodStatus(override) {
    if (document.hidden) return;
    const mood = override || Heart.getMood();
    const s = boxData.settings;
    switch (mood) {
      case 'sleepy': els.status.textContent = 'the box is dreaming'; break;
      case 'lonely': els.status.textContent = s.boxName ? `${s.boxName} misses being opened` : 'the box misses being opened'; break;
      case 'excited': els.status.textContent = 'the heart is spinning!'; break;
      default:
        els.status.textContent = boxData.notes.length
          ? `holding ${boxData.notes.length} ${boxData.notes.length === 1 ? 'note' : 'notes'} for you`
          : 'the box is listening';
    }
  }

  /* ---------------- hearts burst ---------------- */

  function burstHearts() {
    const layer = document.createElement('div');
    layer.className = 'hearts-burst';
    const chars = ['\u2764', '\u2764\uFE0F', '\u{1F49C}', '\u{1F497}', '\u{1F49B}'];
    const baseX = window.innerWidth / 2;
    const baseY = window.innerHeight * 0.55;
    for (let i = 0; i < 14; i++) {
      const h = document.createElement('i');
      h.textContent = chars[i % chars.length];
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 90 + Math.random() * 160;
      h.style.left = `${baseX + Math.cos(a) * dist * 0.4}px`;
      h.style.top = `${baseY + Math.sin(a) * dist * 0.6}px`;
      h.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
      h.style.setProperty('--dy', `${Math.sin(a) * dist - 60}px`);
      h.style.animationDelay = `${Math.random() * 0.25}s`;
      h.style.fontSize = `${16 + Math.random() * 12}px`;
      layer.appendChild(h);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3200);
  }

  /* ---------------- sheets ---------------- */

  function openSheet(id) {
    $(id).classList.add('is-open');
    $('scrim').classList.add('is-on');
  }

  function closeSheet() {
    document.querySelectorAll('.sheet.is-open').forEach((s) => s.classList.remove('is-open'));
    $('scrim').classList.remove('is-on');
  }

  /* ---------------- toast ---------------- */

  let toastTimer = null;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ---------------- share ---------------- */

  function openShare() {
    const url = Share.senderUrl(boxCode);
    Share.makeQR($('share-qr'), url);
    $('share-code').textContent = boxData.code;
    const s = boxData.settings;
    $('share-title').textContent = s.boxName || 'The Keepsake Box';
    $('share-hint').textContent = 'scan to send a note, a doodle, or a secret';
    Share.open();
  }

  function printCard() {
    const url = Share.senderUrl(boxCode);
    Share.makeQR(els.printQr, url, 33);
    const s = boxData.settings;
    els.printName.textContent = s.boxName || 'The Keepsake Box';
    els.printCode.textContent = boxData.code;
    window.print();
  }

  /* ---------------- onboarding ---------------- */

  function startOnboarding() {
    const ob = $('onboard');
    ob.classList.remove('hidden');
    const step = { n: 0, total: 3, name: '', recipient: '', greeting: '' };
    const fields = [
      { label: 'what will this box be called?', ph: 'The little box on my shelf', key: 'name' },
      { label: 'who is it for?', ph: 'For the one I love', key: 'recipient' },
      { label: 'a note to find inside', ph: 'You, opening this, are the reason I built it.', key: 'greeting' },
    ];
    const title = $('ob-title');
    const desc = $('ob-desc');
    const input = $('ob-input');
    const label = $('ob-label');
    const backBtn = $('ob-back');
    const nextBtn = $('ob-next');
    const dots = $('ob-dots');

    function renderDots() {
      dots.innerHTML = '';
      for (let i = 0; i < step.total; i++) {
        const d = document.createElement('i');
        if (i <= step.n) d.classList.add('on');
        dots.appendChild(d);
      }
    }

    function show() {
      const f = fields[step.n];
      label.textContent = f.label;
      input.placeholder = f.ph;
      input.value = step[f.key] || '';
      input.focus();
      backBtn.classList.toggle('hidden', step.n === 0);
      nextBtn.textContent = step.n === step.total - 1 ? 'seal the box' : 'next';
      title.textContent = step.n === 0 ? 'you found an empty box' : step.n === 1 ? 'tell me who it\u2019s for' : 'leave a note inside';
      desc.textContent = step.n === 0
        ? 'It\u2019s waiting to become someone\u2019s keepsake box.'
        : step.n === 1
          ? 'Anyone you give the code to can send notes, doodles and secrets.'
          : 'This is the first thing they\u2019ll see when they open it.';
      renderDots();
    }

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); });
    nextBtn.addEventListener('click', next);
    backBtn.addEventListener('click', () => { if (step.n > 0) { step.n--; show(); } });

    async function next() {
      step[fields[step.n].key] = input.value.trim();
      if (step.n < step.total - 1) {
        step.n++;
        show();
        return;
      }
      nextBtn.disabled = true;
      nextBtn.textContent = 'making it\u2026';
      try {
        const res = await fetch('/api/box', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: step.name }),
        });
        const { code } = await res.json();
        boxCode = code;
        boxData = { settings: {}, notes: [], trinkets: [], garden: { level: 0, score: 0, stage: 'seed' }, diary: [], reads: 0, spins: 0, senderNames: {}, hasSecretDrawer: false };
        const patch = {};
        if (step.name) patch.boxName = step.name;
        if (step.recipient) patch.recipientName = step.recipient;
        if (step.greeting) patch.greeting = step.greeting;
        await fetch(`/api/box/${boxCode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: patch }),
        });
        localStorage.setItem('keepsake.code', boxCode);
        ob.classList.add('is-done');
        setTimeout(() => ob.remove(), 700);
        await loadBox(boxCode);
        run();
        toast('your box is alive \u2014 now share it');
        setTimeout(openShare, 900);
      } catch {
        nextBtn.disabled = false;
        nextBtn.textContent = 'seal the box';
      }
    }

    show();
  }

  /* ---------------- wire UI ---------------- */

    async function reload() {
    if (!(await loadBox(boxCode))) return;
    Theme.apply(boxData.settings);
    Heart.setPalette(boxData.settings.heartPalette);
    Box.setSettings(boxData.settings);
    Sound.setEnabled(boxData.settings.soundOn !== false);
    applyBox();
    renderAll();
    toast('the box is whole again');
  }

  $('btn-share').addEventListener('click', openShare);
  $('btn-tune').addEventListener('click', () => Settings.open(boxData.settings, (patch, all) => {
    boxData.settings = all;
    Heart.setPalette(all.heartPalette);
    Box.setSettings(all);
    Sound.setEnabled(all.soundOn !== false);
    fetch(`/api/box/${boxCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: patch }),
    }).catch(() => {});
    applyBox();
    refreshGarden();
  }, reload));
  $('tune-close').addEventListener('click', () => Settings.close());
  $('scrim').addEventListener('click', () => { closeSheet(); Settings.close(); Share.close(); });
  $('share-close').addEventListener('click', () => Share.close());
  $('share-print').addEventListener('click', printCard);
  $('share-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(Share.senderUrl(boxCode));
      toast('link copied');
    } catch {
      toast(Share.senderUrl(boxCode));
    }
  });

  document.querySelectorAll('[data-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.sheet === 'notes') { updateBadges(); refreshNotes(); }
      if (btn.dataset.sheet === 'trinkets') refreshTrinkets();
      if (btn.dataset.sheet === 'garden') refreshGarden();
      if (btn.dataset.sheet === 'diary') refreshDiary();
      if (btn.dataset.sheet === 'drawer') refreshDrawer();
      openSheet(`${btn.dataset.sheet}-sheet`);
    });
  });

  document.querySelectorAll('.sheet__close').forEach((b) => {
    b.addEventListener('click', () => closeSheet());
  });

  document.addEventListener('pointerdown', () => Sound.init(), { once: true });

  boot();
})();