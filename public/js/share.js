/* ============================================================
   The Keepsake Box — share: QR + link
   ============================================================ */

const Share = (() => {
  let publicUrl = '';

  function setPublicUrl(u) {
    publicUrl = u || '';
  }

  function senderUrl(boxCode) {
    const base = (publicUrl || location.origin).replace(/\/+$/, '');
    return `${base}/send.html?box=${encodeURIComponent(boxCode)}`;
  }

  function makeQR(canvas, text) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const size = n * 8;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#b85c74';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + 1) * 8, (r + 1) * 8, 8, 8);
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

  return { setPublicUrl, senderUrl, makeQR, open, close };
})();