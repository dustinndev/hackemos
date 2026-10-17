import { MASK_ACCOUNT } from './config.js';

const SIGN_IN_URL = 'https://conjuguemos.com/auth/login';
const UNREACHABLE = "Couldn't reach Hackemos. Check your connection and try again.";

const $ = id => document.getElementById(id);
const app = $('app');

async function api(method, path, body) {
  try {
    const reply = await chrome.runtime.sendMessage({ type: 'api', method, path, body });
    if (reply && reply.status !== 0) return reply;
    return { status: 0, body: { success: false, message: reply?.error || UNREACHABLE } };
  } catch {
    return { status: 0, body: { success: false, message: UNREACHABLE } };
  }
}

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

const link = (text, href, cls) => h('a', { href, target: '_blank', rel: 'noopener', class: cls, text });
function setDashLink(url) {
  $('dashLink').hidden = !url;
  if (url) $('dashLink').href = url;
}

function backAround(iso) {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return '';
  return ` Back around ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
}

function showMessage(title, text, ...actions) {
  setDashLink(null);
  app.replaceChildren(h('section', { class: 'message' },
    title && h('h1', { text: title }),
    text && h('p', { text }),
    actions.length > 0 && h('div', { class: 'actions' }, actions)));
}

function showSignedOut() {
  showMessage('Sign in to Conjuguemos to use Hackemos',
    "Hackemos uses the Conjuguemos account you're signed in to.",
    link('Sign in to Conjuguemos', SIGN_IN_URL, 'btn primary'));
}

async function showFailure(reply) {
  const b = reply.body || {};
  switch (b.code) {
    case 'CJ_SESSION_MISSING':
    case 'CJ_SIGNED_OUT':
      return showSignedOut();
    case 'EXT_OUTDATED':
      return showMessage('Update Hackemos',
        'This version is out of date. Chrome updates extensions on its own within about a day. To update now: open chrome://extensions, turn on Developer mode, then click Update.');
    case 'CJ_NOT_STUDENT':
      return showMessage('Student accounts only', b.message || 'Hackemos works with student accounts.');
    case 'PAUSED': {
      const { account } = await chrome.storage.local.get('account').catch(() => ({}));
      const banner = h('div', { class: 'banner danger', role: 'status', text: `Hackemos is down: ${b.message}${backAround(b.until)}` });
      if (!account) return app.replaceChildren(banner);
      return renderAccount({ account, prefs: null, broadcasts: [], paused: true }, banner);
    }
  }
  showMessage(null, b.message || 'Something went wrong. Try again in a moment.',
    h('button', { class: 'btn primary', type: 'button', onclick: load, text: 'Try again' }));
}

async function dismissedSet() {
  const { dismissedBroadcasts } = await chrome.storage.local.get('dismissedBroadcasts').catch(() => ({}));
  return new Set(Array.isArray(dismissedBroadcasts) ? dismissedBroadcasts : []);
}

async function broadcastList(list) {
  const dismissed = await dismissedSet();
  return (list || []).filter(b => !dismissed.has(b.id)).map(b => {
    const el = h('div', { class: `banner ${b.level || 'info'}`, role: 'status' }, h('span', { text: b.message }));
    if (b.dismissible) {
      el.append(h('button', {
        class: 'banner-close', type: 'button', 'aria-label': 'Dismiss', text: '×',
        onclick: async () => {
          el.remove();
          if (b.notice) return api('POST', '/api/ext/notice-dismiss', { id: b.id });
          dismissed.add(b.id);
          await chrome.storage.local.set({ dismissedBroadcasts: [...dismissed] });
        },
      }));
    }
    return el;
  });
}

async function pollList(polls) {
  const dismissed = await dismissedSet();
  return (polls || []).filter(p => p?.step && !dismissed.has(p.id)).map(p => {
    const el = h('section', { class: `poll${p.dismissible ? ' closable' : ''}`, 'aria-label': 'Poll' });
    if (p.dismissible) {
      el.append(h('button', {
        class: 'banner-close poll-close', type: 'button', 'aria-label': 'Dismiss poll', text: '×',
        onclick: async () => {
          dismissed.add(p.id);
          el.remove();
          await chrome.storage.local.set({ dismissedBroadcasts: [...dismissed] });
        },
      }));
    }
    el.append(pollStep(p.id, p.step, el));
    return el;
  });
}

function pollStep(pollId, step, el) {
  const body = h('div', { class: 'poll-step' }, h('p', { class: 'poll-question', text: step.question }));
  if (step.type === 'text') {
    const input = h('input', { type: 'text', maxlength: 300, placeholder: 'Your answer', autocomplete: 'off', 'aria-label': step.question });
    const send = h('button', { class: 'poll-send', type: 'submit', text: 'Send', disabled: true });
    input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
    body.append(h('form', {
      class: 'poll-text',
      onsubmit: async e => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.disabled = send.disabled = true;
        if (!await sendPollAnswer(pollId, step.id, { text }, el)) {
          input.disabled = false;
          send.disabled = !input.value.trim();
        }
      },
    }, input, send));
    return body;
  }
  const options = h('div', { class: 'poll-options', role: 'group', 'aria-label': step.question });
  for (const [option, text] of step.options.entries()) {
    const btn = h('button', {
      class: 'poll-option', type: 'button',
      onclick: async () => {
        const all = options.querySelectorAll('button');
        all.forEach(b => { b.disabled = true; });
        btn.classList.add('picked');
        if (!await sendPollAnswer(pollId, step.id, { option }, el)) {
          btn.classList.remove('picked');
          all.forEach(b => { b.disabled = false; });
        }
      },
    }, text);
    options.append(btn);
  }
  body.append(options);
  return body;
}

async function sendPollAnswer(pollId, stepId, answer, el) {
  const reply = await api('POST', '/api/ext/poll-vote', { id: pollId, step: stepId, ...answer });
  const b = reply.body || {};
  if (!b.success) return false;
  if (b.next) {
    setTimeout(() => {
      el.querySelector('.poll-step')?.replaceWith(pollStep(pollId, b.next, el));
      el.querySelector('.poll-step input')?.focus();
    }, 350);
    return true;
  }
  el.classList.add('answered');
  el.append(h('p', { class: 'poll-thanks', text: 'Thanks for answering' }));
  setTimeout(() => el.remove(), 1800);
  return true;
}

function initials(text) {
  const clean = (text || '').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}
function identity(account) {
  if (MASK_ACCOUNT) {
    return h('div', { class: 'who' }, h('span', { class: 'avatar', 'aria-hidden': 'true', text: 'U' }),
      h('div', { class: 'who-text' }, h('span', { class: 'who-name', text: 'Username' })));
  }
  const login = account.hasLogin && account.profile ? (account.profile.username || account.profile.email) : null;
  const name = account.cjUsername || login || 'Your account';
  const avatar = account.profile?.avatar;
  const pic = avatar
    ? h('img', { class: 'avatar', src: avatar, alt: '', width: 34, height: 34 })
    : h('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(name) });
  return h('div', { class: 'who' }, pic,
    h('div', { class: 'who-text' },
      h('span', { class: 'who-name', text: name }),
      account.cjUsername && login ? h('span', { class: 'who-sub', text: login } ) : null));
}

function plan(me) {
  const { account } = me;
  if (account.plan === 'paid' || account.freeSubmitLimit == null) {
    return h('section', { class: 'plan' }, h('p', { class: 'plan-line pro' }, icon('crown'), h('span', {}, h('strong', { text: 'Unlimited' }), ' submits')));
  }
  const limit = account.freeSubmitLimit;
  const left = Math.max(0, limit - account.freeSubmitsUsed);
  const out = left === 0;
  const price = me.price?.label ? ` · ${me.price.label}` : '';
  const url = me.upgradeUrl || 'https://app.hackemos.com/?upgrade=1';
  return h('section', { class: `plan ${out ? 'out' : ''}` },
    h('p', { class: 'plan-line' },
      out ? h('strong', { class: 'none', text: 'No free submits left' }) : [h('strong', { text: `${left} of ${limit}` }), ' free submits']),
    h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Free submits left', 'aria-valuemin': 0, 'aria-valuemax': limit, 'aria-valuenow': left },
      h('div', { style: `width:${limit ? left / limit * 100 : 0}%` })),
    !me.paused && (out
      ? [link(`Get unlimited${price}`, url, 'btn primary'),
        me.referral && link(`or refer a classmate for +${me.referral.bonus}`, referUrl(me), 'plan-refer')]
      : h('a', { href: url, target: '_blank', rel: 'noopener', class: 'plan-link' }, `Get unlimited${price}`, icon('chevron').firstChild)));
}

const referUrl = me => me.referUrl || 'https://app.hackemos.com/?refer=1';

const ICONS = {
  crown: ['0 0 576 512', 'M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6l277.2 0c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z'],
  chevron: ['0 0 320 512', 'M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z'],
  layers: ['0 0 576 512', 'M264.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 149.8C37.4 145.8 32 137.3 32 128s5.4-17.9 13.9-21.8L264.5 5.2zM476.9 209.6l53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 277.8C37.4 273.8 32 265.3 32 256s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0l152-70.2zm-152 198.2l152-70.2 53.2 24.6c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L45.9 405.8C37.4 401.8 32 393.3 32 384s5.4-17.9 13.9-21.8l53.2-24.6 152 70.2c23.4 10.8 50.4 10.8 73.8 0z'],
  wand: ['0 0 576 512', 'M234.7 42.7L197 56.8c-3 1.1-5 4-5 7.2s2 6.1 5 7.2l37.7 14.1L248.8 123c1.1 3 4 5 7.2 5s6.1-2 7.2-5l14.1-37.7L315 71.2c3-1.1 5-4 5-7.2s-2-6.1-5-7.2L277.3 42.7 263.2 5c-1.1-3-4-5-7.2-5s-6.1 2-7.2 5L234.7 42.7zM46.1 395.4c-18.7 18.7-18.7 49.1 0 67.9l34.6 34.6c18.7 18.7 49.1 18.7 67.9 0L529.9 116.5c18.7-18.7 18.7-49.1 0-67.9L495.3 14.1c-18.7-18.7-49.1-18.7-67.9 0L46.1 395.4zM484.6 82.6l-105 105-23.3-23.3 105-105 23.3 23.3zM7.5 117.2C3 118.9 0 123.2 0 128s3 9.1 7.5 10.8L64 160l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L128 160l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L128 96 106.8 39.5C105.1 35 100.8 32 96 32s-9.1 3-10.8 7.5L64 96 7.5 117.2zm352 256c-4.5 1.7-7.5 6-7.5 10.8s3 9.1 7.5 10.8L416 416l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L480 416l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L480 352l-21.2-56.5c-1.7-4.5-6-7.5-10.8-7.5s-9.1 3-10.8 7.5L416 352l-56.5 21.2z'],
  warn: ['0 0 512 512', 'M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z'],
};

function icon(name) {
  const [viewBox, d] = ICONS[name];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return h('span', { class: `icon icon-${name}` }, svg);
}

function toggle({ label, iconName, checked, onchange }) {
  const input = h('input', { type: 'checkbox', role: 'switch', checked });
  input.addEventListener('change', () => onchange(input));
  return h('label', { class: 'toggle' },
    iconName && icon(iconName),
    h('span', { class: 'toggle-text', text: label }),
    input, h('span', { class: 'switch', 'aria-hidden': 'true' }));
}

async function injectToggle() {
  const { injectEnabled } = await chrome.storage.local.get('injectEnabled').catch(() => ({}));
  return toggle({
    label: 'Show overlay on assignments',
    iconName: 'layers',
    checked: injectEnabled !== false,
    onchange: input => chrome.storage.local.set({ injectEnabled: input.checked }),
  });
}

function prefToggles(prefs) {
  const pref = (key, label, iconName) => toggle({
    label, iconName, checked: !!prefs[key],
    onchange: async input => {
      input.disabled = true;
      const reply = await api('POST', '/api/ext/prefs', { key, value: input.checked });
      input.disabled = false;
      if (reply.body?.success) Object.assign(prefs, reply.body.prefs);
      else input.checked = !input.checked;
    },
  });
  return [pref('magicAutofill', 'Magic autofill', 'wand'), pref('analyzeSubmissions', 'Submission checks', 'warn')];
}
function supportId(account) {
  const btn = h('button', {
    class: 'id', type: 'button', title: 'Copy', text: `ID #${account.id}`,
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(`#${account.id}`);
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = `ID #${account.id}`; }, 1500);
      } catch {}
    },
  });
  return btn;
}

const outOfSubmits = account => account.plan !== 'paid' && account.freeSubmitLimit != null
  && (account.freeSubmitsUsed || 0) >= account.freeSubmitLimit;

async function renderAccount(me, ...top) {
  const { account } = me;
  setDashLink(me.dashboardUrl || 'https://app.hackemos.com/');
  app.replaceChildren(
    ...top,
    ...await broadcastList(me.broadcasts),
    ...(me.paused ? [] : await pollList(me.polls)),
    identity(account),
    plan(me),
    outOfSubmits(account) ? '' : h('section', { class: 'settings' }, await injectToggle(), ...(me.prefs ? prefToggles(me.prefs) : [])),
    h('footer', { class: 'foot' },
      link('Settings', me.settingsUrl || 'https://app.hackemos.com/settings'),
      me.referral && !me.paused && !outOfSubmits(account) && link('Refer a classmate', referUrl(me)),
      supportId(account)));
}

async function load() {
  app.replaceChildren(h('p', { class: 'loading', text: 'Loading…' }));
  const reply = await api('GET', '/api/ext/me');
  if (!reply.body?.success) return showFailure(reply);
  await renderAccount(reply.body);
}

load();
