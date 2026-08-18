/* ============================================================
   The Keepsake Box — tiny WebAudio sounds
   ============================================================ */

const Sound = (() => {
  let ctx = null;

  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }

  function tone(freq, dur, type, delay = 0, vol = 0.12) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const noteIn = () => { tone(523, 0.35, 'sine'); tone(659, 0.4, 'sine', 0.09); };
  const heart = () => { tone(440, 0.2, 'sine'); tone(554, 0.3, 'sine', 0.1); };
  const spin = () => { tone(392, 0.18, 'triangle'); tone(523, 0.22, 'triangle', 0.12); tone(659, 0.28, 'triangle', 0.24); };
  const unlock = () => { tone(660, 0.15, 'sine', 0, 0.18); tone(880, 0.22, 'sine', 0.08, 0.15); };
  const tap = () => tone(880, 0.08, 'sine', 0, 0.08);

  return { init, noteIn, heart, spin, unlock, tap };
})();