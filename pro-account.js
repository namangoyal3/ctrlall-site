const ORIGIN = 'https://ctrlall.app';
const CLIENT_ID = '615632895904-thc6ojn9g6i8cnbnh2f42v0oq3q4ct84.apps.googleusercontent.com';
const id = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const token = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const exact = (value, names) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const account = value => exact(value, ['id', 'email']) && id(value.id) && typeof value.email === 'string' && value.email.trim() && value.email.length <= 320;
const entitlement = value => exact(value, ['state', 'plan', 'paid_through', 'verified_at'])
  && ['none', 'active', 'expired', 'revoked', 'unavailable'].includes(value.state)
  && [null, 'pro_monthly', 'pro_yearly'].includes(value.plan)
  && (value.paid_through === null || typeof value.paid_through === 'string' && Number.isFinite(Date.parse(value.paid_through)))
  && (value.verified_at === null || Number.isSafeInteger(value.verified_at) && value.verified_at > 0)
  && (value.state !== 'active' || value.plan !== null && value.paid_through !== null && value.verified_at !== null);
const attemptStates = ['reserved', 'creating_customer', 'creating_checkout', 'unknown', 'pending', 'confirmed', 'failed', 'expired'];

// One page owns either Mac approval or the existing download gate.
export function startAccount(win) {
  const params = new URLSearchParams(win.location.search);
  const flows = ['pro_request', 'pro_plan', 'pro_receipt', 'pro_manage'].filter(key => params.has(key));
  if (!flows.length) return null;
  const flow = flows[0], values = params.getAll(flow), value = values[0];
  const connecting = flow === 'pro_request';
  const requestId = connecting ? value : null;
  const valid = flows.length === 1 && values.length === 1 && [...params.keys()].length === 1
    && (flow === 'pro_plan' ? ['monthly', 'yearly'].includes(value) : flow === 'pro_manage' ? value === '1' : id(value));
  if (valid && win.location.origin !== ORIGIN) {
    win.location.replace(`${ORIGIN}/?${flow}=${value}`);
    return null;
  }
  const doc = win.document;
  function element(tag, text, className) {
    const node = doc.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  const dialog = element('dialog', '', 'wl gate');
  dialog.setAttribute('aria-labelledby', 'pro-account-title');
  const inner = element('div', '', 'inner');
  const close = element('button', '×', 'close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close account');
  const title = element('h2', connecting ? 'Connect your Mac.' : flow === 'pro_plan' ? 'Choose your Pro account.' : flow === 'pro_manage' ? 'Manage your subscription.' : 'Check your payment.');
  title.id = 'pro-account-title';
  const description = element('p', connecting ? 'Sign in with Google, then confirm this account in the app. Payment controls Pro access.' : 'Sign in with the account you use in ctrl+all. A checkout return alone cannot activate Pro.', 'sub');
  const identity = element('p', '', 'sub'), fingerprint = element('p', '', 'note');
  const googleSlot = element('div', '', 'gate-btn');
  const note = element('p', '', 'note');
  note.setAttribute('aria-live', 'polite');
  const actions = element('div', '', 'ctas');
  const connect = element('button', connecting ? 'Connect' : flow === 'pro_manage' ? 'Manage subscription' : flow === 'pro_receipt' ? 'Check status' : 'Continue to checkout', 'btn');
  const switchAccount = element('button', 'Switch account', 'btn btn-2');
  const logout = element('button', 'Sign out', 'btn btn-2');
  const retry = element('button', 'Retry', 'btn btn-2');
  const manage = element('a', 'Manage subscription', 'btn btn-2');
  manage.href = `${ORIGIN}/?pro_manage=1`;
  for (const button of [connect, switchAccount, logout, retry]) button.type = 'button';
  actions.append(connect, manage, switchAccount, logout, retry);
  inner.append(close, title, description, identity, fingerprint, googleSlot, note, actions);
  dialog.append(inner);
  doc.body.append(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');

  let generation = 0, disposed = false, busy = false, selected = null, csrf = null, preview = null, login = null, googleGeneration = -1;
  let paid = null, attempt = null, timer, polls = 0, missingOwnedRecord = false;
  function current(g) { return !disposed && g === generation; }
  function visible(node, show) {
    node.hidden = !show;
    node.style.display = show ? '' : 'none';
  }
  function paint(message, failed = false) {
    identity.textContent = selected ? `Account: ${selected.email}` : '';
    fingerprint.textContent = preview ? `Mac: ${preview.fingerprint}` : '';
    note.textContent = message;
    note.setAttribute('role', failed ? 'alert' : 'status');
    visible(connect, !!selected && !missingOwnedRecord && (connecting ? !!preview && preview.state !== 'complete' : flow !== 'pro_plan' || paid?.state !== 'active'));
    connect.disabled = busy || connecting && (!preview || preview.expires_at <= Math.floor(Date.now() / 1000));
    visible(switchAccount, !!selected);
    visible(manage, !connecting && !!selected && flow !== 'pro_manage');
    visible(logout, !!selected);
    switchAccount.disabled = logout.disabled = busy;
    visible(retry, failed);
    retry.disabled = busy;
    visible(googleSlot, !busy && !!login);
  }
  function clear() {
    selected = csrf = preview = login = paid = attempt = null;
    missingOwnedRecord = false;
    googleSlot.replaceChildren();
    paint('Checking your account…');
  }
  function readCsrf() {
    const values = doc.cookie.split(';').map(part => part.trim()).filter(part => part.startsWith('__Host-ctrlall-csrf='));
    if (values.length !== 1) return null;
    const value = values[0].slice('__Host-ctrlall-csrf='.length);
    return token(value) ? value : null;
  }
  async function api(path, body, proof) {
    const response = await win.fetch(path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', redirect: 'error',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', ...(proof ? { 'X-Ctrlall-CSRF': proof } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw Object.assign(new Error('Account request failed'), { status: response.status });
    const value = await response.json();
    if (!value || value.ok !== true) throw new Error('Invalid account response');
    return value;
  }
  function drawGoogle() {
    if (disposed || busy || !login || googleGeneration === generation) return;
    const google = win.google?.accounts?.id;
    if (!google) {
      if (doc.readyState === 'complete') paint('Google sign-in is unavailable. Select Retry.', true);
      return;
    }
    googleGeneration = generation;
    const attempt = login, g = generation;
    try {
      google.initialize({ client_id: CLIENT_ID, nonce: attempt.nonce, ux_mode: 'popup', auto_select: false, itp_support: true,
        callback: response => {
          if (!current(g) || login !== attempt || busy) return;
          return run(async active => {
            if (typeof response?.credential !== 'string' || response.credential.length < 20 || response.credential.length > 4096) throw new Error('Invalid sign-in');
            const completed = await api('/api/pro/login/complete', { credential: response.credential }, attempt.csrf);
            if (!current(active)) return;
            if (!account(completed.account) || !token(completed.csrf)) throw new Error('Invalid sign-in response');
            login = null;
            await loadSession(active, completed.csrf);
          });
        },
      });
      googleSlot.replaceChildren();
      google.renderButton(googleSlot, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300 });
    } catch {
      googleGeneration = -1;
      paint('Google sign-in is unavailable. Select Retry.', true);
    }
  }
  async function beginLogin(g) {
    const result = await api('/api/pro/login/start', {});
    if (!current(g)) return;
    if (!token(result.nonce) || !token(result.csrf) || !Number.isSafeInteger(result.expires_at) || result.expires_at <= Math.floor(Date.now() / 1000)) throw new Error('Invalid login request');
    login = { nonce: result.nonce, csrf: result.csrf };
    googleGeneration = -1;
    paint(connecting ? 'Continue with Google to choose the account for this Mac.' : 'Continue with Google to choose your Pro account.');
  }
  async function loadSession(g, returnedCsrf) {
    const capturedCsrf = returnedCsrf ?? readCsrf();
    let me;
    try { me = await api('/api/pro/me'); }
    catch (error) {
      if (error.status !== 401) throw error;
      if (current(g)) await beginLogin(g);
      return;
    }
    if (!current(g)) return;
    if (!account(me.account)) throw new Error('Invalid account');
    if (!capturedCsrf) { await beginLogin(g); return; }
    if (!connecting) {
      if (!entitlement(me.entitlement)) throw new Error('Invalid paid status');
      selected = me.account;
      csrf = capturedCsrf;
      paid = me.entitlement;
      if (flow === 'pro_receipt') await loadAttempt(g);
      else paint(flow === 'pro_manage' ? 'Check this account, then select Manage subscription.'
        : paid.state === 'active' ? 'This account already has paid Pro access. Manage its subscription instead of buying again.'
          : `${value === 'monthly' ? '$5 a month' : '$48 a year'}. Check this account, then select Continue to checkout. Payment is required for hosted access.`);
      return;
    }
    const details = await api(`/api/pro/installations/request?request=${requestId}`);
    if (!current(g)) return;
    if (!exact(details, ['ok', 'request_id', 'state', 'expires_at', 'fingerprint']) || details.request_id !== requestId
        || !['pending_browser', 'pending_app', 'complete'].includes(details.state)
        || !Number.isSafeInteger(details.expires_at) || details.expires_at <= 0
        || details.state !== 'complete' && details.expires_at <= Math.floor(Date.now() / 1000)
        || typeof details.fingerprint !== 'string' || !/^[a-f0-9]{4}(?:-[a-f0-9]{4}){2}$/.test(details.fingerprint)) throw new Error('Invalid installation preview');
    selected = me.account;
    csrf = capturedCsrf;
    preview = details;
    paint(details.state === 'complete' ? 'This Mac already has this account connection. Return to the app.' : 'Check the account and Mac fingerprint. Select Connect, then confirm the account in the app.');
  }
  async function loadAttempt(g) {
    const result = await api(`/api/pro/checkout/status?attempt=${value}`);
    if (!current(g)) return;
    if (!exact(result, ['ok', 'attempt_id', 'state', 'entitlement']) || result.attempt_id !== value
      || !attemptStates.includes(result.state) || !entitlement(result.entitlement)) throw new Error('Invalid checkout status');
    attempt = result.state;
    paid = result.entitlement;
    paint(attempt === 'confirmed' && paid.state === 'active' ? 'Payment confirmed. Return to the app and check access with this account.'
      : attempt === 'unknown' ? 'We cannot confirm this checkout yet. Check its status before you try another purchase.'
        : ['failed', 'expired'].includes(attempt) ? 'This checkout did not activate Pro. Choose a plan only after you check this account.'
          : 'Dodo has not confirmed this checkout yet. Select Check status or return here later.');
  }
  function providerUrl(raw, purpose) {
    const host = purpose === 'checkout' ? 'checkout' : 'customer';
    if (typeof raw !== 'string' || !new RegExp(`^https://(?:test\\.)?${host}\\.dodopayments\\.com/`).test(raw)) throw new Error('Invalid provider URL');
    const parsed = new URL(raw);
    if (parsed.username || parsed.password || parsed.hash || parsed.port) throw new Error('Invalid provider URL');
    return parsed.href;
  }
  async function run(work) {
    if (busy || disposed) return;
    busy = true;
    let g = ++generation;
    paint(note.textContent);
    try { await work(g); }
    catch (error) {
      if (!current(g)) return;
      if (!connecting && error.status === 404 && selected && csrf) {
        missingOwnedRecord = true;
        paid = attempt = preview = login = null;
        paint('No subscription or owned checkout exists for this account. Select Switch account or Retry.', true);
        return;
      }
      clear();
      if (error.status === 401 || error.status === 403) {
        g = ++generation;
        try { await loadSession(g); }
        catch { if (current(g)) { clear(); paint('The account changed or could not be verified. Select Retry. No connection was confirmed.', true); } }
      } else paint(connecting ? 'This connection request is unavailable or expired. Select Retry or start again in the app.'
        : error.status === 404 ? 'No subscription or owned checkout exists for this account. Select Switch account or Retry.'
          : 'We cannot verify this checkout or subscription. Select Retry to check the account. Do not start another purchase.', true);
    } finally {
      busy = false;
      if (current(g)) {
        paint(note.textContent, note.getAttribute('role') === 'alert'); drawGoogle();
        if (flow === 'pro_receipt' && ['pending', 'reserved', 'creating_customer', 'creating_checkout', 'unknown'].includes(attempt) && polls++ < 120) {
          win.clearTimeout?.(timer);
          timer = win.setTimeout?.(() => { timer = undefined; void run(active => loadAttempt(active)); }, 5000);
        }
      }
    }
  }
  connect.onclick = () => {
    if (!connecting) {
      if (!selected || busy) return;
      const capturedCsrf = csrf;
      return run(async g => {
        if (flow === 'pro_receipt') { await loadAttempt(g); return; }
        if (flow === 'pro_manage') {
          const result = await api('/api/pro/portal', {}, capturedCsrf);
          if (!current(g)) return;
          if (!exact(result, ['ok', 'url'])) throw new Error('Invalid portal');
          win.location.href = providerUrl(result.url, 'portal');
          return;
        }
        const result = await api('/api/pro/checkout', { plan: value === 'monthly' ? 'pro_monthly' : 'pro_yearly' }, capturedCsrf);
        if (!current(g)) return;
        if (!exact(result, ['ok', 'attempt_id', 'state', 'checkout_url']) || !id(result.attempt_id) || !attemptStates.includes(result.state)) throw new Error('Invalid checkout');
        if (result.checkout_url !== null) win.location.href = providerUrl(result.checkout_url, 'checkout');
        else win.location.replace(`${ORIGIN}/?pro_receipt=${result.attempt_id}`);
      });
    }
    if (!selected || !preview || preview.state === 'complete' || busy) return;
    const displayed = { ...selected }, capturedCsrf = csrf;
    return run(async g => {
      if (preview.expires_at <= Math.floor(Date.now() / 1000)) throw new Error('Expired request');
      const result = await api('/api/pro/installations/approve', { request_id: requestId }, capturedCsrf);
      if (!current(g)) return;
      if (!exact(result, ['ok', 'request_id', 'state']) || result.request_id !== requestId || !['pending_app', 'complete'].includes(result.state)) throw new Error('Invalid approval');
      selected = displayed;
      preview = { ...preview, state: 'complete' };
      paint('Return to the app and confirm this account there. This step grants no paid access.');
    });
  };
  async function signOut(g) {
    const capturedCsrf = csrf;
    clear();
    const result = await api('/api/pro/logout', {}, capturedCsrf);
    if (!current(g)) return;
    if (!exact(result, ['ok'])) throw new Error('Invalid logout');
    await loadSession(g);
  }
  switchAccount.onclick = logout.onclick = () => run(signOut);
  retry.onclick = () => run(async g => { clear(); await loadSession(g); });
  function restore(event) {
    if (!event.persisted) return;
    win.removeEventListener('pageshow', restore);
    dialog.remove();
    return startAccount(win)?.ready;
  }
  function pagehide(event) {
    dispose();
    if (event.persisted) win.addEventListener('pageshow', restore, { once: true });
  }
  function dispose() {
    disposed = true;
    win.clearTimeout?.(timer);
    generation++;
    selected = csrf = preview = login = null;
    win.removeEventListener('load', drawGoogle);
    win.removeEventListener('pagehide', pagehide);
    win.removeEventListener('pageshow', restore);
  }
  close.onclick = () => { dispose(); dialog.close(); };
  dialog.addEventListener('close', dispose);
  win.addEventListener('pagehide', pagehide, { once: true });
  win.addEventListener('load', drawGoogle, { once: true });
  clear();
  const ready = valid ? run(g => loadSession(g)) : Promise.resolve(paint('This connection link is invalid. Start again from the app.', true));
  if (!valid) { visible(retry, false); retry.onclick = null; }
  return { ready, dispose };
}

if (typeof window !== 'undefined') startAccount(window);
