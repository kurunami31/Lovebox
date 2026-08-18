/* ============================================================
   The Keepsake Box — the pixel heart with a personality
   ============================================================ */

const Heart = (() => {
  const ROWS = [
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
  const COLS = 18;
  const SCALE = 10;

  const PALETTES = {
    ruby:     { dark: '#a91b34', base: '#e2354f', light: '#ff7a8c', glow: '#ffb3bd' },
    rose:     { dark: '#c26a7e', base: '#e894a5', light: '#ffc9d4', glow: '#ffe0e7' },
    gold:     { dark: '#a9741d', base: '#e0a53c', light: '#ffd97a', glow: '#ffedc2' },
    sapphire: { dark: '#274a8f', base: '#4f7fd9', light: '#9cc0ff', glow: '#cdddff' },
  };

  let canvas = null;
  let ctx = null;
  let palette = PALETTES.ruby;
  let mood = 'idle';
  let raf = null;
  let pulseUntil = 0;

  function setup(cv) {
    canvas = cv;
    ctx = cv.getContext('2d');
    canvas.width = COLS * SCALE;
    canvas.height = ROWS.length * SCALE;
    raf = requestAnimationFrame(frame);
  }

  function setPalette(name) {
    palette = PALETTES[name] || PALETTES.ruby;
  }

  function setMood(m) {
    mood = m || 'idle';
  }

  function getMood() {
    return mood;
  }

  function pulse(ms) {
    pulseUntil = performance.now() + (ms || 900);
  }

  const px = (c, r, color, s = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(c * SCALE, r * SCALE, SCALE * s, SCALE);
  };

  const INK = '#3a1117';

  function face(e, blush, mouth) {
    if (e === 'happy') {
      px(5, 5, INK); px(6, 6, INK); px(7, 5, INK);
      px(10, 5, INK); px(11, 6, INK); px(12, 5, INK);
    } else if (e === 'closed') {
      px(5, 6, INK, 3); px(10, 6, INK, 3);
    } else if (e === 'droopy') {
      px(5, 5, INK); px(6, 6, INK); px(7, 6, INK);
      px(10, 6, INK); px(11, 6, INK); px(12, 5, INK);
    } else {
      px(6, 6, INK); px(11, 6, INK);
    }
    if (blush) {
      px(3, 8, palette.glow); px(4, 8, palette.glow);
      px(13, 8, palette.glow); px(14, 8, palette.glow);
    }
    if (mouth === 'smile') {
      px(7, 7, INK); px(11, 7, INK); px(8, 8, INK); px(10, 8, INK); px(9, 9, INK);
    } else if (mouth === 'o') {
      px(9, 8, INK); px(9, 9, INK);
    } else if (mouth === 'half') {
      px(7, 8, INK, 5);
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const t = performance.now();
    const s = t / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let beat = 1;
    let sway = 0;
    let tilt = 0;
    let eyes = 'happy';
    let mouth = 'smile';
    let blush = false;

    const hot = t < pulseUntil;

    switch (mood) {
      case 'excited':
        beat = 1 + 0.055 * Math.sin(2 * Math.PI * 2.3 * s);
        tilt = 3 * Math.sin(2 * Math.PI * 1.1 * s);
        eyes = 'open';
        blush = true;
        break;
      case 'sleepy':
        beat = 1 + 0.02 * Math.sin(2 * Math.PI * 0.45 * s);
        tilt = 2.5;
        eyes = 'closed';
        mouth = 'o';
        break;
      case 'lonely':
        beat = 1 + 0.02 * Math.sin(2 * Math.PI * 0.7 * s);
        sway = 4.5 * Math.sin(2 * Math.PI * 0.22 * s);
        tilt = 1.6 * Math.sin(2 * Math.PI * 0.22 * s + 1);
        eyes = 'droopy';
        mouth = 'half';
        break;
      default:
        beat = 1 + 0.028 * Math.sin(2 * Math.PI * 1.05 * s);
        if (hot) { beat = 1 + 0.05 * Math.sin(2 * Math.PI * 2.6 * s); eyes = 'open'; blush = true; }
        break;
    }

    ctx.save();
    ctx.translate(canvas.width / 2 + sway * SCALE * 0.4, canvas.height / 2);
    ctx.rotate((tilt * Math.PI) / 180);
    ctx.scale(beat, beat);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    for (let r = 0; r < ROWS.length; r++) {
      for (let c = 0; c < COLS; c++) {
        if (ROWS[r][c] !== '#') continue;
        let color = palette.base;
        if (c >= 2 && c <= 4 && r >= 2 && r <= 4) color = palette.light;
        if (c === 5 && r === 3) color = palette.light;
        ctx.fillStyle = color;
        ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE);
      }
    }

    face(eyes, blush, mouth);
    ctx.restore();
  }

  return { setup, setPalette, setMood, getMood, pulse, palette: () => palette };
})();

window.Heart = Heart;
