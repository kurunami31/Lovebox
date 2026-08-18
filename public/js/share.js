/* ============================================================
   The Keepsake Box — share: QR + printable gift card
   ============================================================ */

const Share = (() => {
  function makeQR(canvas, text, cells = 0) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = cells || qr.getModuleCount();
    const size = n * 8;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#241a10';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(c * 8, r * 8, 8, 8);
      }
    }
    /* quiet zone */
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, 8);
    ctx.fillRect(0, size - 8, size, 8);
    ctx.fillRect(0, 0, 8, size);
    ctx.fillRect(size - 8, 0, 8, size);
  }

  function senderUrl(boxCode) {
    return `${location.origin}/send.html?box=${encodeURIComponent(boxCode)}`;
  }

  function open() {
    const modal = document.getElementById('sharebox');
    modal.classList.add('is-on');
  }

  function close() {
    document.getElementById('sharebox').classList.remove('is-on');
  }

  return { makeQR, senderUrl, open, close };
})();

window.Share = Share;