/* ============================================================
   The Keepsake Box — box page
   QR-first welcome, notes, sealed secrets, heart
   ============================================================ */

(() => {
  let boxCode = null;
  let ws = null;

  const $ = (id) => document.getElementById(id);

  function timeStr(ts) {
    const d = new Date(ts);
    const mins = Math.round((Date.now() - d) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /* ---------------- websocket ---------------- */

  function connect(code, onMessage) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${proto}://${location.host}/ws?box=${encodeURIComponent(code)}&role=box`;

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
        if (alive) status('reaching for the box\u2026');
        setTimeout(() => { if (!alive || sock.readyState > 1) open(); }, alive ? 2500 : 1500);
      };
    }
    open();
    return {
      send(obj) { if (sock && sock.readyState === 1) sock.send(JSON.stringify(obj)); },
    };
  }

  /* ---------------- state & rendering ---------------- */

  const state = { notes: [], name: 'The Keepsake Box', code: '', cover: '', senders: 0, invite: null };

  function status(text) {
    $('status').textContent = text;
  }

  async function fileToDataUrl(file) {
    for (const max of [1400, 1000, 700]) {
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

  function renderCover() {
    const img = $('cover-img');
    const none = $('cover-none');
    const tools = $('cover-tools');
    const has = !!state.cover;
    img.classList.toggle('hidden', !has);
    none.classList.toggle('hidden', has);
    tools.classList.toggle('hidden', !has);
    if (has) {
      img.src = state.cover;
      const pod = $('cover-wrap');
      pod.classList.remove('is-popped');
      void pod.offsetWidth;
      pod.classList.add('is-popped');
    }
  }

  function renderHead() {
    $('box-name').textContent = state.name;
    $('box-code').textContent = state.code;
    $('welcome-code').textContent = state.code;
    $('share-title').textContent = state.name;
    document.title = `${state.name} \u2014 a lovebox`;
    const qr = $('welcome-qr');
    if (qr) qr.src = `/qr-code.svg?box=${encodeURIComponent(state.code)}`;
  }

  function renderNotes() {
    const list = $('notes');
    list.innerHTML = '';
    const notes = state.notes;

    if (!notes.length) {
      $('empty').classList.remove('hidden');
      list.classList.add('hidden');
      return;
    }
    $('empty').classList.add('hidden');
    list.classList.remove('hidden');

    notes.forEach((n) => {
      const card = document.createElement('div');
      card.className = 'note' + (n.read ? '' : ' is-unread');
      if (n.sealed && !n.read) card.classList.add('is-sealed');
      if (n.id === 'lilies') card.classList.add('note--lilies');

      const head = document.createElement('div');
      head.className = 'note__head';
      const sender = document.createElement('span');
      sender.className = 'note__sender';
      sender.textContent = n.sender;
      const time = document.createElement('span');
      time.className = 'note__time';
      time.textContent = timeStr(n.ts);
      head.append(sender, time);
      if (n.id === 'lilies') {
        const badge = document.createElement('img');
        badge.className = 'note__lily';
        badge.src = '/lily.svg';
        badge.alt = '';
        head.prepend(badge);
      }

      const body = document.createElement('div');
      body.className = 'note__body';
      body.textContent = n.content;
      if (!n.read) {
        const tag = document.createElement('span');
        tag.className = 'note__tag ' + (n.id === 'greeting' ? 'note__tag--greeting' : 'note__tag--new');
        tag.textContent = n.id === 'greeting' ? 'found inside' : 'new';
        head.insertBefore(tag, time);
      }
      card.appendChild(head);

      if (n.sealed && !n.read) {
        const seal = document.createElement('div');
        seal.className = 'note__seal';
        const hint = document.createElement('span');
        hint.textContent = 'a sealed secret \u2014 tap to break the wax';
        const wax = document.createElement('span');
        wax.className = 'note__wax';
        wax.innerHTML = '&#10087;';
        seal.append(hint, wax);
        card.appendChild(seal);
      } else {
        if (n.img) {
          const im = new Image();
          im.className = 'note__img';
          im.src = n.img;
          im.alt = '';
          im.loading = 'lazy';
          card.appendChild(im);
        }
        if (n.content) card.appendChild(body);
      }

      if (n.sealed && !n.read) {
        card.addEventListener('click', () => breakSeal(n, card));
      } else if (!n.read) {
        card.addEventListener('click', () => markRead(n));
      }
      list.appendChild(card);
    });
  }

  function markRead(n) {
    if (n.read) return;
    n.read = true;
    ws.send({ type: 'read', id: n.id });
    renderNotes();
  }

  function breakSeal(n, card) {
    if (n.read) return;
    spinHeart();
    Sound.unlock();
    n.read = true;
    ws.send({ type: 'read', id: n.id });
    setTimeout(() => {
      card.classList.add('is-revealed');
      card.classList.remove('is-sealed', 'is-unread');
      renderNotes();
      status('the seal is broken');
    }, 950);
    setTimeout(() => moodStatus(), 2400);
  }

  /* ---------------- heart ---------------- */

  function spinHeart() {
    const pod = $('heartpod');
    pod.classList.remove('is-spinning');
    void pod.offsetWidth;
    pod.classList.add('is-spinning');
    Sound.spin();
    setTimeout(() => pod.classList.remove('is-spinning'), 950);
  }

  function exciteHeart() {
    const pod = $('heartpod');
    pod.classList.remove('is-excited');
    void pod.offsetWidth;
    pod.classList.add('is-excited');
    setTimeout(() => pod.classList.remove('is-excited'), 700);
  }

  function moodStatus() {
    if (document.hidden) return;
    if (state.senders > 0) {
      status(state.senders === 1 ? '1 person is here' : `${state.senders} people are here`);
      return;
    }
    const unread = state.notes.filter((n) => !n.read).length;
    status(unread > 0
      ? `${unread} ${unread === 1 ? 'note' : 'notes'} waiting`
      : state.notes.length
        ? `holding ${state.notes.length} ${state.notes.length === 1 ? 'note' : 'notes'} for you`
        : 'the box is listening');
  }

  function burstHearts() {
    const layer = document.createElement('div');
    layer.className = 'hearts-burst';
    const chars = ['\u2764', '\u2764\uFE0F', '\u{1F49C}', '\u{1F497}', '\u{1F49B}'];
    const baseX = window.innerWidth / 2;
    const baseY = window.innerHeight * 0.5;
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
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 2200);
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  /* ---------------- date invitation ---------------- */

  function renderInvite() {
    const inv = state.invite;
    const sec = $('invite');
    if (!inv || !inv.asked) {
      sec.classList.add('hidden');
      return;
    }
    sec.classList.remove('hidden');
    $('invite-ask').classList.toggle('hidden', !!inv.confirmed);
    $('invite-done').classList.toggle('hidden', !inv.confirmed);
  }

  async function confirmInvite() {
    if (state.invite && state.invite.confirmed) return;
    state.invite = { ...(state.invite || {}), confirmed: true, at: Date.now() };
    renderInvite();
    Sound.heart();
    burstHearts();
    status('she said yes \u2014 it\u2019s a date!');
    await fetch(`/api/box/${boxCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite: { confirmed: true } }),
    }).catch(() => {});
    setTimeout(() => moodStatus(), 2600);
  }

  /* ---------------- memories gallery (swipe carousel) ---------------- */

  let memPhotos = [];
  let memIndex = 0;
  let memAutoTimer = null;
  let memStartX = 0;
  let memDragging = false;

  async function renderMemories() {
    let photos;
    try {
      const res = await fetch('/api/photos');
      photos = (await res.json()).photos || [];
    } catch { return; }
    memPhotos = photos;
    $('mem-count').textContent = photos.length ? `\u00b7 ${photos.length}` : '';
    const track = $('mem-track');
    const segs = $('mem-segs');
    track.innerHTML = '';
    segs.innerHTML = '';
    photos.forEach((file, i) => {
      const slide = document.createElement('div');
      slide.className = 'mem-slide';
      slide.style.flex = '0 0 100%';
      const img = document.createElement('img');
      img.src = `/photos/${file}`;
      img.alt = `memory ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';
      slide.appendChild(img);
      slide.addEventListener('click', () => openLightbox(i));
      track.appendChild(slide);

      const seg = document.createElement('button');
      seg.className = 'mem-seg' + (i === 0 ? ' active' : '');
      seg.setAttribute('aria-label', `Go to photo ${i + 1}`);
      seg.addEventListener('click', () => goToSlide(i));
      segs.appendChild(seg);
    });
    updateCarousel();
    setupTouch();
    startAutoPlay();
  }

  function updateCarousel() {
    const track = $('mem-track');
    if (!track) return;
    track.style.transform = `translateX(${-memIndex * 100}%)`;
    track.querySelectorAll('.mem-slide').forEach((s, i) => {
      s.classList.toggle('active', i === memIndex);
    });
    document.querySelectorAll('.mem-seg').forEach((d, i) => {
      d.classList.toggle('active', i === memIndex);
    });
    const counter = $('mem-counter');
    if (counter && memPhotos.length) {
      counter.textContent = `${String(memIndex + 1).padStart(2, '0')} / ${String(memPhotos.length).padStart(2, '0')}`;
    }
  }

  function goToSlide(i) {
    if (i < 0) i = memPhotos.length - 1;
    if (i >= memPhotos.length) i = 0;
    memIndex = i;
    updateCarousel();
  }

  function nextSlide() { goToSlide(memIndex + 1); }
  function prevSlide() { goToSlide(memIndex - 1); }

  function setupTouch() {
    const track = $('mem-track');
    track.addEventListener('touchstart', (e) => {
      memStartX = e.touches[0].clientX;
      memDragging = true;
      stopAutoPlay();
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
      if (!memDragging) return;
      const dx = e.touches[0].clientX - memStartX;
      if (Math.abs(dx) > 30) {
        dx > 0 ? prevSlide() : nextSlide();
        memDragging = false;
      }
    }, { passive: true });
    track.addEventListener('touchend', () => {
      memDragging = false;
      startAutoPlay();
    });
    track.addEventListener('mousedown', (e) => {
      memStartX = e.clientX;
      memDragging = true;
      stopAutoPlay();
    });
    track.addEventListener('mousemove', (e) => {
      if (!memDragging) return;
      const dx = e.clientX - memStartX;
      if (Math.abs(dx) > 40) {
        dx > 0 ? prevSlide() : nextSlide();
        memDragging = false;
      }
    });
    track.addEventListener('mouseup', () => {
      memDragging = false;
      startAutoPlay();
    });
    track.addEventListener('mouseleave', () => {
      memDragging = false;
      startAutoPlay();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });
  }

  function startAutoPlay() {
    stopAutoPlay();
    memAutoTimer = setInterval(nextSlide, 4500);
  }
  function stopAutoPlay() {
    if (memAutoTimer) clearInterval(memAutoTimer);
    memAutoTimer = null;
  }

  /* ---------------- lightbox (for full-screen) ---------------- */

  let lbIndex = 0;
  function openLightbox(i) {
    lbIndex = i;
    $('lb-img').src = `/photos/${memPhotos[i]}`;
    $('lightbox').classList.add('is-on');
    stopAutoPlay();
  }
  function closeLightbox() {
    $('lightbox').classList.remove('is-on');
    startAutoPlay();
  }
  function stepLightbox(d) {
    if (!memPhotos.length) return;
    lbIndex = (lbIndex + d + memPhotos.length) % memPhotos.length;
    $('lb-img').src = `/photos/${memPhotos[lbIndex]}`;
  }

  /* ---------------- welcome (QR first) ---------------- */

  function showWelcome() {
    const w = $('welcome');
    w.classList.remove('hidden');
    $('welcome-open').addEventListener('click', () => {
      w.classList.add('is-gone');
      setTimeout(() => w.classList.add('hidden'), 400);
    }, { once: true });
  }

  /* ---------------- share ---------------- */

  function openShare() {
    $('share-qr').src = `/qr-code.svg?box=${encodeURIComponent(boxCode)}`;
    $('share-code').textContent = boxCode;
    Share.open();
  }

  /* ---------------- load & run ---------------- */

  async function loadBox(code) {
    try {
      const res = await fetch(`/api/box/${encodeURIComponent(code)}`);
      if (!res.ok) return false;
      const b = await res.json();
      state.code = b.code;
      state.name = b.name || 'The Keepsake Box';
      state.cover = b.cover || '';
      state.notes = b.notes || [];
      state.invite = b.invite || null;
      boxCode = b.code;
      localStorage.setItem('keepsake.code', b.code);
      return true;
    } catch { return false; }
  }

  function run(autoOpen) {
    renderHead();
    renderCover();
    renderNotes();
    renderInvite();
    renderMemories();
    moodStatus();

    ws = connect(boxCode, (m) => {
      if (m.type === 'note') {
        state.notes.unshift(m.note);
        state.notes = state.notes.slice(0, 200);
        Sound.noteIn();
        exciteHeart();
        spinHeart();
        status('a note just arrived \u2014 open me');
        renderNotes();
        setTimeout(() => moodStatus(), 3000);
      } else if (m.type === 'heartspin') {
        Sound.heart();
        burstHearts();
        spinHeart();
        status('they spun the heart back!');
        setTimeout(() => moodStatus(), 2600);
      } else if (m.type === 'cover') {
        state.cover = m.cover || '';
        renderCover();
      } else if (m.type === 'presence') {
        state.senders = m.senders || 0;
        moodStatus();
      } else if (m.type === 'invite') {
        if (m.invite) {
          state.invite = m.invite;
          renderInvite();
          if (m.invite.confirmed) {
            Sound.heart();
            burstHearts();
            status('she said yes \u2014 it\u2019s a date!');
            setTimeout(() => moodStatus(), 2600);
          }
        }
      } else if (m.type === 'note:read') {
        const n = state.notes.find((x) => x.id === m.id);
        if (n) { n.read = true; renderNotes(); }
      } else if (m.type === 'error') {
        toast('that box isn\u2019t here');
      }
    });

    $('btn-share').addEventListener('click', showWelcome);
    $('btn-empty-share').addEventListener('click', showWelcome);
    $('share-close').addEventListener('click', () => Share.close());
    $('scrim').addEventListener('click', () => Share.close());

    $('lb-close').addEventListener('click', closeLightbox);
    $('lightbox').addEventListener('click', (e) => {
      if (e.target === $('lightbox')) closeLightbox();
    });
    $('lb-prev').addEventListener('click', (e) => { e.stopPropagation(); stepLightbox(-1); });
    $('lb-next').addEventListener('click', (e) => { e.stopPropagation(); stepLightbox(1); });
    document.addEventListener('keydown', (e) => {
      if (!$('lightbox').classList.contains('is-on')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });

    $('mem-prev').addEventListener('click', prevSlide);
    $('mem-next').addEventListener('click', nextSlide);

    $('invite-yes').addEventListener('click', confirmInvite);
    $('share-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(Share.boxUrl(boxCode));
        toast('link copied');
      } catch {
        toast(Share.boxUrl(boxCode));
      }
    });

    /* cover picture */
    $('btn-set-cover').addEventListener('click', () => $('cover-file').click());
    $('btn-change-cover').addEventListener('click', () => $('cover-file').click());
    $('btn-remove-cover').addEventListener('click', async () => {
      state.cover = '';
      renderCover();
      await fetch(`/api/box/${boxCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover: '' }),
      }).catch(() => {});
      toast('picture removed');
    });
    $('cover-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const url = await fileToDataUrl(file);
      if (!url) { toast('that picture was too big to carry'); return; }
      state.cover = url;
      renderCover();
      await fetch(`/api/box/${boxCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover: url }),
      }).catch(() => {});
      toast('your picture is up');
    });

    document.addEventListener('pointerdown', () => {
      Sound.init();
      Particles.init();
      Music.init();
    }, { once: true });

    if (autoOpen) {
      const w = $('welcome');
      w.classList.add('hidden');
    } else {
      showWelcome();
    }
  }

  /* ---------------- onboarding ---------------- */

  function startOnboarding() {
    const ob = $('onboard');
    ob.classList.remove('hidden');

    $('ob-go').addEventListener('click', async () => {
      const name = $('ob-name').value.trim();
      const greeting = $('ob-greeting').value.trim();
      const btn = $('ob-go');
      btn.disabled = true;
      btn.textContent = 'making it\u2026';
      try {
        const res = await fetch('/api/box', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, greeting }),
        });
        const { code } = await res.json();
        boxCode = code;
        localStorage.setItem('keepsake.code', code);
        ob.classList.add('is-done');
        setTimeout(() => ob.remove(), 400);
        await loadBox(code);
        run();
        toast('your box is alive \u2014 share the QR');
      } catch {
        btn.disabled = false;
        btn.textContent = 'make the box';
      }
    });

    $('ob-have').addEventListener('click', () => $('ob-enter').classList.remove('hidden'));

    $('ob-join').addEventListener('click', async () => {
      const code = $('ob-code').value.trim().toUpperCase();
      if (!code) return;
      const ok = await loadBox(code);
      if (!ok) { $('ob-err').classList.remove('hidden'); return; }
      ob.classList.add('is-done');
      setTimeout(() => ob.remove(), 400);
      run();
    });
  }

  /* ---------------- boot ---------------- */

  async function boot() {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get('box');
    const autoOpen = params.get('open') === '1';
    const stored = localStorage.getItem('keepsake.code');
    let candidate = codeFromUrl ? codeFromUrl.toUpperCase() : stored;

    if (!candidate) {
      try {
        const res = await fetch('/api/default');
        const d = await res.json();
        candidate = d.code;
      } catch {}
    }

    if (candidate) {
      const ok = await loadBox(candidate);
      if (ok) { run(autoOpen); return; }
      if (codeFromUrl) {
        status('a box that isn\u2019t here');
        startOnboarding();
        return;
      }
      localStorage.removeItem('keepsake.code');
    }
    startOnboarding();
  }

  try {
    fetch('/api/config').then((r) => r.json()).then((c) => Share.setPublicUrl(c.publicUrl)).catch(() => {});
  } catch {}

  boot();
})();