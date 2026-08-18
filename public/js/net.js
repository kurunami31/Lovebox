/* ============================================================
   The Keepsake Box — websocket client with auto-reconnect
   ============================================================ */

function connectWS(boxCode, role, handlers) {
  const state = { ws: null, tries: 0, dead: false, heartbeat: null };

  function open() {
    if (state.dead) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws?box=${encodeURIComponent(boxCode)}&role=${role}`);
    state.ws = ws;

    ws.onopen = () => {
      state.tries = 0;
      handlers.onOpen && handlers.onOpen();
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      handlers.onMessage && handlers.onMessage(msg);
    };

    ws.onclose = () => {
      if (state.dead) return;
      clearInterval(state.heartbeat);
      const delay = Math.min(1000 * 2 ** state.tries, 15000);
      state.tries++;
      handlers.onClose && handlers.onClose();
      setTimeout(open, delay);
    };

    ws.onerror = () => { try { ws.close(); } catch {} };

    state.heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
    }, 25000);
  }

  open();

  return {
    send(obj) {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify(obj));
        return true;
      }
      return false;
    },
    close() {
      state.dead = true;
      clearInterval(state.heartbeat);
      try { state.ws && state.ws.close(); } catch {}
    },
    alive() {
      return !!(state.ws && state.ws.readyState === WebSocket.OPEN);
    },
  };
}
