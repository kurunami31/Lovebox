/* ============================================================
   The Keepsake Box — share: QR + link
   ============================================================ */

const Share = (() => {
  let publicUrl = '';

  function setPublicUrl(u) {
    publicUrl = u || '';
  }

  function boxUrl(boxCode) {
    const base = (publicUrl || location.origin).replace(/\/+$/, '');
    return `${base}/?box=${encodeURIComponent(boxCode)}&open=1`;
  }

  function makeQR(canvas, text) {
    const qr = qrcode(0, 'H');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const cell = 8;         /* pixels per module */
    const margin = 4;       /* quiet-zone modules (QR spec minimum) */
    const size = (n + margin * 2) * cell;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#b85c74';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
    }
  }

  function open() {
    document.getElementById('sharebox').classList.add('is-on');
    document.getElementById('scrim').classList.add('is-on');
  }

  function close() {
    document.getElementById('sharebox').classList.remove('is-on');
    document.getElementById('scrim').classList.remove('is-on');
  }

  return { setPublicUrl, boxUrl, makeQR, open, close };
})();