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

  function open() {
    document.getElementById('sharebox').classList.add('is-on');
    document.getElementById('scrim').classList.add('is-on');
  }

  function close() {
    document.getElementById('sharebox').classList.remove('is-on');
    document.getElementById('scrim').classList.remove('is-on');
  }

  return { setPublicUrl, boxUrl, open, close };
})();