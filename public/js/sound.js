/* ============================================================
   The Keepsake Box — sound design (procedural WebAudio, no files)
   ============================================================ */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.42;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function out(gainNode) {
    gainNode.connect(master);
    const t = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(1, t + 0.015);
    return t;
  }

  /* ---- primitives ---- */

  function tone(freq, { dur = 0.5, type = 'sine', vol = 0.5, attack = 0.01, decay = null, slideTo = null } = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    const end = decay || dur;
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(end, attack + 0.02));
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + Math.max(end, attack + 0.02) + 0.05);
  }

  function noise({ dur = 0.3, vol = 0.3, type = 'lowpass', freq = 400, freqEnd = null, attack = 0.005 } = {}) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    const t = ctx.currentTime;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* ---- the sounds ---- */

  function knock() {
    if (!ensure()) return;
    tone(160, { type: 'sine', dur: 0.09, vol: 0.5, decay: 0.06, slideTo: 60 });
    noise({ dur: 0.05, vol: 0.16, freq: 500, freqEnd: 180 });
  }

  function hinge() {
    if (!ensure()) return;
    noise({ dur: 0.7, vol: 0.1, type: 'bandpass', freq: 700, freqEnd: 2600 });
    noise({ dur: 0.5, vol: 0.05, type: 'bandpass', freq: 3200, freqEnd: 900 });
  }

  function chime(kind) {
    if (!ensure()) return;
    if (kind === 'heartbeat') {
      for (let i = 0; i < 2; i++) {
        const t = i * 0.26;
        setTimeout(() => {
          tone(120, { dur: 0.16, type: 'sine', vol: 0.45, decay: 0.1, slideTo: 55 });
          noise({ dur: 0.09, vol: 0.14, freq: 400, freqEnd: 120 });
        }, t * 1000);
      }
    } else if (kind === 'knock') {
      [0, 260, 640].forEach((ms) => setTimeout(knock, ms));
    } else {
      const notes = [659.25, 783.99, 987.77];
      notes.forEach((f, i) => tone(f, { dur: 1.1, type: 'sine', vol: 0.16, attack: 0.01, decay: 1.1, ...(i > 0 ? {} : {}) }));
      tone(329.63, { dur: 1.4, type: 'sine', vol: 0.12, decay: 1.4 });
    }
  }

  function spin() {
    if (!ensure()) return;
    noise({ dur: 0.4, vol: 0.08, type: 'bandpass', freq: 500, freqEnd: 1400 });
  }

  function burst() {
    if (!ensure()) return;
    const notes = [1046.5, 1318.5, 1568, 2093];
    notes.forEach((f, i) => {
      setTimeout(() => {
        tone(f, { dur: 0.5, type: 'triangle', vol: 0.13, decay: 0.5 });
        tone(f * 2, { dur: 0.3, type: 'sine', vol: 0.05, decay: 0.3 });
      }, i * 90);
    });
  }

  function grow() {
    if (!ensure()) return;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => tone(f, { dur: 0.35, type: 'triangle', vol: 0.12, decay: 0.35 }), i * 110);
    });
  }

  function unlock() {
    if (!ensure()) return;
    knock();
    setTimeout(() => { chime('bell'); }, 260);
    setTimeout(() => { tone(1318.5, { dur: 0.6, type: 'triangle', vol: 0.12, decay: 0.6 }); }, 520);
  }

  function fail() {
    if (!ensure()) return;
    tone(220, { dur: 0.25, type: 'sawtooth', vol: 0.08, decay: 0.22, slideTo: 130 });
  }

  function noteIn() {
    if (!ensure()) return;
    tone(880, { dur: 0.35, type: 'sine', vol: 0.1, decay: 0.32 });
    setTimeout(() => tone(1318.5, { dur: 0.4, type: 'sine', vol: 0.08, decay: 0.36 }), 120);
  }

  function tap() {
    if (!ensure()) return;
    tone(600, { dur: 0.05, type: 'sine', vol: 0.12, decay: 0.04 });
  }

  /* ---- public ---- */

  function init() { ensure(); }
  function setEnabled(on) { enabled = on; }
  function isEnabled() { return enabled; }

  const play = (fn) => (...args) => {
    if (!enabled) return;
    ensure();
    fn(...args);
  };

  return {
    init,
    setEnabled,
    isEnabled,
    knock: play(knock),
    hinge: play(hinge),
    chime: play(chime),
    spin: play(spin),
    burst: play(burst),
    grow: play(grow),
    unlock: play(unlock),
    fail: play(fail),
    noteIn: play(noteIn),
    tap: play(tap),
  };
})();

window.Sound = Sound;
