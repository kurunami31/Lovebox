/* ============================================================
   The Keepsake Box — theme engine (settings -> CSS variables)
   ============================================================ */

const Theme = (() => {
  const WOODS = {
    walnut: { base: '#6b4423', dark: '#4a2c14', light: '#8a5c33', mid: '#7a4f2a' },
    cherry: { base: '#7d4a2f', dark: '#573118', light: '#9c6749', mid: '#8a5a3d' },
    bamboo: { base: '#c9a96a', dark: '#a08248', light: '#e2c88f', mid: '#d5b478' },
  };

  const LIGHTS = {
    candle: '#ffb45e',
    day: '#ffe3b8',
    dusk: '#ffa35e',
  };

  function hexToHsl(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function hsl(h, s, l) {
    return `hsl(${h} ${s}% ${l}%)`;
  }

  function woodFromTint(tint) {
    const [h, s, l] = hexToHsl(tint);
    return {
      base: hsl(h, Math.min(100, s + 6), Math.max(18, l)),
      dark: hsl(h, Math.min(100, s + 10), Math.max(10, l - 13)),
      light: hsl(h, Math.max(18, s - 6), Math.min(85, l + 14)),
      mid: hsl(h, Math.min(100, s + 4), Math.max(14, l + 5)),
    };
  }

  function apply(settings) {
    const s = settings || {};
    const root = document.documentElement;

    const wood = s.wood === 'custom' && s.woodTint
      ? woodFromTint(s.woodTint)
      : WOODS[s.wood] || WOODS.walnut;

    root.style.setProperty('--wood-base', wood.base);
    root.style.setProperty('--wood-dark', wood.dark);
    root.style.setProperty('--wood-light', wood.light);
    root.style.setProperty('--wood-mid', wood.mid);
    root.style.setProperty('--accent', s.accent || '#b9893b');
    root.style.setProperty('--interior-glow', LIGHTS[s.interiorLight] || LIGHTS.candle);
  }

  return { apply, WOODS, LIGHTS };
})();

window.Theme = Theme;