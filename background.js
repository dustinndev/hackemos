
import { API_BASE } from './config.js';
const CJ_URL = 'https://conjuguemos.com/';
const SESSION_RE = /^[A-Za-z0-9]{1,128}$/;
const PATH_RE = /^\/api\/ext\/[A-Za-z-]+(\?[^#]*)?$/;
const SIGNED_OUT = { success: false, code: 'CJ_SESSION_MISSING', message: 'Sign in to Conjuguemos in this browser, then try again.' };
const UNREACHABLE = "Couldn't reach Hackemos. Check your connection and try again.";
let queue = Promise.resolve();
let pending = 0;
function enqueue(task) {
  pending++;
  const run = queue.then(task, task).finally(() => {
    pending--;
    if (!pending && updateWaiting) chrome.runtime.reload();
  });
  queue = run.catch(() => {});
  return run;
}
const readSession = () => chrome.cookies.get({ url: CJ_URL, name: 'ci_session' });
function writeSession(old, value) {
  return chrome.cookies.set({
    url: CJ_URL,
    name: 'ci_session',
    value,
    path: old.path,
    secure: old.secure,
    httpOnly: old.httpOnly,
    sameSite: old.sameSite,
    expirationDate: old.expirationDate,
    storeId: old.storeId,
    ...(old.hostOnly ? {} : { domain: old.domain }),
  });
}
async function sessionTag(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest).slice(0, 12)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function noteRotation(oldValue, newValue) {
  const { accountSession } = await chrome.storage.local.get('accountSession');
  if (accountSession && accountSession === await sessionTag(oldValue)) {
    await chrome.storage.local.set({ accountSession: await sessionTag(newValue) });
  }
}

async function writeBack(sent, value) {
  const now = await readSession();
  if (!now || now.value !== sent.value) return false;
  await writeSession(now, value);
  await noteRotation(sent.value, value).catch(() => {});
  return true;
}

const retryable = path => !path.startsWith('/api/ext/submit');

async function api(msg, retried = false) {
  const { method = 'GET', path, body } = msg;
  if (!PATH_RE.test(path || '')) return { status: 0, error: 'Unknown request.' };
  const cookie = await readSession();
  if (!cookie || !SESSION_RE.test(cookie.value)) return { status: 400, body: SIGNED_OUT };

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      cache: 'no-store',
      headers: {
        'X-CJ-Session': cookie.value,
        'X-Ext-Version': chrome.runtime.getManifest().version,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { status: 0, error: UNREACHABLE };
  }

  const rotated = res.headers.get('x-cj-session');
  let used = cookie.value;
  if (rotated && SESSION_RE.test(rotated) && rotated !== cookie.value) {
    if (await writeBack(cookie, rotated).catch(err => console.warn('cookie write-back failed:', err.message))) used = rotated;
  }

  let data = null;
  try { data = await res.json(); } catch { }
  if (!data || typeof data !== 'object') {
    return { status: res.status, body: { success: false, code: 'SERVER_ERROR', message: 'Something went wrong. Try again in a moment.' } };
  }
  if (data.code === 'CJ_SIGNED_OUT' && !retried && retryable(path)) {
    const now = await readSession();
    if (now && SESSION_RE.test(now.value) && now.value !== cookie.value) return api(msg, true);
  }
  await afterReply(path, data, used).catch(err => console.warn('after reply:', err.message));
  return { status: res.status, body: data };
}

async function setLimitState(account) {
  if (!account) return;
  const out = account.plan !== 'paid' && account.freeSubmitLimit != null
    && (account.freeSubmitsUsed || 0) >= account.freeSubmitLimit;
  await chrome.storage.local.set({ injectLocked: out });
  await chrome.action.setBadgeText({ text: out ? '!' : '' });
  if (out) await chrome.action.setBadgeBackgroundColor({ color: '#8A2BE2' });
}

const REF_COOKIE = { url: API_BASE + '/', name: 'hk_ref' };
const REF_RE = /^[0-9a-z]{5,14}$/;
async function claimReferral() {
  const ref = await chrome.cookies.get(REF_COOKIE).catch(() => null);
  if (!ref || !REF_RE.test(ref.value)) return;
  const { body } = await api({ method: 'POST', path: '/api/ext/referral-claim', body: { code: ref.value } });
  if (!body?.success || body.status === 'pending') return;
  await chrome.cookies.remove(REF_COOKIE).catch(() => {});
  const { account } = await chrome.storage.local.get('account');
  if (body.status === 'granted' && account?.freeSubmitLimit != null) {
    const updated = { ...account, freeSubmitLimit: account.freeSubmitLimit + (body.bonus || 0) };
    await chrome.storage.local.set({ account: updated });
    await setLimitState(updated);
  }
}

async function afterReply(path, data, session) {
  if (data.code === 'EXT_OUTDATED') chrome.runtime.requestUpdateCheck().catch(() => {});
  if (path.startsWith('/api/ext/me') && data.success) {
    await chrome.storage.local.set({ features: data.features, account: data.account, accountSession: await sessionTag(session) });
    await setLimitState(data.account);
    // Queued behind this request, not awaited: it runs on the same queue.
    enqueue(claimReferral).catch(err => console.warn('referral claim:', err.message));
  }
  if (path.startsWith('/api/ext/submit') && data.account?.freeSubmitsUsed != null) {
    const { account } = await chrome.storage.local.get('account');
    if (account) {
      const updated = { ...account, freeSubmitsUsed: data.account.freeSubmitsUsed };
      await chrome.storage.local.set({ account: updated });
      await setLimitState(updated);
    }
  }

  if (data.code === 'LIMIT_REACHED') {
    const { account } = await chrome.storage.local.get('account');
    if (account) await setLimitState({ ...account, freeSubmitsUsed: Math.max(account.freeSubmitsUsed || 0, account.freeSubmitLimit ?? 0) });
  }
}
const OPEN_PATHS = new Set(['/', '/?upgrade=1', '/settings']);
const RELAY_ORIGINS = new Set(['https://app.hackemos.com', new URL(API_BASE).origin]);
const SESSION_PATHS = new Set(['/', '/login', '/settings']);
async function relay(message, sender) {
  const sessionAllowed = SESSION_PATHS.has(URL.parse(sender.url)?.pathname);
  switch (message?.type) {
    case 'hackemos:ping':
      return { version: chrome.runtime.getManifest().version };
    case 'hackemos:cjSession': {
      if (!sessionAllowed) return { cjSession: null, reason: 'notHere' };
      const cookie = await readSession();
      if (!cookie || !SESSION_RE.test(cookie.value)) return { cjSession: null, reason: 'signedOut' };
      const { account, accountSession } = await chrome.storage.local.get(['account', 'accountSession']);
      const cjUsername = account?.cjUsername && accountSession === await sessionTag(cookie.value) ? account.cjUsername : null;
      return { cjSession: cookie.value, cjUsername };
    }
    case 'hackemos:setCjSession': {
      if (!sessionAllowed || !SESSION_RE.test(message.value || '') || !SESSION_RE.test(message.previous || '')) return { ok: false };
      const cookie = await readSession();
      if (!cookie) return { ok: false };
      if (message.value === cookie.value) return { ok: true };
      return { ok: await writeBack({ value: message.previous }, message.value) };
    }
  }
  return { error: 'unknown' };
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (msg?.type === 'relay') {
    if (!RELAY_ORIGINS.has(sender.origin) || sender.frameId !== 0) return false;
    relay(msg.message, sender).then(sendResponse, err => sendResponse({ error: err.message || 'failed' }));
    return true;
  }
  if (msg?.type === 'openApp') {
    if (OPEN_PATHS.has(msg.path)) chrome.tabs.create({ url: API_BASE + msg.path }).catch(() => {});
    return false;
  }
  if (msg?.type !== 'api') return false;
  enqueue(() => api(msg)).then(sendResponse, err => sendResponse({ status: 0, error: err.message || UNREACHABLE }));
  return true; 
});

chrome.cookies.onChanged.addListener(({ cookie, removed }) => {
  if (removed || cookie.name !== 'ci_session' || !cookie.domain.endsWith('conjuguemos.com') || !SESSION_RE.test(cookie.value)) return;
  const patterns = [...RELAY_ORIGINS].map(origin => `${origin}/*`);
  chrome.tabs.query({ url: patterns }).then(tabs => {
    for (const tab of tabs) {
      if (!SESSION_PATHS.has(URL.parse(tab.url || '')?.pathname)) continue;
      chrome.tabs.sendMessage(tab.id, { type: 'hackemos:cjSessionChanged', value: cookie.value }, { frameId: 0 }).catch(() => {});
    }
  }).catch(() => {});
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'submit' || port.sender?.id !== chrome.runtime.id) return;
  port.onMessage.addListener(() => {});
});


let updateWaiting = false;
chrome.runtime.onUpdateAvailable.addListener(() => {
  if (pending) updateWaiting = true;
  else chrome.runtime.reload();
});
