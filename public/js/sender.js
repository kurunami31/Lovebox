/* ============================================================
   The Keepsake Box — sender page
   note / sealed secret / heart
   ============================================================ */

(() => {
  let boxCode = null;
  let ws = null;
  let pendingImg = '';

  const $ = (id) => document.getElementById(id);
  const qs = (name) => new URLSearchParams(location.search).get(name);

  async function fileToDataUrl(file) {
    for (const max of [1000, 700, 500]) {
      try {
        let bmp;
        if ('createImageBitmap' in window) {
          bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } else {
          const url = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          bmp = img;
        }
        const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(bmp.width * scale));
        cv.height = Math.max(1, Math.round(bmp.height * scale));
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        if ('close' in bmp) bmp.close();
        const url = cv.toDataURL('image/jpeg', 0.72);
        if (url.length > 2000000) continue;
        return url;
      } catch { return null; }
    }
    return null;
  }

  function show(el) {
    document.querySelectorAll('#wrongbox, #pair, #sendcard').forEach((x) => x.classList.add('hidden'));
    $(el).classList.remove('hidden');
  }

  /* ---------------- websocket ---------------- */

  function connect(code, onMessage) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${proto}://${location.host}/ws?box=${encodeURIComponent(code)}&role=sender`;

    let sock = null;
    let alive = false;

    function open() {
      sock = new WebSocket(wsUrl);
      sock.onmessage = (e) => {
        let m;
        try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'hello') alive = true;
        onMessage(m);
      };
      sock.onclose = () => {
        setTimeout(() => { if (!alive || sock.readyState > 1) open(); }, alive ? 2500 : 1500);
      };
    }
    open();
    return {
      send(obj) { if (sock && sock.readyState === 1) sock.send(JSON.stringify(obj)); },
    };
  }

  function setPresence(on) {
    const p = $('sc-presence');
    p.classList.toggle('is-on', on);
    p.querySelector('span').textContent = on ? 'they\u2019re home' : 'offline';
  }

  /* ---------------- sender page flow ---------------- */

  async function openBox(code) {
    try {
      const res = await fetch(`/api/box/${encodeURIComponent(code)}`);
      if (!res.ok) return false;
      const b = await res.json();
      boxCode = b.code;
      $('sc-title').textContent = b.name || 'The Keepsake Box';
      $('sc-code').textContent = b.code;
      const savedName = localStorage.getItem('keepsake.sendername') || '';
      $('sender-name').value = savedName;

      // show invitation if exists and not confirmed
      const invite = b.invite;
      const inviteCard = $('invite-card');
      if (invite && invite.asked && !invite.confirmed) {
        inviteCard.classList.remove('hidden');
      } else {
        inviteCard.classList.add('hidden');
      }

      show('sendcard');
      return true;
    } catch { return false; }
  }

  function wireSend() {
    const text = $('note-text');
    const sendBtn = $('send-btn');

    function canSend() {
      return text.value.trim().length > 0 || pendingImg.length > 0;
    }
    text.addEventListener('input', () => {
      sendBtn.disabled = !canSend();
      if (canSend()) sendBtn.classList.remove('is-sent');
    });

    $('photo-add').addEventListener('click', () => $('photo-file').click());
    $('photo-cam').addEventListener('click', () => $('photo-cam-file').click());
    $('photo-file').addEventListener('change', (e) => pick(e.target.files[0]));
    $('photo-cam-file').addEventListener('change', (e) => pick(e.target.files[0]));
    $('photo-x').addEventListener('click', clearPhoto);

    async function pick(file) {
      if (!file) return;
      const url = await fileToDataUrl(file);
      if (!url) { toast('that picture was too big to carry'); return; }
      pendingImg = url;
      $('photo-img').src = url;
      $('photo-preview').classList.remove('hidden');
      sendBtn.disabled = false;
      sendBtn.classList.remove('is-sent');
    }

    function clearPhoto() {
      pendingImg = '';
      $('photo-img').removeAttribute('src');
      $('photo-preview').classList.add('hidden');
      $('photo-file').value = '';
      $('photo-cam-file').value = '';
      sendBtn.disabled = !canSend();
    }

    sendBtn.addEventListener('click', () => {
      if (!canSend()) return;
      const sender = $('sender-name').value.trim().slice(0, 30) || 'Someone';
      localStorage.setItem('keepsake.sendername', sender);
      ws.send({ type: 'note', content: text.value.trim(), img: pendingImg, sealed: $('note-seal').checked, sender });
      Sound.noteIn();
      text.value = '';
      $('note-seal').checked = false;
      clearPhoto();
      sendBtn.textContent = 'sent \u2014 it\u2019s on its way';
      sendBtn.classList.add('is-sent');
      setTimeout(() => { sendBtn.textContent = 'send'; }, 2600);
    });

    $('btn-heart').addEventListener('click', () => {
      const btn = $('btn-heart');
      ws.send({ type: 'heart', from: ($('sender-name').value.trim().slice(0, 30) || '') });
      Sound.heart();
      btn.classList.remove('is-pressed');
      void btn.offsetWidth;
      btn.classList.add('is-pressed');
      burstHearts();
      showSpun();
    });

    $('invite-yes-sender').addEventListener('click', async () => {
      if (!boxCode) return;
      const btn = $('invite-yes-sender');
      btn.disabled = true;
      btn.textContent = 'saving...';
      try {
        await fetch(`/api/box/${boxCode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite: { confirmed: true } }),
        });
        $('invite-card').classList.add('hidden');
        Sound.heart();
        burstHearts();
        showSpun();
      } catch {
        btn.disabled = false;
        btn.textContent = 'yes \u2014 it\u2019s a date';
      }
    });
  }

  function wirePair() {
    $('pair-go').addEventListener('click', pairGo);
    $('pair-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') pairGo(); });
    $('wrong-back').addEventListener('click', () => {
      $('pair-code').value = '';
      show('pair');
    });
    $('pair-code').addEventListener('input', () => $('pair-err').classList.add('hidden'));

    async function pairGo() {
      const code = $('pair-code').value.trim().toUpperCase();
      if (!code) return;
      const ok = await openBox(code);
      if (!ok) {
        $('pair-err').textContent = 'that code doesn\u2019t match any box';
        $('pair-err').classList.remove('hidden');
        return;
      }
      start();
    }
  }

  function start() {
    wireSend();
    ws = connect(boxCode, (m) => {
      if (m.type === 'presence') setPresence(m.senders > 0);
      else if (m.type === 'heartspin') {
        Sound.heart();
        burstHearts();
        showSpun();
      } else if (m.type === 'error') {
        show('wrongbox');
      }
    });
    document.addEventListener('pointerdown', () => Sound.init(), { once: true });
  }

  /* ---------------- feedback ---------------- */

  function burstHearts() {
    const layer = $('burst');
    layer.innerHTML = '';
    const chars = ['\u2764', '\u2764\uFE0F', '\u{1F49C}', '\u{1F497}', '\u{1F49B}'];
    const baseX = window.innerWidth / 2;
    const baseY = window.innerHeight * 0.55;
    for (let i = 0; i < 12; i++) {
      const h = document.createElement('i');
      h.textContent = chars[i % chars.length];
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 70 + Math.random() * 130;
      h.style.left = `${baseX + Math.cos(a) * dist * 0.35}px`;
      h.style.top = `${baseY + Math.sin(a) * dist * 0.5}px`;
      h.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
      h.style.setProperty('--dy', `${Math.sin(a) * dist - 50}px`);
      h.style.animationDelay = `${Math.random() * 0.2}s`;
      h.style.fontSize = `${16 + Math.random() * 12}px`;
      layer.appendChild(h);
    }
    setTimeout(() => { layer.innerHTML = ''; }, 2200);
  }

  function showSpun() {
    const s = $('spun');
    s.classList.remove('is-on');
    void s.offsetWidth;
    s.classList.add('is-on');
    clearTimeout(showSpun._t);
    showSpun._t = setTimeout(() => s.classList.remove('is-on'), 2200);
  }

  function toast(text) {
    const t = $('spun');
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  /* ---------------- boot ---------------- */

  async function boot() {
    const code = qs('box');
    if (code) {
      const ok = await openBox(code);
      if (ok) { start(); return; }
      show('wrongbox');
      return;
    }
    wirePair();
    show('pair');
    $('pair-code').focus();
  }

  boot();
})();