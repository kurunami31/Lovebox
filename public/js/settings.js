/* ============================================================
   The Keepsake Box — the "Tune the box" customization panel
   ============================================================ */

const Settings = (() => {
  const sheet = () => document.getElementById('tune-sheet');
  let settings = {};
  let onPatch = null;   /* (patch, full) => void */
  let patchTimer = null;

  const WOODS = [
    { id: 'walnut', name: 'Walnut' },
    { id: 'cherry', name: 'Cherry' },
    { id: 'bamboo', name: 'Bamboo' },
    { id: 'custom', name: 'Custom' },
  ];

  const PALETTES = [
    { id: 'ruby', name: 'Ruby', color: '#e2354f' },
    { id: 'rose', name: 'Rose', color: '#e894a5' },
    { id: 'gold', name: 'Gold', color: '#e0a53c' },
    { id: 'sapphire', name: 'Sapphire', color: '#4f7fd9' },
  ];

  const CHIMES = [
    { id: 'bell', name: 'a soft bell' },
    { id: 'heartbeat', name: 'a heartbeat' },
    { id: 'knock', name: 'a knock at the door' },
  ];

  const LIGHTS = [
    { id: 'candle', name: 'candlelight' },
    { id: 'day', name: 'morning light' },
    { id: 'dusk', name: 'evening light' },
  ];

  const STYLES = [
    { id: 'poetic', name: 'Poetic' },
    { id: 'playful', name: 'Playful' },
  ];

  /* ---------------- form building ---------------- */

  function build() {
    const body = sheet().querySelector('.sheet__body');
    body.innerHTML = '';

    body.appendChild(group('what it is called', `
      <div class="tune-row"><input class="text grow" id="t-name" placeholder="e.g. The little box on my shelf"></div>
      <div class="tune-row"><input class="text grow" id="t-recipient" placeholder="Whose box is it?"></div>
      <div class="tune-row"><input class="text grow" id="t-keeper" placeholder="What is the Keeper called?"></div>
    `));

    body.appendChild(group('the wood', `
      <div class="tune-row"><div class="swatches" id="t-woods"></div></div>
      <div class="tune-row"><label class="toggle"><input type="checkbox" id="t-tint"><span class="track"></span>custom tint <span id="t-tintval"></span></label></div>
      <div class="tune-row"><label class="cap">brass &amp; accents</label><input type="color" id="t-accent" value="#b9893b" style="width:44px;height:32px;border:none;background:none;cursor:pointer"></div>
    `));

    body.appendChild(group('the heart', `
      <div class="tune-row"><div class="swatches" id="t-hearts"></div></div>
    `));

    body.appendChild(group('the light inside', `
      <div class="tune-row"><div class="swatches" id="t-lights"></div></div>
    `));

    body.appendChild(group('the chime', `
      <div class="tune-row"><div class="swatches" id="t-chimes"></div></div>
      <div class="tune-row"><label class="toggle"><input type="checkbox" id="t-sound"><span class="track"></span>sounds on</label></div>
    `));

    body.appendChild(group('the Keeper\u2019s voice', `
      <div class="tune-row"><div class="swatches" id="t-styles"></div></div>
    `));

    body.appendChild(group('the first note', `
      <div class="tune-row"><textarea class="text" id="t-greeting" placeholder="A note waiting inside the box when it is first opened..."></textarea></div>
    `));

    body.appendChild(group('the secret knock', `
      <div class="knockpad">
        <button class="btn btn--small" id="t-knock-rec">record my knock</button>
        <button class="btn btn--small" id="t-knock-play">play it</button>
        <div class="knockdots" id="t-knock-dots"></div>
      </div>
      <div class="cap" id="t-knock-hint">Tap this button in your own rhythm. A secret drawer listens for it.</div>
    `));

    /* wire everything */
    wireWoods();
    wireHearts();
    wireLights();
    wireChimes();
    wireStyles();
    wireKnock();
    wireFields();
  }

  function group(label, inner) {
    const g = document.createElement('div');
    g.className = 'tune-group';
    const l = document.createElement('div');
    l.className = 'tune-group__label';
    l.textContent = label;
    g.append(l);
    g.insertAdjacentHTML('beforeend', inner);
    return g;
  }

  function swatchRow(containerId, items, selectedId, onPick, colorFn) {
    const row = document.getElementById(containerId);
    items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (it.id === selectedId ? ' is-on' : '');
      b.style.background = colorFn ? colorFn(it) : it.color;
      b.title = it.name;
      b.addEventListener('click', () => {
        row.querySelectorAll('.swatch').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
        onPick(it);
      });
      row.appendChild(b);
    });
  }

  function wireWoods() {
    const row = document.getElementById('t-woods');
    WOODS.forEach((w) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (w.id === settings.wood ? ' is-on' : '');
      b.title = w.name;
      const base = w.id === 'custom' ? (settings.woodTint || '#7a4a2f') : Theme.WOODS[w.id].base;
      b.style.background = `linear-gradient(135deg, ${base}, #3a2410)`;
      b.addEventListener('click', () => {
        row.querySelectorAll('.swatch').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
        patch({ wood: w.id });
        document.getElementById('t-tint').disabled = w.id !== 'custom';
        syncTintVisibility();
      });
      row.appendChild(b);
    });
    syncTintVisibility();
  }

  function syncTintVisibility() {
    const tint = document.getElementById('t-tint');
    tint.disabled = settings.wood !== 'custom';
  }

  function wireHearts() {
    swatchRow('t-hearts', PALETTES, settings.heartPalette, (it) => {
      patch({ heartPalette: it.id });
    });
  }

  function wireLights() {
    swatchRow('t-lights', LIGHTS, settings.interiorLight, (it) => {
      patch({ interiorLight: it.id });
    }, (it) => Theme.LIGHTS[it.id]);
  }

  function wireChimes() {
    swatchRow('t-chimes', CHIMES, settings.chime, (it) => {
      patch({ chime: it.id });
      Sound.chime(it.id);
    }, (it) => it.id === 'bell' ? '#d9a942' : it.id === 'heartbeat' ? '#e2354f' : '#8a5c33');
  }

  function wireStyles() {
    swatchRow('t-styles', STYLES, settings.diaryStyle, (it) => {
      patch({ diaryStyle: it.id });
    }, (it) => it.id === 'poetic' ? '#6fae62' : '#e0a53c');
  }

  function wireFields() {
    const name = document.getElementById('t-name');
    name.value = settings.boxName || '';
    name.placeholder = 'e.g. The little box on my shelf';
    name.addEventListener('input', () => schedule({ boxName: name.value }));

    const recipient = document.getElementById('t-recipient');
    recipient.value = settings.recipientName || '';
    recipient.addEventListener('input', () => schedule({ recipientName: recipient.value }));

    const keeper = document.getElementById('t-keeper');
    keeper.value = settings.keeperName || '';
    keeper.addEventListener('input', () => schedule({ keeperName: keeper.value }));

    const tint = document.getElementById('t-tint');
    tint.checked = settings.wood === 'custom' && !!settings.woodTint;
    tint.addEventListener('change', () => {
      if (tint.checked) {
        patch({ wood: 'custom' });
        document.querySelectorAll('#t-woods .swatch').forEach((x) => x.classList.remove('is-on'));
        document.querySelector('#t-woods .swatch:last-child').classList.add('is-on');
      } else {
        patch({ wood: 'walnut', woodTint: '' });
        syncTintVisibility();
      }
    });

    const accent = document.getElementById('t-accent');
    accent.value = settings.accent || '#b9893b';
    accent.addEventListener('input', () => schedule({ accent: accent.value }));

    const sound = document.getElementById('t-sound');
    sound.checked = settings.soundOn !== false;
    sound.addEventListener('change', () => {
      Sound.setEnabled(sound.checked);
      patch({ soundOn: sound.checked });
    });

    const greeting = document.getElementById('t-greeting');
    greeting.value = settings.greeting || '';
    greeting.addEventListener('input', () => schedule({ greeting: greeting.value }));
  }

  /* ---------------- knock recorder ---------------- */

  function wireKnock() {
    const recBtn = document.getElementById('t-knock-rec');
    const playBtn = document.getElementById('t-knock-play');
    const dots = document.getElementById('t-knock-dots');
    const hint = document.getElementById('t-knock-hint');
    let taps = [];
    let listening = false;

    function renderDots() {
      dots.innerHTML = '';
      const pattern = settings.knock || [];
      for (let i = 0; i <= pattern.length; i++) {
        const d = document.createElement('i');
        if (i < taps.length) d.classList.add('on');
        dots.appendChild(d);
      }
    }
    renderDots();

    recBtn.addEventListener('click', () => {
      listening = !listening;
      taps = [];
      renderDots();
      recBtn.textContent = listening ? 'tap to the beat…' : 'record my knock';
      if (listening) {
        hint.textContent = 'tap this button in your own rhythm, then wait a moment';
        taps.push(performance.now());
      } else {
        finishRecording();
      }
    });

    recBtn.addEventListener('pointerdown', (e) => {
      if (!listening) return;
      e.preventDefault();
      const now = performance.now();
      if (taps.length && now - taps[taps.length - 1] < 120) return;
      taps.push(now);
      Sound.knock();
      renderDots();
    });

    function finishRecording() {
      if (taps.length < 3) {
        hint.textContent = 'that was too short — try again';
        Sound.fail();
        return;
      }
      const gaps = [];
      for (let i = 1; i < taps.length; i++) {
        gaps.push(Math.round(taps[i] - taps[i - 1]));
      }
      patch({ knock: gaps });
      hint.textContent = 'kept! try it on the box itself';
      Sound.unlock();
    }

    playBtn.addEventListener('click', () => {
      (settings.knock || []).forEach((g, i) => setTimeout(() => Sound.knock(), (settings.knock || []).slice(0, i).reduce((a, b) => a + b, 0)));
    });
  }

  /* ---------------- plumbing ---------------- */

  function patch(p) {
    settings = { ...settings, ...p };
    Theme.apply(settings);
    if (onPatch) onPatch(p, settings);
  }

  function schedule(p) {
    clearTimeout(patchTimer);
    patchTimer = setTimeout(() => patch(p), 500);
  }

  function open(current, cb) {
    settings = { ...current };
    onPatch = cb;
    build();
    sheet().classList.add('is-open');
    document.getElementById('scrim').classList.add('is-on');
  }

  function close() {
    sheet().classList.remove('is-open');
    document.getElementById('scrim').classList.remove('is-on');
  }

  return { open, close };
})();

window.Settings = Settings;