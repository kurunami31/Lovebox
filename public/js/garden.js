/* ============================================================
   The Keepsake Box — the garden that grows with the love
   ============================================================ */

const Garden = (() => {
  const P = 16;
  let canvas = null;
  let ctx = null;

  const PAL = {
    soil: '#4a3120',
    pot: '#c0623f',
    potD: '#9a4a2c',
    potL: '#d9825c',
    stem: '#5a9a4b',
    leaf: '#6fae62',
    leafD: '#4c8a43',
    leafL: '#8fc77f',
    bloom: '#e8a0b8',
    bloomD: '#c46a8c',
    center: '#f2c14e',
    seed: '#8a6a44',
    heart: '#e2354f',
  };

const STAGES = {
    seed: {
      rows: ['................', '................', '................', '................', '................', '................', '................', '................', '................', '...##...........', '..####..........', '..##..##........', '..##..##........', '................', '................', '................'],
      map: { '#': '#e8b23a' },
    },
    sprout: {
      rows: ['................', '................', '................', '................', '................', '.......G........', '......GGG.......', '...GG.GGG.GG....', '.......G........', '.......G........', '.......G........', '................', '................', '................', '................', '................'],
      map: { 'G': '#6fae62' },
    },
    sapling: {
      rows: ['................', '................', '......GGGG......', '......G..G......', '......G..G......', '..GG..G..G..GG..', '..GG..GGGG..GG..', '.......GG.......', '.......GG.......', '......G..G......', '......G..G......', '................', '................', '................', '................', '................'],
      map: { 'G': '#6fae62' },
    },
    bloom: {
      rows: ['......####......', '.....######.....', '....##....##....', '....##....##....', '.....######.....', '.......##.......', '.......##.......', '.......##.......', '.......##.......', '..GG......GG....', '..GG......GG....', '................', '................', '................', '................', '................'],
      map: { 'G': '#6fae62' },
    },
    full: {
      rows: ['.....###..###...', '....#####.#####.', '....####..####..', '.....##....##...', '......##..##....', '.......##.......', '.......##.......', '......GGGG......', '..GG..G..G..GG..', '..GG..G..G..GG..', '......GGGG......', '................', '................', '................', '................', '................'],
      map: { 'G': '#6fae62' },
    },
  };

  function setup(cv) {
    canvas = cv;
    ctx = cv.getContext('2d');
  }

  function px(c, r, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(c, r, w, h);
  }

  function draw(stage, { score = 0 } = {}) {
    const s = canvas.width / P;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* the pot */
    px(3 * s, 11 * s, 10 * s, s, PAL.potL);      /* rim light */
    px(3 * s, 12 * s, 10 * s, s, PAL.pot);       /* rim */
    px(4 * s, 12 * s, 8 * s, s, PAL.soil);       /* soil */
    px(4 * s, 13 * s, 8 * s, s, PAL.pot);        /* body */
    px(5 * s, 14 * s, 6 * s, s, PAL.potD);       /* taper */
    px(6 * s, 15 * s, 4 * s, s, PAL.potD);

    const def = STAGES[stage] || STAGES.seed;

    /* plant pixels */
    for (let r = 0; r < P; r++) {
      const row = def.rows[r] || '';
      for (let c = 0; c < P; c++) {
        const ch = row[c];
        if (!ch || ch === '.') continue;
        px(c * s, r * s, s, s, def.map[ch] || PAL.leaf);
      }
    }

    /* slight sparkle at high growth */
    if (score >= 18 && Math.floor(Date.now() / 400) % 2 === 0) {
      px(10 * s, 3 * s, s, s, '#fff3c9');
    }
  }

  function stageName(stage) {
    const names = {
      seed: 'a seed, waiting',
      sprout: 'a sprout, hopeful',
      sapling: 'a sapling, growing',
      bloom: 'in full bloom',
      full: 'in full bloom, radiant',
    };
    return names[stage] || stage;
  }

  return { setup, draw, stageName };
})();

window.Garden = Garden;