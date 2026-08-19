/* ============================================================
   The Keepsake Box — a small pixel heart with moods
   ============================================================ */

const Heart = (() => {
  const SHAPE = [
    '..XX...XX..',
    '.XXXX.XXXX.',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    'XXXXXXXXXXX',
    '.XXXXXXXXX.',
    '..XXXXXXX..',
    '...XXXXX...',
    '....XXX....',
    '.....X.....',
  ];
  const CELL = 6;
  const W = SHAPE[0].length * CELL;
  const H = SHAPE.length * CELL;
  const BASE = '#c98a97';
  const FACE = '#7a3a48';
  const BLUSH = '#e8b7c0';

  let canvas = null;
  let ctx = null;
  let mood = 'calm';

  function drawRect(cx, cy, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cx * CELL, cy * CELL, w * CELL, h * CELL);
  }

  function drawFace() {
    if (mood === 'sleepy') {
      /* closed eyes + small o mouth */
      drawRect(2, 4, 3, 1, FACE);
      drawRect(6, 4, 3, 1, FACE);
      drawRect(5, 6, 1, 1, FACE);
    } else if (mood === 'happy') {
      /* round happy eyes, open smile, blush */
      drawRect(3, 3, 1, 2, FACE);
      drawRect(7, 3, 1, 2, FACE);
      drawRect(3, 5, 4, 1, FACE);
      drawRect(4, 6, 2, 1, FACE);
      drawRect(1, 5, 1, 1, BLUSH);
      drawRect(9, 5, 1, 1, BLUSH);
    } else {
      /* calm: flat eyes + soft smile */
      drawRect(3, 3, 2, 1, FACE);
      drawRect(6, 3, 2, 1, FACE);
      drawRect(4, 6, 2, 1, FACE);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (let r = 0; r < SHAPE.length; r++) {
      for (let c = 0; c < SHAPE[0].length; c++) {
        if (SHAPE[r][c] === 'X') drawRect(c, r, 1, 1, BASE);
      }
    }
    drawFace();
  }

  function setup(el) {
    canvas = el;
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    draw();
  }

  function setMood(m) {
    if (m !== mood) {
      mood = m;
      draw();
    }
  }

  function getMood() { return mood; }

  return { setup, setMood, getMood };
})();