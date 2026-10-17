(() => {
  const LESSON_RE = /^\/(?:(?:(?:grammar|verb|vocabulary)\/(?:homework|quiz|flashcard|multiplechoice|talkometer)|assignment)\/\d+|tube\/accents\/\d+\/\d+\/(?:quiz|transcript(?:\/\d+)?))$/;
  const GAME_RE = /^\/(?:verb|vocabulary)\/(?:blockburst|dropgame|splatman2|chess|tank|tictactoe|battleship|connect4|tug|crossword|memory|splatman|wordsearch)\/\d+$/;
  const isGame = GAME_RE.test(location.pathname);
  const isGradebook = location.pathname === '/student/grades';
  if (!(isGame || isGradebook || LESSON_RE.test(location.pathname)) || window.__hackemosOverlay) return;
  window.__hackemosOverlay = true;
  const MAX_ATTEMPTS = 1000;
  const MAX_MINUTES = 99;
  const GRADEBOOK_URL = 'https://conjuguemos.com/student/grades';
  const SUBMITTED_KEY = 'submittedResult';
  const SUBMITTED_MAX_AGE = 2 * 60 * 1000;
  const SIGN_IN_URL = 'https://conjuguemos.com/auth/login';
  const DISCORD_URL = 'https://hackemos.com/discord';
  const UNREACHABLE = "Couldn't reach Hackemos. Check your connection and try again.";
  const LOGO_H = "M377.988 341.65c4.163-.007 7.834.106 11.494-.05 5.987-.255 7.73-2.397 8.221-8.336.864-10.417 1.807-20.843 3.23-31.194.886-6.451 4.296-11.835 9.368-16.056 18.696-15.56 37.38-31.132 56.082-46.683 10.89-9.054 21.807-18.073 32.708-27.113 1.92-1.593 3.779-3.205 6.285-3.94 6.57-1.929 10.059.455 9.938 7.286-.311 17.614-1.498 35.176-3.29 52.705-1.689 16.537-2.932 33.12-4.732 49.643-1.963 18.014-2.732 36.118-4.621 54.148a1420 1420 0 0 0-4.031 45.188c-1.571 21.65-4.466 43.178-5.475 64.878-.382 8.224-4.894 14.72-10.86 20.176-20.529 18.775-41.07 37.537-61.606 56.303-9.454 8.64-18.92 17.267-28.356 25.926-4.009 3.678-8.311 7.807-14.042 5.019-5.963-2.9-4.545-8.827-3.99-14.202 1.555-15.036 2.866-30.098 4.384-45.139 1.484-14.705 3.146-29.391 4.65-44.094 1.166-11.4 1.946-22.845 3.386-34.209 1.294-10.216 3.417-20.323 2.94-30.713-.245-5.375-2.17-7.727-7.518-7.745-28.662-.098-57.323-.097-85.984-.061-4.212.005-6.64 1.845-7.048 6.565-1 11.584-2.934 23.103-3.552 34.699-.534 9.997-5.18 17.377-12.216 23.66-29.57 26.408-59.204 52.743-88.83 79.087-3.818 3.394-8.102 6.988-13.33 4.039-5.321-3.002-4.513-8.597-3.963-13.886 1.6-15.363 2.983-30.748 4.445-46.126 1.571-16.541 3.17-33.08 4.693-49.627 1.478-16.052 3.144-32.093 4.238-48.172 1.218-17.92 3.535-35.708 5.502-53.54 1.548-14.034 3.055-28.073 4.546-42.113 1.438-13.547 2.683-27.116 4.303-40.64.959-8.008 5.32-14.182 11.571-19.168 30.606-24.41 61.174-48.867 91.768-73.292 1.298-1.037 2.654-2.033 4.092-2.859 7.389-4.245 13.038-1.142 12.926 7.253-.17 12.67-3.133 25.038-4.32 37.614-1.53 16.202-3.69 32.346-5.66 48.505-2.09 17.15-4.321 34.284-6.398 51.436-.698 5.769-1.288 11.562-1.608 17.362-.328 5.958 1.208 7.446 7.177 7.453 24.329.029 48.657.013 73.483.014";

  async function api(method, path, body) {
    if (!chrome.runtime?.id) return { status: 0, stale: true, body: { success: false, message: 'Hackemos was updated. Reload this page.' } };
    let reply;
    try {
      reply = await chrome.runtime.sendMessage({ type: 'api', method, path, body });
    } catch {
      return { status: 0, lost: true, body: { success: false, message: UNREACHABLE } };
    }
    if (!reply || reply.status === 0) return { status: 0, body: { success: false, message: reply?.error || UNREACHABLE } };
    return reply;
  }

  const storage = {
    get: keys => chrome.storage.local.get(keys).catch(() => ({})),
    set: items => chrome.storage.local.set(items).catch(() => {}),
    remove: keys => chrome.storage.local.remove(keys).catch(() => {}),
  };
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    el.append(...children.flat().filter(c => c != null && c !== false));
    return el;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(viewBox, paths, cls) {
    const el = document.createElementNS(SVG_NS, 'svg');
    el.setAttribute('viewBox', viewBox);
    el.setAttribute('aria-hidden', 'true');
    if (cls) el.setAttribute('class', cls);
    for (const d of paths) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      el.append(p);
    }
    return el;
  }
  const ICONS = {
    chevron: ['M201.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 338.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z'],
    check: ['M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z'],
    cross: ['M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z'],
    warn: ['M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7.2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8.2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0-64 0 32 32 0 1 0 64 0z'],
    send: ['M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480v-83.6c0-4 1.5-7.8 4.2-10.8l167.6-182.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3.3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z'],
  };
  const FA_ICONS = {
    clock: ['0 0 512 512', 'M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z'],
    hash: ['0 0 448 512', 'M181.3 32.4c17.4 2.9 29.2 19.4 26.3 36.8L197.8 128h95.1l11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3s29.2 19.4 26.3 36.8L357.8 128H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H347.1L325.8 320H384c17.7 0 32 14.3 32 32s-14.3 32-32 32H315.1l-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.8-58.7H155.1l-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8L90.2 384H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.9l21.3-128H64c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.9l11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3zM187.1 192L165.8 320h95.1l21.3-128H187.1z'],
    tick: ['0 0 448 512', 'M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z'],
    expand: ['0 0 512 512', 'M344 0H488c13.3 0 24 10.7 24 24V168c0 9.7-5.8 18.5-14.8 22.2s-19.3 1.7-26.2-5.2l-39-39-87 87c-9.4 9.4-24.6 9.4-33.9 0l-32-32c-9.4-9.4-9.4-24.6 0-33.9l87-87L327 41c-6.9-6.9-8.9-17.2-5.2-26.2S334.3 0 344 0zM168 512H24c-13.3 0-24-10.7-24-24V344c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l39 39 87-87c9.4-9.4 24.6-9.4 33.9 0l32 32c9.4 9.4 9.4 24.6 0 33.9l-87 87 39 39c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8z'],
    minimize: ['0 0 512 512', 'M439 7c9.4-9.4 24.6-9.4 33.9 0l32 32c9.4 9.4 9.4 24.6 0 33.9l-87 87 39 39c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8H296c-13.3 0-24-10.7-24-24V72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l39 39L439 7zM72 272H216c13.3 0 24 10.7 24 24V440c0 9.7-5.8 18.5-14.8 22.2s-19.3 1.7-26.2-5.2l-39-39L73 505c-9.4 9.4-24.6 9.4-33.9 0L7 473c-9.4-9.4-9.4-24.6 0-33.9l87-87L55 313c-6.9-6.9-8.9-17.2-5.2-26.2s12.5-14.8 22.2-14.8z'],
  };
  const icon = (name, cls) => FA_ICONS[name] ? svg(FA_ICONS[name][0], [FA_ICONS[name][1]], cls) : svg('0 0 512 512', ICONS[name], cls);
  const logo = cls => {
    const el = svg('166 170 350 421', [LOGO_H], cls);
    el.querySelector('path').setAttribute('fill', 'url(#hk-grad)');
    return el;
  };
  function gradientDefs() {
    const make = (tag, attrs) => {
      const el = document.createElementNS(SVG_NS, tag);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
      return el;
    };
    const grad = make('linearGradient', { id: 'hk-grad', x1: '0%', y1: '100%', x2: '100%', y2: '0%' });
    grad.append(...[['0%', '#00C8FF'], ['50%', '#3B82F6'], ['100%', '#A855F7']]
      .map(([offset, color]) => make('stop', { offset, 'stop-color': color })));
    const defs = make('defs', {});
    defs.append(grad);
    const el = make('svg', { width: '0', height: '0', 'aria-hidden': 'true', class: 'defs' });
    el.append(defs);
    return el;
  }
  const spinner = cls => h('span', { class: `spinner ${cls || ''}`, 'aria-hidden': 'true' });
  const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
  function fmtDuration(secs) {
    const hrs = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60;
    if (hrs) return m ? `${hrs}h ${m}m` : `${hrs}h`;
    if (m) return s ? `${m}m ${s}s` : `${m}m`;
    return `${s}s`;
  }

  function submitMessage(gradebook) {
    const pct = gradebook?.percent;
    const secs = gradebook?.durationSecs;
    const took = secs != null ? ` (${fmtDuration(secs)})` : '';
    return pct != null ? `Posted to your gradebook with ${pct}% accuracy${took}.` : `Posted to your gradebook${took}.`;
  }

  function resultPill(b) {
    const r = b.recent || {};
    const pct = r.percent ?? b.gradebook?.percent;
    const secs = r.secs ?? b.gradebook?.durationSecs;
    const parts = [
      pct != null && h('span', { class: 'result-pct', style: `color:${accuracyColor(Number(pct))}`, text: `${pct}%` }),
      r.total != null && `${Number(r.right) || 0}/${Number(r.total)} correct`,
      secs != null && fmtDuration(Number(secs)),
    ].filter(Boolean);
    if (!parts.length) return null;
    return h('p', { class: 'result-pill' }, parts.flatMap((p, i) => i ? [' · ', p] : [p]));
  }

  function stripTime(str) {
    const val = str.replace(/[^0-9:]/g, '');
    const colon = val.indexOf(':');
    return colon === -1 ? val : val.slice(0, colon + 1) + val.slice(colon + 1).replace(/:/g, '');
  }
  const cleanTime = str => { const val = stripTime(str); return val.includes(':') ? val : `${val}:`; };
  function normalizeTime(str) {
    const [m, s] = cleanTime(str).split(':');
    const pad = n => String(n).padStart(2, '0');
    return `${pad(Math.min(Number(m) || 0, MAX_MINUTES))}:${pad(Math.min(Number(s) || 0, 59))}`;
  }
  function formatTime(minutes) {
    const total = Math.round((Number(minutes) || 0) * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function clampInt(str, max) {
    const digits = str.replace(/\D/g, '').slice(0, 4);
    return digits ? String(Math.min(Number(digits), max)) : '';
  }
  const accuracyColor = pct => `hsl(${Math.round(Math.max(0, Math.min(100, pct)) / 100 * 120)}, 85%, 55%)`;

  function backAround(iso) {
    const at = iso ? new Date(iso) : null;
    if (!at || Number.isNaN(at.getTime())) return '';
    return `Back around ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
  }

  function addFont() {
    if (document.getElementById('hackemos-font')) return;
    const style = document.createElement('style');
    style.id = 'hackemos-font';
    style.textContent = `@font-face { font-family: "Hackemos Space Grotesk"; font-weight: 300 700; font-display: swap;
      src: url("${chrome.runtime.getURL('fonts/SpaceGrotesk-latin.woff2')}") format("woff2"); }`;
    (document.head || document.documentElement).append(style);
  }

  let host = null, root = null, body = null, headEl = null, headerTitle = null, headerMeta = null;
  let me = null;
  let config = null;
  let magic = null;
  let view = 'idle';
  let busy = false;     
  let submitting = false;
  let generation = 0;
  let listeners = null;

  const outOfSubmits = () => me && me.account.plan !== 'paid' && me.account.freeSubmitLimit != null
    && me.account.freeSubmitsUsed >= me.account.freeSubmitLimit;
  const analyzeEnabled = () => me?.prefs?.analyzeSubmissions !== false;
  const isAssignment = () => location.pathname.startsWith('/assignment/');

  function mount() {
    if (host) return;
    addFont();
    listeners = new AbortController();
    const { signal } = listeners;
    window.addEventListener('resize', () => { fitWidth(); placeTab(); placeFlagTip(); }, { signal });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !isOpen()) return;
      if (flagTipOpen()) return setFlagTip(false);
      close();
    }, { signal });
    document.addEventListener('pointerdown', e => {
      if (flagTipOpen() && host && !e.composedPath().includes(host)) setFlagTip(false);
    }, { capture: true, signal });
    host = document.createElement('hackemos-overlay');
    host.popover = 'manual';
    for (const [prop, value] of Object.entries({
      position: 'fixed', inset: 'auto', top: '0', right: '0', width: '0', height: '0', margin: '0', padding: '0',
      border: '0', background: 'transparent', overflow: 'visible', 'z-index': '2147483647', display: 'block',
    })) host.style.setProperty(prop, value, 'important');

    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.append(h('style', { text: STYLES }));
    root = h('div', { class: 'root' });
    root.addEventListener('pointerdown', e => {
      if (flagTipOpen() && !flagEl.contains(e.target) && !flagTip.contains(e.target)) setFlagTip(false);
    });
    const tab = h('button', { class: 'tab', type: 'button', 'aria-label': 'Open Hackemos', onclick: onTabClick },
      logo('tab-logo'), icon('expand', 'tab-icon'));
    wireTabDrag(tab);
    headerTitle = h('div', { class: 'title' });
    headerMeta = h('div', { class: 'meta', hidden: true });
    body = h('div', { class: 'body', 'aria-live': 'polite' });
    body.addEventListener('scroll', placeFlagTip, { passive: true });
    const panel = h('section', { class: 'panel', 'aria-label': 'Hackemos' },
      headEl = h('header', { class: 'head' },
        logo('head-logo'),
        h('div', { class: 'head-text' }, headerTitle, headerMeta),
        h('button', { class: 'close', type: 'button', 'aria-label': 'Minimize Hackemos', onclick: close }, icon('minimize', 'close-icon'))),
      body);
    root.append(gradientDefs(), tab, h('div', { class: 'panel-wrap' }, panel));
    shadow.append(root);
    document.body.append(host);
    host.showPopover?.();
    fitWidth();
    placeTab();
  }

  function unmount() {
    generation++;
    listeners?.abort();
    listeners = null;
    host?.remove();
    host = root = body = headEl = null;
    view = 'idle';
    config = me = null;
    fields = flagEl = flagTip = null;
    flagSeq++;
    flagTimerStop();
    clearTimeout(typingTimer);
  }

  function fitWidth() {
    root?.classList.toggle('compact', window.innerWidth < 560);
  }
  const TAB_HEIGHT = 86, TAB_MARGIN = 8, DRAG_START = 4;
  let tabFrac = null;        
  let dragged = false;       

  const tabRoom = () => Math.max(0, window.innerHeight - TAB_HEIGHT - 2 * TAB_MARGIN);
  const defaultTabTop = () => Math.max(16, window.innerHeight * 0.18);

  function placeTab(top) {
    if (!root) return;
    if (top == null) top = tabFrac == null ? defaultTabTop() : TAB_MARGIN + tabFrac * tabRoom();
    top = Math.min(Math.max(top, TAB_MARGIN), TAB_MARGIN + tabRoom());
    root.style.setProperty('--top', top + 'px');
    root.style.setProperty('--bottom', window.innerHeight - top - TAB_HEIGHT + 'px');
    root.classList.toggle('up', top + TAB_HEIGHT / 2 > window.innerHeight / 2);
    return top;
  }
  function saveTab(top) {
    const room = tabRoom();
    tabFrac = room ? (top - TAB_MARGIN) / room : 0;
    storage.set({ tabTop: tabFrac });
  }

  function wireTabDrag(tab) {
    let startY = 0, startTop = 0, pointer = null, moving = false;
    tab.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      pointer = e.pointerId;
      startY = e.clientY;
      startTop = tab.getBoundingClientRect().top;
      moving = false;
    });
    tab.addEventListener('pointermove', e => {
      if (e.pointerId !== pointer) return;
      const dy = e.clientY - startY;
      if (!moving && Math.abs(dy) < DRAG_START) return;
      if (!moving) {
        moving = true;
        try { tab.setPointerCapture(pointer); } catch {}
        root.classList.add('dragging');
      }
      placeTab(startTop + dy);
    });
    const end = e => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (!moving) return;
      dragged = true;
      root.classList.remove('dragging');
      saveTab(tab.getBoundingClientRect().top);
    };
    tab.addEventListener('pointerup', end);
    tab.addEventListener('pointercancel', end);
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      saveTab(placeTab(tab.getBoundingClientRect().top + (e.key === 'ArrowUp' ? -24 : 24)));
    });
  }

  function onTabClick() {
    if (dragged) { dragged = false; return; }
    open();
  }

  const isOpen = () => root?.classList.contains('open');

  function open() {
    if (!root) return;
    root.classList.add('open');
    if (busy || view === 'result' || (config && view === 'form')) return;
    me = null;
    load();
  }

  function close() {
    if (!root) return;
    root.classList.remove('open');
    setFlagTip(false);
  }

  function setHeader(title, meta) {
    headerTitle.textContent = title;
    headerMeta.textContent = meta || '';
    headerMeta.hidden = !meta;
    headEl.classList.toggle('solo', !meta);
  }

  function freeLeft() {
    const account = me?.account;
    if (!account || account.plan === 'paid' || account.freeSubmitLimit == null) return null;
    return `${Math.max(0, account.freeSubmitLimit - account.freeSubmitsUsed).toLocaleString()} free left`;
  }

  function show(name, ...content) {
    if (!body) return;
    view = name;
    setFlagTip(false);
    flagTimerStop();
    body.replaceChildren(...content);
  }

  function supportLine() {
    if (!me?.account) return null;
    return h('p', { class: 'support' },
      'Still not working? Ask in the ', h('a', { href: DISCORD_URL, target: '_blank', rel: 'noopener', text: 'Discord' }),
      ` with your Hackemos ID #${me.account.id}.`);
  }

  function showLoading() {
    setHeader(isAssignment() ? 'Assignment' : 'Activity');
    show('loading', h('div', { class: 'loading' }, spinner(), h('span', { text: isAssignment() ? 'Loading assignment…' : 'Loading activity…' })));
  }

  function showMessage({ name = 'gate', kind = 'info', title, text, extra, actions = [], support = false }) {
    show(name, h('div', { class: `message ${kind}` },
      kind !== 'info' && icon(kind === 'ok' ? 'check' : kind === 'error' ? 'cross' : 'warn', 'message-icon'),
      title && h('h2', { text: title }),
      text && h('p', { text }),
      extra,
      actions.length ? h('div', { class: 'actions' }, actions) : null,
      support && supportLine()));
  }

  const button = (label, onclick, cls = 'primary') => h('button', { class: `btn ${cls}`, type: 'button', onclick, text: label });
  const linkButton = (label, href, cls = 'secondary') => h('a', { class: `btn ${cls}`, href, target: '_blank', rel: 'noopener', text: label });

  function showGate(reply) {
    const b = reply.body || {};
    switch (b.code) {
      case 'PAUSED':
        showMessage({ kind: 'warn', title: 'Hackemos is down', text: b.message, extra: b.until && h('p', { class: 'muted', text: backAround(b.until) }) });
        return true;
      case 'EXT_OUTDATED':
        showMessage({
          kind: 'warn', title: 'Update Hackemos',
          text: 'This version of Hackemos is out of date. Chrome updates extensions on its own within about a day.',
          extra: h('p', { class: 'muted', text: 'To update now: open chrome://extensions, turn on Developer mode, then click Update.' }),
        });
        return true;
      case 'CJ_SESSION_MISSING':
      case 'CJ_SIGNED_OUT':
        setHeader('Hackemos');
        showMessage({
          title: 'Sign in to Conjuguemos to use Hackemos',
          text: "Hackemos uses the Conjuguemos account you're signed in to. There's nothing else to sign up for.",
          actions: [linkButton('Sign in to Conjuguemos', SIGN_IN_URL, 'primary')],
        });
        return true;
      case 'CJ_NOT_STUDENT':
        showMessage({ title: 'Student accounts only', text: b.message || 'Hackemos works with student accounts.' });
        return true;
      case 'LIMIT_REACHED':
        if (me) me.account.freeSubmitsUsed = Math.max(me.account.freeSubmitsUsed, me.account.freeSubmitLimit ?? 0);
        showUpgrade();
        return true;
    }
    return false;
  }

  function showFailure(reply, retry) {
    if (showGate(reply)) return;
    showMessage({
      kind: 'error',
      text: reply.body?.message || 'Something went wrong. Try again in a moment.',
      actions: retry ? [button('Try again', retry)] : [],
      support: true,
    });
  }

  const unlimitedButton = () => button('Get unlimited', () => {
    chrome.runtime.sendMessage({ type: 'openApp', path: '/?upgrade=1' }).catch(() => {});
  });

  function showUpgrade(note) {
    setHeader('Hackemos');
    const price = me?.price;
    show('upgrade', h('div', { class: 'message upgrade' },
      note,
      h('h2', { text: "You've used your free submits" }),
      price && h('p', { class: 'price' }, h('span', { class: 'amount', text: price.label }), h('span', { class: 'muted', text: price.note })),
      h('p', { text: 'Unlimited submits.' }),
      h('div', { class: 'actions' }, unlimitedButton())));
  }

  async function load(keep) {
    if (busy) return;
    busy = true;
    const gen = generation;
    if (!keep) showLoading();
    try {
      if (!me) {
        const reply = await api('GET', '/api/ext/me');
        if (gen !== generation) return;
        if (!reply.body?.success) return showFailure(reply, () => load());
        me = reply.body;
        if (me.features?.overlay === false) return unmount();
      }
      if (outOfSubmits()) return showUpgrade();

      const title = isGame ? `&title=${encodeURIComponent(document.title)}` : '';
      const reply = await api('GET', `/api/ext/loadActivity?path=${encodeURIComponent(location.pathname)}${title}`);
      if (gen !== generation) return;
      if (!reply.body?.success) {
        setHeader(isAssignment() ? 'Assignment' : 'Activity');
        return showFailure(reply, () => load());
      }
      config = reply.body.config;
      magic = reply.body.magic;
      showForm(keep);
    } finally {
      busy = false;
    }
  }
  let fields = null;
  let reqs = [], reqBox = null, accuracyEl = null, submitBtn = null, cancelBtn = null, actionsEl = null;
  let flagEl = null, flagTip = null, flagLabel = null, confirmEl = null, formError = null;

  function metaLine(c) {
    const parts = [];
    if (c.language) parts.push(c.language[0].toUpperCase() + c.language.slice(1));
    if (c.questionCount) parts.push(plural(c.questionCount, 'question'));
    if (c.mode === 'game') return [c.type, c.gameLabel].filter(Boolean).join(' · ');
    const mode = { homework: 'graded practice', multiplechoice: 'multiple choice', transcript: 'fill-the-blank' }[c.mode] || c.mode;
    const kind = [c.type, mode].filter(Boolean).join('\u00a0');
    if (kind) parts.push(kind);
    return parts.join(' · ');
  }

  function field(label, id, iconName, attrs) {
    const input = h('input', { id, type: 'text', inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false', ...attrs });
    return {
      input,
      el: h('label', { class: 'field', for: id },
        h('span', { class: 'label' }, label),
        h('span', { class: 'input' }, icon(iconName, 'input-icon'), input)),
    };
  }

  function showForm(keep) {
    const before = keep && fields ? readFields() : null;
    setHeader(config.title, metaLine(config));

    reqs = [];
    const minTime = Number(config.minTime) || 0, minAttempts = Number(config.minAttempts) || 0, minScore = Number(config.minScore) || 0;
    if (minTime > 0) reqs.push({ key: 'time', value: formatTime(minTime), unit: 'time', met: f => f.mins + 1e-6 >= minTime });
    if (minAttempts > 0) reqs.push({ key: 'attempts', value: minAttempts, unit: 'attempts', met: f => f.total >= minAttempts });
    if (minScore > 0) reqs.push({ key: 'score', value: `${minScore}%`, unit: 'score', met: f => f.score + 1e-6 >= minScore });
    reqBox = reqs.length ? h('div', { class: 'reqs' }, h('span', { class: 'reqs-label', text: 'Required' }),
      h('div', { class: 'chips' }, reqs.map(r => h('span', { class: 'chip unmet', 'data-req': r.key },
        icon('cross', 'chip-state'), h('span', {}, `${r.value} `, h('span', { class: 'unit', text: r.unit })))))) : null;

    const time = field('Time spent', 'hk-mins', 'clock', { placeholder: 'mm:ss' });
    const total = field('Total', 'hk-total', 'hash', { placeholder: '0', disabled: config.fixedAttempts });
    accuracyEl = h('span', { class: 'accuracy', hidden: true });
    const right = field(h('span', {}, 'Correct', accuracyEl), 'hk-right', 'tick', { placeholder: '0', disabled: config.rightLocked });
    fields = { mins: time.input, total: total.input, right: right.input };
    wireFields();

    flagLabel = h('span', { class: 'flag-label' });
    flagTip?.remove();
    flagTip = h('div', { class: 'flag-tip', role: 'tooltip' });
    root.append(flagTip);
    const flagInfo = h('button', { class: 'flag-info', type: 'button', 'aria-expanded': 'false', onclick: () => setFlagTip(!flagTipOpen()) },
      icon('warn', 'flag-icon'), flagLabel, h('span', { class: 'flag-why' }, 'Why?', icon('chevron', 'flag-caret')));
    flagEl = h('div', { class: 'flag', hidden: true }, h('div', { class: 'flag-pill' }, flagInfo));
    confirmEl = h('div', { class: 'confirm', hidden: true });
    cancelBtn = h('button', { class: 'btn secondary edit', type: 'button', hidden: true, onclick: () => { closeConfirm(); fields.mins.focus(); } }, 'Edit');
    submitBtn = h('button', { class: 'btn primary submit', type: 'button', onclick: onSubmitClick });
    setSubmitLabel('Submit');
    actionsEl = h('div', { class: 'form-actions' }, flagEl, confirmEl, cancelBtn, submitBtn);
    formError = h('p', { class: 'inline-error', hidden: true });

    show('form', h('div', { class: 'form' },
      reqBox,
      h('div', { class: 'grid' },
        h('div', { class: 'full' }, time.el),
        total.el, right.el),
      formError,
      actionsEl));
    flagKey = null; flagReasons = [];
    setFields(before || magic || (minTime > 0 || minAttempts > 0 || config.fixedAttempts
      ? { mins: config.minTime, total: config.minAttempts, right: config.minAttempts }
      : null));
    commitFields();
  }

  function readFields() {
    const [m, s] = normalizeTime(fields.mins.value).split(':').map(Number);
    const total = Number(fields.total.value) || 0;
    const right = Math.min(Number(fields.right.value) || 0, total);
    return { mins: m + s / 60, total, right, score: total > 0 ? right / total * 100 : 0 };
  }

  function setFields(values) {
    if (!values) {
      for (const input of Object.values(fields)) input.value = '';
      updateAccuracy();
      return;
    }
    const { mins = 0, total = 0, right = 0 } = values;
    fields.mins.value = formatTime(mins);
    fields.total.value = config.fixedAttempts ? Number(config.minAttempts) : total;
    fields.right.value = config.rightLocked ? fields.total.value : Math.min(right, Number(fields.total.value));
    updateAccuracy();
  }

  const maxAttempts = () => config.fixedAttempts ? Number(config.minAttempts) : Number(config.maxAttempts) || MAX_ATTEMPTS;

  function updateAccuracy() {
    const { total, right } = readFields();
    accuracyEl.hidden = total <= 0;
    if (accuracyEl.hidden) return;
    const pct = right / total * 100;
    accuracyEl.textContent = `${Math.round(pct)}%`;
    accuracyEl.style.color = accuracyColor(pct);
  }

  function wireFields() {
    for (const input of Object.values(fields)) {
      input.addEventListener('beforeinput', e => {
        if (e.inputType === 'insertText' && /[^\d:]/.test(e.data)) e.preventDefault();
        if (input !== fields.mins && e.inputType === 'insertText' && e.data?.includes(':')) e.preventDefault();
      });
      input.addEventListener('blur', commitFields);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { commitFields(); if (!submitBtn.disabled) submitBtn.click(); } });
    }
    const { mins, total, right } = fields;
    mins.addEventListener('keydown', e => {
      const colon = mins.value.indexOf(':');
      if (mins.selectionStart !== mins.selectionEnd) return;
      if (e.key === 'Backspace' && mins.selectionStart === colon + 1) e.preventDefault();
      if (e.key === 'Delete' && mins.selectionStart === colon) e.preventDefault();
    });
    mins.addEventListener('input', () => {
      const cleaned = cleanTime(mins.value);
      if (cleaned !== mins.value) {
        const pos = stripTime(mins.value.slice(0, mins.selectionStart)).length;
        mins.value = cleaned;
        mins.setSelectionRange(pos, pos);
      }
      changed();
    });
    total.addEventListener('input', () => {
      total.value = clampInt(total.value, maxAttempts());
      if (config.rightLocked) right.value = total.value;
      else if (Number(right.value) > Number(total.value)) right.value = total.value;
      updateAccuracy();
      changed();
    });
    right.addEventListener('input', () => { right.value = clampInt(right.value, Number(total.value) || 0); updateAccuracy(); changed(); });
  }
  let typingTimer = null;
  function changed() {
    formError.hidden = true;
    updateRequirements(false);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => updateFlag(readFields()), 500);
  }

  function commitFields() {
    if (!fields || submitting) return;
    if (fields.mins.value) fields.mins.value = normalizeTime(fields.mins.value);
    fields.right.value = config.rightLocked || !fields.total.value
      ? fields.total.value
      : Math.min(Number(fields.right.value) || 0, Number(fields.total.value));
    updateAccuracy();
    clearTimeout(typingTimer);
    updateRequirements(true);
  }

  const canSubmit = f => !submitting && (f.total >= 1 || config.mode === 'game') && reqs.every(r => r.met(f));

  function updateRequirements(flag) {
    const f = readFields();
    for (const r of reqs) {
      const met = r.met(f);
      const chip = reqBox.querySelector(`[data-req="${r.key}"]`);
      chip.classList.toggle('met', met);
      chip.classList.toggle('unmet', !met);
      chip.firstChild.replaceWith(icon(met ? 'check' : 'cross', 'chip-state'));
    }
    submitBtn.disabled = !canSubmit(f);
    if (flag) updateFlag(f);
  }

  let flagKey = null, flagSeq = 0, flagReasons = [], flagLevel = null, flagShown = [], flagTimer = null;
  const fieldsKey = ({ mins, total, right }) => `${mins}|${total}|${right}`;
  const flagTimerStop = () => clearTimeout(flagTimer);

  function updateFlag(f) {
    const key = fieldsKey(f);
    if (key === flagKey) return;
    flagKey = key;
    closeConfirm();
    flagTimerStop();
    checkFlag(f);
  }

  async function checkFlag({ mins, total, right }) {
    if (!analyzeEnabled() || !config) return;
    const seq = ++flagSeq;
    const reply = await api('POST', '/api/ext/assess', { lessonId: config.lessonId, mins, total, right });
    if (seq !== flagSeq || view !== 'form') return;
    if (!reply.body?.success) { flagKey = null; return; }
    const at = Date.now();
    flagReasons = (reply.body.reasons || []).map(r => r.countdown
      ? { ...r, lastAt: at - r.countdown.agoMs, clearsAt: at + r.countdown.clearsInMs }
      : r);
    tickFlag();
  }

  function tickFlag() {
    flagTimerStop();
    const now = Date.now();
    flagReasons = flagReasons.filter(r => !r.clearsAt || r.clearsAt > now);
    renderFlag(flagReasons.map(r => r.clearsAt ? { ...r, text: countdownText(r, now) } : r));
    const next = Math.min(...flagReasons.filter(r => r.clearsAt).map(r => r.clearsAt));
    if (Number.isFinite(next)) flagTimer = setTimeout(tickFlag, (next - now) % 1000 || 1000);
  }

  function countdownText(r, now) {
    const gapSecs = (now - r.lastAt) / 1000;
    const ago = gapSecs < 60 ? 'under a minute' : `${Math.floor(gapSecs / 60)} min`;
    return r.text.replace('{ago}', ago).replace('{wait}', fmtDuration(Math.ceil((r.clearsAt - now) / 1000)));
  }

  function renderFlag(reasons) {
    flagShown = reasons;
    flagEl.hidden = !reasons.length;
    flagLevel = !reasons.length ? null : reasons.some(r => r.level === 'suspicious') ? 'suspicious' : 'unusual';
    if (flagLevel !== 'suspicious') closeConfirm();
    else if (confirming()) renderConfirm();
    if (!reasons.length) return setFlagTip(false);
    const label = flagLevel === 'suspicious' ? 'Suspicious' : 'Unusual';
    flagEl.classList.toggle('suspicious', flagLevel === 'suspicious');
    flagTip.classList.toggle('suspicious', flagLevel === 'suspicious');
    flagLabel.textContent = label;
    flagTip.replaceChildren(
      h('div', { class: 'flag-head' }, icon('warn', 'flag-icon'), `Why this looks ${label.toLowerCase()}`),
      h('ul', {}, reasons.map(r => h('li', { text: r.text }))),
      h('div', { class: 'flag-foot', text: 'You can still submit as is.' }));
  }

  const flagTipOpen = () => !!flagEl?.classList.contains('open');
  function setFlagTip(open) {
    if (!flagEl) return;
    flagEl.classList.toggle('open', open);
    flagTip.classList.toggle('open', open);
    flagEl.querySelector('.flag-info')?.setAttribute('aria-expanded', String(open));
    placeFlagTip();
  }
  function placeFlagTip() {
    if (!flagTipOpen()) return;
    const pill = flagEl.querySelector('.flag-pill').getBoundingClientRect();
    flagTip.style.right = `${Math.max(8, innerWidth - pill.right)}px`;
    flagTip.style.bottom = `${innerHeight - pill.top + 10}px`;
    flagTip.style.maxHeight = `${Math.max(80, pill.top - 18)}px`;
  }
  const confirming = () => actionsEl?.classList.contains('confirming');
  function renderConfirm() {
    confirmEl.replaceChildren(h('ul', {}, flagShown.filter(r => r.level === 'suspicious')
      .map(r => h('li', {}, icon('warn', 'confirm-icon'), h('span', { text: r.text })))));
  }
  function openConfirm() {
    setFlagTip(false);
    renderConfirm();
    actionsEl.classList.add('confirming');
    confirmEl.hidden = false;
    cancelBtn.hidden = false;
    submitBtn.classList.add('anyway');
    setSubmitLabel('Submit anyway', false, false);
    cancelBtn.focus();
  }
  function closeConfirm() {
    if (!confirming()) return;
    actionsEl.classList.remove('confirming');
    confirmEl.hidden = true;
    cancelBtn.hidden = true;
    submitBtn.classList.remove('anyway');
    setSubmitLabel('Submit');
  }

  function setSubmitLabel(text, loading, withFree = true) {
    const free = !loading && withFree && freeLeft();
    submitBtn.replaceChildren(loading ? spinner('sm') : icon('send', 'btn-icon'), text, free ? h('span', { class: 'free', text: free }) : '');
  }

  let reloadedExpired = false;

  function onSubmitClick() {
    commitFields();
    if (submitBtn.disabled) return;
    if (flagLevel === 'suspicious' && !confirming()) return openConfirm();
    closeConfirm();
    submit();
  }

  function setLocked(locked) {
    for (const [name, input] of Object.entries(fields)) {
      input.disabled = locked
        || (name === 'total' && config.fixedAttempts)
        || (name === 'right' && config.rightLocked);
    }
  }
  function keepAlive() {
    let port = null, timer = null;
    try {
      port = chrome.runtime.connect({ name: 'submit' });
      timer = setInterval(() => { try { port.postMessage({ type: 'keepalive' }); } catch {} }, 20000);
    } catch {}
    return () => { clearInterval(timer); try { port?.disconnect(); } catch {} };
  }

  async function submit() {
    if (submitting) return;
    const { mins, total, right } = readFields();
    const gen = generation;
    submitting = true;
    busy = true;
    setLocked(true);
    setFlagTip(false);
    formError.hidden = true;
    actionsEl.classList.add('submitting');
    submitBtn.disabled = true;
    setSubmitLabel('Submitting…', true);

    const stop = keepAlive();
    let reply;
    try {
      reply = await api('POST', '/api/ext/submit', { lessonId: config.lessonId, mins, total, right });
    } finally {
      stop();
      submitting = false;
      busy = false;
    }
    if (gen !== generation) return;
    const b = reply.body || {};

    if (b.success) {
      config = null;
      reloadedExpired = false;
      if (me && b.account?.freeSubmitsUsed != null) me.account.freeSubmitsUsed = b.account.freeSubmitsUsed;
      return showResult(b);
    }
    // Status 0 is a dropped connection, which can come after the server already posted.
    if (reply.lost || (reply.status === 0 && !reply.stale)) {
      config = null;
      return showMessage({
        name: 'result', kind: 'warn', title: 'We lost track of this submit',
        text: 'It may still have gone through. Check your gradebook before trying again.',
        actions: [linkButton('View gradebook', GRADEBOOK_URL, 'primary'), button('Done', () => load(), 'secondary')],
      });
    }
    if (b.code === 'UNCONFIRMED') {
      config = null;
      return showMessage({
        name: 'result', kind: 'error', title: "Couldn't confirm your submit", text: b.message,
        actions: [linkButton('View gradebook', GRADEBOOK_URL, 'primary'), button('Done', () => load(), 'secondary')],
        support: true,
      });
    }
    if (b.code === 'LESSON_EXPIRED' && !reloadedExpired) {
      reloadedExpired = true;
      config = null;
      await load(true);
      if (view === 'form') showFormError('This activity timed out, so it was loaded again. Check the fields and submit.', true);
      return;
    }
    if (showGate(reply)) return;
    actionsEl.classList.remove('submitting');
    setLocked(false);
    setSubmitLabel('Submit');
    updateRequirements(false);
    flagKey = null;
    showFormError(b.message || 'Something went wrong while submitting. Try again in a moment.');
  }

  function showFormError(text, info) {
    formError.textContent = text;
    formError.classList.toggle('info', !!info);
    formError.hidden = false;
  }

  async function showResult(b) {
    await storage.set({
      [SUBMITTED_KEY]: {
        title: headerTitle.textContent,
        meta: headerMeta.hidden ? '' : headerMeta.textContent,
        recent: b.recent || null,
        gradebook: b.gradebook ? {
          percent: b.gradebook.percent, durationSecs: b.gradebook.durationSecs,
          gradeId: b.gradebook.gradeId, title: b.gradebook.title, score: b.gradebook.score, date: b.gradebook.date,
        } : null,
        used: !!outOfSubmits(),
        at: Date.now(),
      },
    });
    location.assign(GRADEBOOK_URL);
  }

  function showSubmitted(s) {
    setHeader(s.title || 'Hackemos', s.meta);
    const pill = resultPill(s);
    showMessage({
      name: 'result',
      kind: 'ok',
      title: 'Submitted',
      text: pill ? null : submitMessage(s.gradebook),
      actions: s.used ? [unlimitedButton()] : [],
      extra: [pill, s.used && h('p', { class: 'muted', text: 'That was your last free submit.' })],
    });
  }

  const STYLES = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    [hidden] { display: none !important; }

    .root {
      --primary: #00BFFF; --secondary: #8A2BE2; --violet: #b197fc;
      --bg: #0a0a0b; --bg-raised: #121214; --bg-card: #161618;
      --border: rgba(255,255,255,0.066); --border-hover: rgba(255,255,255,0.14);
      --text: #EEEEF2; --text-muted: #a9a9bb; --text-faint: #75758a;
      --ok: #34d399; --bad: #f06a69; --warn: #f5a524;
      --width: 392px;
      --top: max(16px, 18vh); --bottom: 0px;
      font-family: "Hackemos Space Grotesk", system-ui, sans-serif;
      font-size: 14px; line-height: 1.5; color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    .root.compact { --width: 352px; }
    svg { display: block; fill: currentColor; flex-shrink: 0; }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    button { font: inherit; color: inherit; }
    :focus-visible { outline: 2px solid rgba(0,191,255,0.6); outline-offset: 2px; }
    .root { --in: .36s; --out: .26s; --ease-in: cubic-bezier(.35,.15,.15,1); --ease-out: cubic-bezier(.4,0,.6,1); }
    .tab {
      position: fixed; right: 0; top: var(--top); z-index: 1;
      width: 34px; height: 86px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px;
      background: var(--bg-raised); border: 1px solid var(--border-hover); border-right: 0;
      border-radius: 14px 0 0 14px; cursor: pointer; touch-action: none;
      box-shadow: 0 8px 22px rgba(0,0,0,0.3);
      transition: opacity .14s ease calc(var(--out) - .14s), background .15s;
    }
    .tab:hover { background: var(--bg-card); }
    .defs { position: absolute; width: 0; height: 0; }
    .tab-logo { width: 15px; height: 18px; }
    .tab-icon { width: 11px; height: 11px; color: var(--text-muted); }
    .open .tab { opacity: 0; pointer-events: none; transition: opacity .1s ease, background .15s; }
    .dragging .tab { cursor: grabbing; background: var(--bg-card); }

    .panel-wrap {
      position: fixed; top: var(--top); right: 0;
      width: min(var(--width), calc(100vw - 20px));
      filter: drop-shadow(0 8px 11px rgba(0,0,0,0.3));
      visibility: hidden; transition: filter var(--out) var(--ease-out), visibility 0s linear var(--out);
    }
    .open .panel-wrap { filter: drop-shadow(0 18px 16px rgba(0,0,0,0.45)); visibility: visible; transition: filter var(--in) var(--ease-in); }
    .up .panel-wrap { top: auto; bottom: var(--bottom); }
    .panel {
      display: flex; flex-direction: column; max-height: calc(100vh - var(--top) - 20px);
      background: var(--bg-raised); border: 1px solid var(--border-hover); border-right: 0; border-radius: 14px 0 0 14px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
      clip-path: inset(0 0 calc(100% - 86px) calc(100% - 34px) round 14px 0 0 14px);
      transition: clip-path var(--out) var(--ease-out);
      position: relative;
    }
    .up .panel { max-height: calc(100vh - var(--bottom) - 20px); clip-path: inset(calc(100% - 86px) 0 0 calc(100% - 34px) round 14px 0 0 14px); }
    .open .panel { clip-path: inset(0 0 0 0 round 14px 0 0 14px); transition: clip-path var(--in) var(--ease-in); }
    .panel > * { opacity: 0; transition: opacity .1s ease; }
    .open .panel > * { opacity: 1; transition: opacity .22s ease .1s; }
    @media (prefers-reduced-motion: reduce) {
      .tab, .open .tab, .panel-wrap, .panel, .open .panel, .panel > *, .open .panel > * { transition: none; }
    }

    .head { display: flex; align-items: flex-start; gap: 18px; padding: 16px 10px 14px 16px; border-bottom: 1px solid var(--border); }
    .head-logo { width: 37px; height: 44px; }
    .close {
      width: 30px; height: 30px; margin: -3px 0 0 auto; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      background: none; border: 0; border-radius: 8px; color: var(--text-muted); cursor: pointer;
    }
    .close:hover { background: rgba(255,255,255,0.06); color: var(--text); }
    .close-icon { width: 12px; height: 12px; }
    .head-text { flex: 1; min-width: 0; }
    .title { font-size: 18px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.25; overflow-wrap: anywhere; }
    .meta { margin-top: 4px; font-size: 12px; line-height: 1.45; color: var(--text-muted); }
    .solo .head-text { align-self: center; }
    .solo .title { font-size: 22px; }

    .body { padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }

    .loading { min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--text-muted); font-size: 13px; }
    .spinner {
      display: inline-block; width: 24px; height: 24px; border-radius: 50%;
      border: 2.5px solid rgba(255,255,255,0.08); border-top-color: var(--primary);
      animation: spin .7s linear infinite;
    }
    .spinner.sm { width: 13px; height: 13px; border-width: 2px; border-top-color: currentColor; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .reqs { display: flex; flex-direction: column; gap: 7px; padding: 9px 11px; background: rgba(5,5,6,0.6); border: 1px solid var(--border); border-radius: 10px; }
    .reqs-label { font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 500; white-space: nowrap; border: 1px solid var(--border);
      transition: color .15s, background .15s, border-color .15s;
    }
    .chip-state { width: 11px; height: 11px; }
    .chip.met { color: var(--ok); background: rgba(23,138,92,0.1); border-color: rgba(23,138,92,0.3); }
    .chip.unmet { color: var(--bad); background: rgba(226,75,74,0.08); border-color: rgba(226,75,74,0.28); }
    .compact .unit { display: none; }
    .form { display: flex; flex-direction: column; gap: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; }
    .full { grid-column: 1 / -1; }
    .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .label { font-size: 10.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
    .accuracy { margin-left: 6px; font-variant-numeric: tabular-nums; }
    .input {
      display: flex; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 9px;
      transition: border-color .15s, box-shadow .15s;
    }
    .input-icon { width: 12px; height: 12px; margin-left: 12px; color: var(--text-faint); pointer-events: none; }
    .input:focus-within .input-icon { color: var(--text-muted); }
    .input:hover { border-color: var(--border-hover); }
    .input:focus-within { border-color: rgba(0,191,255,0.55); }
    input:focus, input:focus-visible { outline: none; }
    input {
      width: 100%; min-width: 0; padding: 9px 12px 9px 10px; background: transparent; border: 0; outline: none;
      font: inherit; font-size: 14px; color: var(--text); font-variant-numeric: tabular-nums; letter-spacing: .02em;
    }
    input::placeholder { color: var(--text-faint); }
    input:disabled { color: var(--text-muted); cursor: not-allowed; }
    .actions, .form-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .form-actions { padding-top: 12px; border-top: 1px solid var(--border); }
    .form-actions .submit { order: 1; flex: 1; }
    .form-actions .edit { order: 2; flex: 1; }
    .form-actions .flag { order: 3; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 7px 15px; min-height: 34px; border-radius: 9px; cursor: pointer;
      font-size: 13px; font-weight: 700; text-decoration: none !important; border: 1px solid transparent;
      transition: background .15s, border-color .15s, color .15s, opacity .15s;
    }
    .btn.primary { background: var(--primary); border-color: var(--primary); color: #04121a; }
    .btn.primary:hover:not(:disabled) { background: #33ccff; }
    .btn.secondary { background: transparent; border-color: var(--secondary); color: #a78bfa; }
    .btn.secondary:hover { background: rgba(138,43,226,0.1); }
    .btn:disabled { opacity: .45; cursor: not-allowed; }
    .btn-icon { width: 12px; height: 12px; }
    .submit { min-width: 100px; }
    .submit .free { margin-left: 2px; padding: 1px 8px; border-radius: 999px; background: rgba(4,18,26,0.14); font-size: 11.5px; font-weight: 600; }
    .btn.anyway { background: transparent; border-color: rgba(226,75,74,0.45); color: var(--bad); }
    .btn.anyway:hover:not(:disabled) { background: rgba(226,75,74,0.1); }
    .flag { --flag: var(--warn); position: relative; margin-left: auto; }
    .flag-tip { --flag: var(--warn); }
    .flag.suspicious, .flag-tip.suspicious { --flag: #f05252; }
    .flag-pill { height: 34px; display: inline-flex; border-radius: 9px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid var(--border); }
    .flag-info { display: inline-flex; align-items: center; gap: 8px; padding: 0 12px; background: none; border: 0; cursor: pointer; font-size: 13px; font-weight: 500; }
    .flag-info:hover { background: rgba(255,255,255,0.04); }
    .flag-icon { width: 12px; height: 12px; color: var(--flag); }
    .flag-why { font-size: 12px; font-weight: 400; color: var(--text-faint); }
    .flag.open .flag-why, .flag-info:hover .flag-why { color: var(--text-muted); }
    .flag-why { display: inline-flex; align-items: center; gap: 5px; }
    .compact .flag-why { font-size: 0; gap: 0; }
    .flag-caret { width: 9px; height: 9px; transform: rotate(180deg); }
    .flag.open .flag-caret { transform: none; }
    .flag-tip {
      position: fixed; z-index: 2; overflow-y: auto;
      width: max-content; max-width: min(300px, calc(100vw - 80px));
      padding: 12px 14px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border);
      box-shadow: 0 12px 28px rgba(0,0,0,0.5); font-size: 12px; color: var(--text-muted);
      opacity: 0; visibility: hidden; transform: translateY(4px); transition: opacity .12s, transform .12s, visibility .12s;
    }
    .flag-tip.open { opacity: 1; visibility: visible; transform: none; }
    .flag-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; font-size: 13px; color: var(--text); }
    .flag-tip ul { padding-left: 16px; display: flex; flex-direction: column; gap: 5px; }
    .flag-foot { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 11px; }
    .confirm { flex: 1 1 100%; font-size: 13px; }
    .confirm ul { list-style: none; display: flex; flex-direction: column; gap: 8px; padding: 11px 14px; background: rgba(240,82,82,0.06); border: 1px solid rgba(240,82,82,0.22); border-radius: 10px; }
    .confirm li { display: flex; gap: 10px; }
    .confirm-icon { width: 12px; height: 12px; margin-top: 4px; color: #f05252; }
    .confirming .flag, .submitting .flag { display: none; }

    .inline-error { font-size: 13px; color: var(--bad); }
    .inline-error.info { color: var(--text-muted); }
    .message { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 14px 6px 6px; }
    .message h2 { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
    .message p { font-size: 13px; color: var(--text-muted); max-width: 360px; }
    .message .actions { justify-content: center; margin-top: 6px; }
    .message-icon { width: 26px; height: 26px; color: var(--text-muted); }
    .message .result-pill {
      padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,0.03); border: 1px solid var(--border);
      font-size: 13px; color: var(--text-muted); font-variant-numeric: tabular-nums; white-space: nowrap;
    }
    .result-pct { font-weight: 600; }
    .message.ok .message-icon { color: var(--ok); }
    .message.error .message-icon { color: var(--bad); }
    .message.warn .message-icon { color: var(--warn); }
    .muted { color: var(--text-faint) !important; font-size: 12px !important; }
    .support { font-size: 12px !important; margin-top: 4px; }
    .price { display: flex; align-items: baseline; gap: 6px; }
    .amount { font-size: 28px; font-weight: 700; color: var(--text); line-height: 1; }
  `;

  async function start() {
    const { injectEnabled, injectLocked, features, tabTop } = await storage.get(
      ['injectEnabled', 'injectLocked', 'features', 'tabTop']);
    tabFrac = typeof tabTop === 'number' && tabTop >= 0 && tabTop <= 1 ? tabTop : null;
    if (isGradebook) return startGradebook(injectEnabled === false || features?.overlay === false);
    if (injectEnabled === false || features?.overlay === false) return;
    if (injectLocked) return void api('GET', '/api/ext/me');
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  async function startGradebook(off) {
    const { [SUBMITTED_KEY]: submitted } = await storage.get(SUBMITTED_KEY);
    if (!submitted) return;
    await storage.remove(SUBMITTED_KEY);
    if (off || !(Date.now() - submitted.at < SUBMITTED_MAX_AGE)) return;
    mount();
    root.classList.add('open');
    showSubmitted(submitted);
    markSubmittedRow(submitted.gradebook);
  }

  function submittedRow(g) {
    if (!g) return null;
    const rows = [...document.querySelectorAll('.grades__container table tbody tr')];
    if (g.gradeId) {
      const re = new RegExp(`/print_grade_for_student/${Number(g.gradeId)}(?:/|$)`);
      const row = rows.find(r => [...r.querySelectorAll('a[href*="print_grade_for_student/"]')].some(a => re.test(a.getAttribute('href'))));
      if (row) return row;
    }
    if (!g.title || !g.score || !g.date) return null;
    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
    const matches = rows.filter(r => {
      const cells = r.querySelectorAll('td');
      if (cells.length < 5) return false;
      const title = cells[0].cloneNode(true);
      title.querySelectorAll('span').forEach(s => s.remove());
      return clean(title.textContent) === clean(g.title) && clean(cells[1].textContent) === clean(g.score)
        && clean(cells[3].textContent) === clean(g.date);
    });
    return matches.length === 1 ? matches[0] : null;
  }

  function markSubmittedRow(g) {
    const row = submittedRow(g);
    const box = row?.closest('table')?.parentElement;
    if (!box) return;
    row.classList.add('hackemos-submitted');
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    const STROKE = 1.5, RADIUS = 10, INSET_Y = 4;
    const ring = svg('0 0 0 0', [], null);
    ring.removeAttribute('viewBox');
    ring.setAttribute('class', 'hackemos-submitted-ring');
    ring.style.cssText = 'position:absolute;z-index:1;pointer-events:none;overflow:visible;';
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.id = 'hackemos-submitted-gradient';
    grad.append(...[['0%', '#A855F7'], ['50%', '#3B82F6'], ['100%', '#00C8FF']].map(([offset, color]) => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', color);
      return stop;
    }));
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.append(grad);
    const rect = document.createElementNS(SVG_NS, 'rect');
    Object.entries({ x: STROKE / 2, y: STROKE / 2, rx: RADIUS, fill: 'none', stroke: 'url(#hackemos-submitted-gradient)', 'stroke-width': STROKE })
      .forEach(([k, v]) => rect.setAttribute(k, v));
    ring.append(defs, rect);
    box.append(ring);
    const place = () => {
      const b = box.getBoundingClientRect(), r = row.getBoundingClientRect();
      const width = Math.round(r.width), height = Math.round(r.height) - INSET_Y * 2;
      Object.assign(ring.style, {
        top: `${Math.round(r.top - b.top + box.scrollTop) + INSET_Y}px`, left: `${Math.round(r.left - b.left + box.scrollLeft)}px`,
        width: `${width}px`, height: `${height}px`,
      });
      rect.setAttribute('width', width - STROKE);
      rect.setAttribute('height', height - STROKE);
    };
    place();
    new ResizeObserver(place).observe(box);
    row.scrollIntoView({ block: 'nearest' });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (isGradebook) {
      if (changes.features?.newValue?.overlay === false || changes.injectEnabled?.newValue === false) unmount();
      return;
    }
    const account = changes.account?.newValue;
    if (me && account?.id === me.account.id) {
      Object.assign(me.account, { plan: account.plan, freeSubmitLimit: account.freeSubmitLimit, freeSubmitsUsed: account.freeSubmitsUsed });
    }
    if (changes.features?.newValue?.overlay === false) return unmount();
    if (changes.injectEnabled?.newValue === false) return unmount();
    const overlayBack = changes.features?.oldValue?.overlay === false && changes.features.newValue?.overlay !== false;
    if ((changes.injectEnabled || changes.injectLocked?.newValue === false || overlayBack) && !host) start();
  });

  start();
})();
