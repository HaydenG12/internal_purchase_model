// Brute-force limit on the sign-in paths: the shared password's form (/__signin) and the Zoho sign-in's start and return
// (/__signin/zoho, /__auth/callback). Netlify's code-based rate limiting counts requests by path alone (it cannot tell a
// POST from a GET), so sign-in has paths of its own and this function carries the limit for them: 10 requests a minute
// for each IP address on this domain, then Netlify answers 429 itself. It does nothing else: the gate (gate.js, on every
// path) does the sign-in and sends the user back to the page they were on.
export default async (request, context) => context.next();

export const config = { path: ['/__signin', '/__signin/zoho', '/__auth/callback'], rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] } };
