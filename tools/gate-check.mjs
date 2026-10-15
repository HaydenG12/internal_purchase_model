// Checks the Purchase Model's sign-in (netlify/edge-functions/gate.js, the same gate as the loan calculators with this site's SITE
// block): Sign in with Zoho for the people on SIGNIN_ALLOWED_EMAILS, the backup password, and that the working files in the
// published folder answer 404. Zoho is faked; no network. Run: node tools/gate-check.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';

Object.assign(process.env, { ZOHO_LOGIN_CLIENT_ID: 'cid', ZOHO_LOGIN_CLIENT_SECRET: 'csecret', ZOHO_ACCOUNTS_URL: 'https://accounts.example', ZOHO_API_URL: 'https://api.example', PURCHASE_SITE_PASSWORD: 'hunter2' });
process.env.SIGNIN_ALLOWED_EMAILS = 'sam@tbf.example';
let who = { email: 'Sam@TBF.example', full_name: 'Sam Seller', status: 'active' }, org = { zgid: '20963693' };
globalThis.fetch = async u => new Response(JSON.stringify(String(u).endsWith('/oauth/v2/token') ? { access_token: 't' } : /type=CurrentUser/.test(u) ? { users: [who] } : /\/crm\/v7\/org$/.test(u) ? { org: [org] } : {}));
const ctx = cookies => { const set = [], del = []; return { cookies: { get: n => (cookies || {})[n], set: c => set.push(c), delete: c => del.push(c) }, next: () => new Response('NEXT'), set, del }; };

const mod = await import('../netlify/edge-functions/gate.js'), gate = mod.default;
assert.deepEqual(mod.config, { path: '/*' });
assert.deepEqual((await import('../netlify/edge-functions/auth-rate-limit.js')).config.path, ['/__signin', '/__signin/zoho', '/__auth/callback']);
const html = await (await gate(new Request('https://purchase.example/'), ctx())).text();
assert.match(html, /Trail Book Purchase Model/); assert.match(html, /Sign in with Zoho/); assert.match(html, /Use the shared password instead/);
// A person on the list.
let c = ctx(), res = await gate(new Request('https://purchase.example/__signin/zoho?next=%2F'), c);
const state = new URL(res.headers.get('location')).searchParams.get('state'), st = c.set.find(x => x.name === 'tbf_oauth').value;
const back = () => { const cx = ctx({ tbf_oauth: st }); return gate(new Request('https://purchase.example/__auth/callback?code=abc&state=' + state), cx).then(r => ({ r, cx })); };
let { r, cx } = await back(); assert.equal(r.status, 303);
const sess = cx.set.find(x => x.name === 'tbf_user').value;
assert.deepEqual(await mod.readSession(sess), { email: 'sam@tbf.example', name: 'Sam Seller' });
assert.equal(await (await gate(new Request('https://purchase.example/'), ctx({ tbf_user: sess }))).text(), 'NEXT');
org = { zgid: '111' }; ({ r } = await back()); assert.match(await r.text(), /another CRM organisation/); org = { zgid: '20963693' };
who = { ...who, status: 'disabled' }; ({ r } = await back()); assert.match(await r.text(), /not active/);
// Off the list: refused, however active in Zoho.
who = { email: 'pat@tbf.example', full_name: 'Pat', status: 'active' }; ({ r, cx } = await back());
assert.match(await r.text(), /pat@tbf.example is not on the list of people who can use Trail Book Purchase Model/); assert.ok(!cx.set.some(x => x.name === 'tbf_user'));
process.env.SIGNIN_ALLOWED_EMAILS = ''; ({ r, cx } = await back()); assert.ok(!cx.set.some(x => x.name === 'tbf_user'), 'an empty list lets no one in');
// Another site's session does not open the Purchase Model.
const k = createHmac('sha256', 'csecret').update('trailblazer-session-key').digest('hex'), sb = Buffer.from(JSON.stringify({ e: 'sam@tbf.example', n: 'Sam', a: 'sales', x: Date.now() + 3600e3 })).toString('base64url');
assert.equal(await mod.readSession(`v1.${sb}.${createHmac('sha256', k).update(sb).digest('hex')}`), null);
// The backup password opens the site.
c = ctx(); res = await gate(new Request('https://purchase.example/__signin', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'next=%2F&password=hunter2' }), c);
assert.equal(res.status, 303); assert.equal(c.set.find(x => x.name === 'tbf_purchase').value, createHmac('sha256', 'hunter2').update('purchase-session').digest('hex'));
console.log('gate-check: ok');
