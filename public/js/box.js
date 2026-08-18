/* ============================================================
   The Keepsake Box — lid, heart-spin gesture, secret knock
   ============================================================ */

const Box = (() => {
  let el = null;            /* .box */
  let heartMount = null;
  let heartCanvas = null;
  let lidEl = null;
  let statusEl = null;

  let open = false;
  let settings = {};
  let moodOverride = null;
  let moodUntil = 0;

  /* ---- spin gesture state ---- */
  let drag = null;
  let rotation = 0;
  let spins = 0;

  /* ---- knock state ---- */
  let knockTaps = [];
  let knockTimer = null;

  const callbacks = {
    onToggle: null,      /* (open) */
    onSpin: null,        /* () full spin completed */
    onKnockTap: null,    /* (n) progress count */
    onKnock: null,       /* () correct pattern */
    onKnockFail: null,   /* () */
  };

  function init(root, opts) {
    el = root.querySelector('.box');
    lidEl = root.querySelector('.box__lid');
    heartMount = root.querySelector('.heart-mount');
    heartCanvas = heartMount.querySelector('canvas');
    statusEl = root.querySelector('.status');
    Object.assign(callbacks, opts || {});

    /* open/close by tapping the body */
    const body = root.querySelector('.box__body');
    body.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.heart-mount')) return;
      toggle();
    });

    /* knock taps land on the lid */
    lidEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.heart-mount')) return;
      if (open) return;
      e.stopPropagation();
      knockTap();
    });

    wireSpin();
  }

  function toggle() {
    setOpen(!open);
  }

  function setOpen(v) {
    if (open === v) return;
    open = v;
    el.classList.toggle('is-open', v);
    if (v) {
      Sound.hinge();
      callbacks.onToggle && callbacks.onToggle(true);
    } else {
      Sound.knock();
      callbacks.onToggle && callbacks.onToggle(false);
    }
  }

  function isOpen() { return open; }

  /* ---------------- heart spin gesture ---------------- */

  function wireSpin() {
    heartMount.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      heartMount.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, rotStart: rotation, t: performance.now(), lastDx: 0, lastT: performance.now(), active: true };
      heartMount.classList.add('is-grabbed');
      Sound.tap();
    });

    heartMount.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId || !drag.active) return;
      const dx = e.clientX - drag.x;
      const now = performance.now();
      if (drag.lastX != null) {
        drag.lastDx = e.clientX - drag.lastX;
        drag.lastT = now;
      }
      drag.lastX = e.clientX;
      rotation = drag.rotStart + dx * 0.55;
      setHeartRotation(rotation);
    });

    heartMount.addEventListener('pointerup', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      drag.active = false;
      heartMount.classList.remove('is-grabbed');
      const dt = performance.now() - drag.lastT;
      const v = dt > 0 ? drag.lastDx / Math.max(8, dt) : 0;
      if (Math.abs(v) > 0.15) momentum(v);
      else Sound.tap();
      drag = null;
    });

    heartMount.addEventListener('pointercancel', () => {
      drag = null;
      heartMount.classList.remove('is-grabbed');
    });
  }

  function setHeartRotation(deg) {
    rotation = deg;
    heartCanvas.style.transform = `rotate(${deg}deg)`;
  }

  function momentum(vel) {
    let v = vel;
    const step = () => {
      v *= 0.94;
      rotation += v * 14;
      setHeartRotation(rotation);
      countSpins();
      if (Math.abs(v) > 0.08) requestAnimationFrame(step);
      else Sound.tap();
    };
    requestAnimationFrame(step);
  }

  function countSpins() {
    const n = Math.floor(Math.abs(rotation) / 360);
    if (n > spins) {
      spins = n;
      callbacks.onSpin && callbacks.onSpin();
    }
  }

  function resetSpin() {
    spins = 0;
    rotation = 0;
    setHeartRotation(0);
  }

  /* ---------------- secret knock ---------------- */

  function knockTap() {
    const now = performance.now();
    if (knockTaps.length > 0 && now - knockTaps[knockTaps.length - 1] > 2400) {
      knockTaps = [];
      clearTimeout(knockTimer);
    }
    knockTaps.push(now);
    Sound.knock();
    callbacks.onKnockTap && callbacks.onKnockTap(knockTaps.length);
    vibrate(18);

    const pattern = settings.knock || [250, 250, 520, 250, 250, 250, 520, 250, 250];
    if (knockTaps.length > 1) {
      const gap = knockTaps[knockTaps.length - 1] - knockTaps[knockTaps.length - 2];
      const expect = pattern[knockTaps.length - 2];
      if (gap < expect * 0.45 || gap > expect * 1.8) {
        failKnock();
        return;
      }
    }
    if (knockTaps.length === pattern.length + 1) {
      const correct = pattern.every((p, i) => {
        const g = knockTaps[i + 1] - knockTaps[i];
        return g >= p * 0.45 && g <= p * 1.8;
      });
      if (correct) successKnock();
      else failKnock();
    } else {
      clearTimeout(knockTimer);
      knockTimer = setTimeout(failKnock, 2600);
    }
  }

  function failKnock() {
    clearTimeout(knockTimer);
    knockTaps = [];
    callbacks.onKnockFail && callbacks.onKnockFail();
  }

  function successKnock() {
    clearTimeout(knockTimer);
    knockTaps = [];
    Sound.unlock();
    vibrate([40, 60, 40]);
    callbacks.onKnock && callbacks.onKnock();
  }

  /* ---------------- moods ---------------- */

  function updateMood(notes, heart) {
    const hour = new Date().getHours();
    let mood = 'idle';
    if (hour >= 23 || hour < 7) mood = 'sleepy';
    else {
      const last = notes.length ? Math.max(...notes.map((n) => n.ts)) : 0;
      if (last && Date.now() - last > 48 * 3600 * 1000) mood = 'lonely';
    }
    if (performance.now() < moodUntil && moodOverride) mood = moodOverride;
    heart.setMood(mood);
    return mood;
  }

  function excite(ms) {
    moodOverride = 'excited';
    moodUntil = performance.now() + (ms || 5000);
  }

  function setSettings(s) {
    settings = s || {};
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

  return {
    init,
    toggle,
    setOpen,
    isOpen,
    setSettings,
    setStatus,
    updateMood,
    excite,
    resetSpin,
    vibrate,
  };
})();

window.Box = Box;