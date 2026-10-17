
(() => {
  const TYPES = new Set(['hackemos:ping', 'hackemos:cjSession', 'hackemos:setCjSession']);

  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (msg?.source !== 'hackemos-page' || !TYPES.has(msg.type) || typeof msg.id !== 'string') return;

    let reply;
    if (msg.type === 'hackemos:ping') {
      window.postMessage({ version: chrome.runtime.getManifest().version, source: 'hackemos-extension', id: msg.id, type: msg.type }, location.origin);
      return;
    }
    try {
      reply = await chrome.runtime.sendMessage({ type: 'relay', message: { type: msg.type, value: msg.value, previous: msg.previous } });
    } catch {
      reply = { error: 'unavailable' }; 
    }
    window.postMessage({ ...reply, source: 'hackemos-extension', id: msg.id, type: msg.type }, location.origin);
  });

  chrome.runtime.onMessage.addListener((msg, sender) => {
    if (sender.id !== chrome.runtime.id || msg?.type !== 'hackemos:cjSessionChanged') return;
    window.postMessage({ source: 'hackemos-extension', type: msg.type, cjSession: msg.value }, location.origin);
  });
})();
