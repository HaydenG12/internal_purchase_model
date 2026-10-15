# Internal Purchase Model

TrailBlazer Finance internal tool for pricing trail book purchases.

Online replacement for `Purchase Model MASTER.xlsx` — enter book assumptions,
pick one of four payment structures, and get purchase price, breakeven,
NPV/IRR (5 & 10 year), Accept/Reject verdict, and cashflow charts.

- Single self-contained `index.html` — no build step, no dependencies.
- Deployed via Netlify; auto-deploys on push to `main`.

## Sign-in

Only the people on `SIGNIN_ALLOWED_EMAILS` (Zoho email addresses, comma separated; redeploy after a change) who are active users of TrailBlazer's Zoho CRM get in: `netlify/edge-functions/gate.js`, the same gate as the loan calculators with this site's SITE block. The session lasts 12 hours. `PURCHASE_SITE_PASSWORD` is the backup password ("Use the shared password instead"). Setup: the Zoho client "TrailBlazer Sign In" lists `https://internal-purchase-model.netlify.app/__auth/callback`; Netlify has `ZOHO_LOGIN_CLIENT_ID`, `ZOHO_LOGIN_CLIENT_SECRET`, `ZOHO_ACCOUNTS_URL`, `ZOHO_API_URL`, `SIGNIN_ALLOWED_EMAILS` and `PURCHASE_SITE_PASSWORD`; Netlify's own Visitor access is off. `node tools/gate-check.mjs` checks it with a fake Zoho.

## Model notes

- Purchase price = monthly trail (GST-adjusted) / days in trail month × 365 × multiple
- Trail decays monthly at run-off/12, reduced by arrears %
- $ at risk of clawback = 100% of upfronts on loans <12 months old + 50% of upfronts 12–24 months old (aggregator tiers assumed uniform)
- Expected clawback = rate × $ at risk, spread over first 24 months
- IRR solved on monthly cashflows, annualised (effective) — equivalent to XIRR
- Breakeven = month cumulative net cashflow turns positive and stays positive

