// Sign-in for the Trail Book Purchase Model: "Sign in with Zoho", with a shared password as a backup. This file is the same on every
// TrailBlazer site except the SITE block below and the config line at the end; copy it as is to protect another site.
//
// Zoho sign-in (ZOHO_LOGIN_CLIENT_ID and ZOHO_LOGIN_CLIENT_SECRET, the "TrailBlazer Sign In" Server-based client in the
// Zoho API console, which lists https://<this site>/__auth/callback among its redirect URIs; ZOHO_ACCOUNTS_URL and
// ZOHO_API_URL as the CRM link uses them). The user signs in to Zoho and agrees to let the site read who they are in
// Zoho CRM; the gate then asks Zoho CRM, with the user's own short-lived token (never stored), for the current user and
// their organisation. Only an active user of TrailBlazer's CRM organisation gets in; on a site with requireList, only one
// whose email is also on SIGNIN_ALLOWED_EMAILS (comma or space separated; empty lets no one in). Deactivating someone in
// Zoho ends their access when their session runs out (SESSION_HOURS); taking them off the list ends it at once. The
// session cookie is signed with a key derived from the client secret, so a new secret signs everyone out.
//
// The shared password (SITE.passwordVar) is the backup: it works while it is set, from "Use the shared password instead"
// on the sign-in page, and lets in anyone who knows it (no name on saves). With neither configured the gate fails closed
// and shows a message instead of the site.
//
// Paths: /__signin (the page; the password form posts here), /__signin/zoho (off to Zoho), /__auth/callback (back from
// Zoho), /__signout, /__me (who is signed in, for the page's "Signed in as" line). auth-rate-limit.js limits the sign-in
// paths per IP address. Netlify's own password protection must be off, or it asks first and blocks the callback.

const SITE = {
  title: 'Trail Book Purchase Model',
  aud: 'purchase',                        // a session for this site is not accepted by another site sharing the Zoho client
  requireList: true,                      // only the people on SIGNIN_ALLOWED_EMAILS
  passwordVar: 'PURCHASE_SITE_PASSWORD',  // the backup password
  passwordCookie: 'tbf_purchase', passwordText: 'purchase-session',
};
// TrailBlazer's Zoho CRM organisation (crm.zoho.com/crm/org20963693). Not a secret: it is in every CRM link. Zoho's
// consent page lists every CRM organisation the person belongs to; the live one is ORG_NAME (a second production
// organisation, "TrailblazerFinance", and the sandboxes are not).
const ORG = '20963693', ORG_NAME = 'Trailblazer Finance';
const SESSION_COOKIE = 'tbf_user', STATE_COOKIE = 'tbf_oauth';   // the backup password's cookie is SITE.passwordCookie, read per request
const SESSION_HOURS = 12, PASSWORD_DAYS = 30;
const SIGNIN = '/__signin', ZOHO = '/__signin/zoho', CALLBACK = '/__auth/callback', SIGNOUT = '/__signout', ME = '/__me';
const SCOPES = 'ZohoCRM.users.READ,ZohoCRM.org.READ';

const env = k => String((globalThis.Netlify ? Netlify.env.get(k) : globalThis.process?.env[k]) || '');
const zohoConfigured = () => !['ZOHO_LOGIN_CLIENT_ID', 'ZOHO_LOGIN_CLIENT_SECRET', 'ZOHO_ACCOUNTS_URL', 'ZOHO_API_URL'].some(k => !env(k).trim());
export const allowedEmails = () => env('SIGNIN_ALLOWED_EMAILS').toLowerCase().split(/[\s,;]+/).filter(Boolean);
const allowed = email => { const list = allowedEmails(); return SITE.requireList ? list.includes(email) : (!list.length || list.includes(email)); };

const page = (title, body, status = 200) => new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F6F5F3;font-family:'Poppins','Segoe UI',system-ui,Arial,sans-serif;color:#333}
.card{width:min(92vw,380px);background:#fff;border:1px solid #ECECEC;border-radius:16px;padding:28px 32px}h1{font-size:18px;margin:0 0 4px;color:#1C1C1C}p{font-size:13px;color:#6F6F6F;margin:0 0 18px}
input{width:100%;box-sizing:border-box;height:38px;padding:0 12px;border:1px solid #E2E2E2;border-radius:10px;font:inherit;font-size:14px;margin-bottom:12px}input:focus{outline:none;border-color:#E9B84A;box-shadow:0 0 0 3px rgba(233,184,74,.15)}
button,.btn{display:flex;align-items:center;justify-content:center;width:100%;box-sizing:border-box;height:38px;border:none;border-radius:999px;background:#1C1C1C;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}
.err{color:#B4513E;font-size:12px;font-weight:600;margin-bottom:10px}.eyebrow{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#B4862E;margin-bottom:6px}
details{margin-top:16px;font-size:12px;color:#6F6F6F}summary{cursor:pointer;margin-bottom:10px}</style></head>
<body><div class="card"><div class="eyebrow">TrailBlazer Finance</div>${body}</div></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

const escAttr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// The page to return to after sign-in, kept on this site: control characters (which browsers drop from a URL) go, and
// leading slashes and backslashes collapse to one, as "//evil.example/x" or "/\evil.example" would otherwise redirect to
// another site (a protocol-relative location). Anything outside printable ASCII is percent-encoded for the header.
const localPath = p => '/' + String(p ?? '').replace(/[\x00-\x1f\x7f]/g, '').replace(/^[/\\]+/, '').replace(/[^\x21-\x7e]/gu, c => { try { return encodeURIComponent(c); } catch { return ''; } });
const redirect = location => new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const notListed = email => `${escAttr(email)} is not on the list of people who can use ${SITE.title}. Ask Hayden to add you.`;

function signInPage(error, next, password) {
  const zoho = zohoConfigured();
  const pwForm = `<form method="post" action="${SIGNIN}"><input type="hidden" name="next" value="${escAttr(next)}"><input type="password" name="password" placeholder="Password"${zoho ? '' : ' autofocus'} autocomplete="current-password"><button type="submit">Continue</button></form>`;
  const err = error ? `<div class="err">${error}</div>` : '';
  const body = zoho
    ? `<p>Internal tool. Sign in with your TrailBlazer Zoho account.</p>${err}<a class="btn" href="${ZOHO}?next=${escAttr(encodeURIComponent(next))}">Sign in with Zoho</a>${password ? `<details><summary>Use the shared password instead</summary>${pwForm}</details>` : ''}`
    : `<p>Internal tool. Enter the site password to continue.</p>${err}${pwForm}`;
  return page(SITE.title, `<h1>${SITE.title}</h1>${body}`, error ? 401 : 200);
}

// ---- Signing and comparing.
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
// Constant-time comparison: both values are HMAC'd under a key made fresh for this instance, and the two 64-character
// digests are compared in full, so the time taken says nothing about where the values differ or how long either is.
const COMPARE_KEY = hex(crypto.getRandomValues(new Uint8Array(32)));
async function same(a, b) {
  const [x, y] = await Promise.all([hmac(COMPARE_KEY, String(a)), hmac(COMPARE_KEY, String(b))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
const b64u = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
// The session key, derived from the Zoho client secret (lib/session.mjs derives it the same way for the functions).
const sessionKey = () => hmac(env('ZOHO_LOGIN_CLIENT_SECRET').trim(), 'trailblazer-session-key');
// A session: "v1.<base64url JSON {e: email, n: name, a: site, x: expiry ms}>.<HMAC of the JSON part>".
export async function makeSession(user, now = Date.now()) {
  const body = b64u(JSON.stringify({ e: user.email, n: user.name, a: SITE.aud, x: now + SESSION_HOURS * 3600 * 1000 }));
  return `v1.${body}.${await hmac(await sessionKey(), body)}`;
}
export async function readSession(value, now = Date.now()) {
  const m = /^v1\.([A-Za-z0-9_-]{1,2000})\.([0-9a-f]{64})$/.exec(String(value || ''));
  if (!m || !env('ZOHO_LOGIN_CLIENT_SECRET').trim()) return null;
  if (!await same(m[2], await hmac(await sessionKey(), m[1]))) return null;
  let s; try { s = JSON.parse(unb64u(m[1])); } catch { return null; }
  if (!s || s.a !== SITE.aud || !(s.x > now) || typeof s.e !== 'string') return null;
  return { email: s.e, name: String(s.n || s.e) };
}

// ---- Zoho: the code from the callback -> the user's own token -> who they are in Zoho CRM, and in which organisation.
// The token is used for these two reads and dropped; nothing of it is kept.
async function zohoUser(code, redirectUri) {
  const tok = await fetch(`${env('ZOHO_ACCOUNTS_URL').trim()}/oauth/v2/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: env('ZOHO_LOGIN_CLIENT_ID').trim(), client_secret: env('ZOHO_LOGIN_CLIENT_SECRET').trim(), redirect_uri: redirectUri }),
  }).then(r => r.json()).catch(() => null);
  if (!tok || !tok.access_token) { console.warn('[gate] Zoho token exchange failed', tok && tok.error); return { error: 'Zoho did not complete the sign-in. Try again.' }; }
  const get = path => fetch(`${env('ZOHO_API_URL').trim()}${path}`, { headers: { authorization: 'Zoho-oauthtoken ' + tok.access_token } }).then(r => r.json()).catch(() => null);
  const [me, org] = await Promise.all([get('/crm/v7/users?type=CurrentUser'), get('/crm/v7/org')]);
  const u = me && Array.isArray(me.users) ? me.users[0] : null, o = org && Array.isArray(org.org) ? org.org[0] : null;
  if (!u || !o) { console.warn('[gate] Zoho CRM user or org not read', me && me.code, org && org.code); return { error: 'Your Zoho account is not a user of TrailBlazer\'s Zoho CRM.', choose: true }; }
  if (String(o.zgid) !== ORG && String(o.domain_name) !== 'org' + ORG) { console.warn('[gate] another organisation', o.zgid, o.domain_name); return { error: `Zoho connected this site to another CRM organisation. When Zoho asks which organisation, choose ${ORG_NAME} under Production.`, choose: true }; }
  if (String(u.status || '').toLowerCase() !== 'active') return { error: 'Your Zoho CRM user is not active.' };
  const email = String(u.email || '').trim().toLowerCase();
  if (!email) return { error: 'Your Zoho CRM user has no email address.' };
  return { user: { email, name: String(u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || email).slice(0, 80) } };
}

export default async (request, context) => {
  // A site that serves more than one address (the valuation app and the run-off calculator share one repo) picks its
  // settings for this request here; every other site has no init.
  if (typeof SITE.init === 'function') SITE.init(request, context);
  const url = new URL(request.url);
  const password = env(SITE.passwordVar);
  const usePassword = !!password.trim(), useZoho = zohoConfigured();
  if (!usePassword && !useZoho) return page('Not configured', '<h1>Sign-in not configured</h1><p>Set ZOHO_LOGIN_CLIENT_ID and ZOHO_LOGIN_CLIENT_SECRET (Sign in with Zoho) in the Netlify environment variables and redeploy.</p>', 503);
  const isForm = request.method === 'POST' && (request.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');
  // Where to go after signing in: the form's hidden field or ?next=, else the page asked for (a sign-in path means home).
  const own = [SIGNIN, ZOHO, CALLBACK, SIGNOUT].includes(url.pathname);
  const here = own ? '/' : localPath(url.pathname + url.search);
  const nextOf = form => (form && form.get('next') != null ? localPath(form.get('next')) : url.searchParams.get('next') != null ? localPath(url.searchParams.get('next')) : here);
  const secure = { path: '/', httpOnly: true, secure: true, sameSite: 'Lax' };

  if (url.pathname === SIGNOUT) {
    context.cookies.delete({ name: SESSION_COOKIE, path: '/' }); context.cookies.delete({ name: SITE.passwordCookie, path: '/' });
    return page(SITE.title, `<h1>Signed out</h1><p>You are signed out of the ${SITE.title}.</p><a class="btn" href="/">Sign in again</a>`);
  }

  const user = useZoho ? await readSession(context.cookies.get(SESSION_COOKIE)) : null;
  const pwCookie = context.cookies.get(SITE.passwordCookie);
  const pwOk = usePassword && !!pwCookie && await same(pwCookie, await hmac(password, SITE.passwordText));
  if ((user && allowed(user.email)) || pwOk) {
    if (url.pathname === ME) return json(200, user && allowed(user.email) ? { name: user.name, email: user.email } : { shared: true });
    if (!own) return context.next();
    // Already signed in (a second tab, a resubmitted form): there is nothing at the sign-in paths, so go where they pointed.
    return redirect(nextOf(isForm ? await request.formData().catch(() => null) : null));
  }

  // Off to Zoho: a one-time state, kept in a short-lived cookie with the page to return to, comes back on the callback.
  if (url.pathname === ZOHO && useZoho) {
    const state = hex(crypto.getRandomValues(new Uint8Array(16)));
    context.cookies.set({ name: STATE_COOKIE, value: state + '.' + b64u(nextOf(null)), ...secure, maxAge: 600, expires: new Date(Date.now() + 600 * 1000) });
    const q = new URLSearchParams({ response_type: 'code', client_id: env('ZOHO_LOGIN_CLIENT_ID').trim(), scope: SCOPES, redirect_uri: url.origin + CALLBACK, access_type: 'online', state });
    // ?choose=1: show Zoho's consent page, with its list of CRM organisations, again (after a wrong choice).
    if (url.searchParams.get('choose')) q.set('prompt', 'consent');
    return redirect(`${env('ZOHO_ACCOUNTS_URL').trim()}/oauth/v2/auth?${q}`);
  }
  if (url.pathname === CALLBACK && useZoho) {
    const saved = /^([0-9a-f]{32})\.([A-Za-z0-9_-]*)$/.exec(context.cookies.get(STATE_COOKIE) || '');
    context.cookies.delete({ name: STATE_COOKIE, path: '/' });
    let next = '/'; try { if (saved) next = localPath(unb64u(saved[2])); } catch { /* home */ }
    if (url.searchParams.get('error')) return signInPage('Zoho sign-in was cancelled or refused.', next, usePassword);
    if (!saved || !url.searchParams.get('code') || !await same(saved[1], url.searchParams.get('state') || '')) return signInPage('The sign-in expired or came from somewhere else. Try again.', next, usePassword);
    const got = await zohoUser(url.searchParams.get('code'), url.origin + CALLBACK);
    if (got.error) return signInPage(got.error + (got.choose ? ` <a href="${ZOHO}?choose=1&amp;next=${escAttr(encodeURIComponent(next))}" style="color:inherit">Sign in again and choose ${ORG_NAME}</a>.` : ''), next, usePassword);
    if (!allowed(got.user.email)) { console.warn('[gate] not on the list', got.user.email); return signInPage(notListed(got.user.email), next, usePassword); }
    context.cookies.set({ name: SESSION_COOKIE, value: await makeSession(got.user), ...secure, maxAge: SESSION_HOURS * 3600, expires: new Date(Date.now() + SESSION_HOURS * 3600 * 1000) });
    return redirect(next);
  }

  // The shared password, while it is set. Only checked at the sign-in path, which carries the rate limit; a form posted
  // anywhere else just gets the sign-in page, so guessing cannot go around the limit by posting to another path.
  if (isForm && url.pathname === SIGNIN && usePassword) {
    const form = await request.formData().catch(() => null);
    const given = form ? String(form.get('password') || '') : '';
    if (given && await same(given, password)) {
      context.cookies.set({ name: SITE.passwordCookie, value: await hmac(password, SITE.passwordText), ...secure, maxAge: PASSWORD_DAYS * 24 * 3600, expires: new Date(Date.now() + PASSWORD_DAYS * 24 * 3600 * 1000) });
      return redirect(nextOf(form));
    }
    return signInPage('That password is not right.', nextOf(form), usePassword);
  }
  // API calls from a signed-out browser get a JSON 401 rather than a page.
  if (url.pathname.startsWith('/api/') || url.pathname === ME) return json(401, { error: 'Signed out. Reload the page and sign in again.' });
  return signInPage(user ? notListed(user.email) : '', here, usePassword);
};

// Everything is behind the sign-in.
export const config = { path: '/*' };
