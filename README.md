# Internal Purchase Model

TrailBlazer Finance internal tool for pricing trail book purchases.

Online replacement for `Purchase Model MASTER.xlsx` — enter book assumptions,
pick one of four payment structures, and get purchase price, breakeven,
NPV/IRR (5 & 10 year), Accept/Reject verdict, and cashflow charts.

- Single self-contained `index.html` — no build step, no dependencies.
- Deployed via Netlify; auto-deploys on push to `main`.

## Model notes

- Purchase price = monthly trail (GST-adjusted) / days in trail month × 365 × multiple
- Trail decays monthly at run-off/12, reduced by arrears %
- $ at risk of clawback = 100% of upfronts on loans <12 months old + 50% of upfronts 12–24 months old (aggregator tiers assumed uniform)
- Expected clawback = rate × $ at risk, spread over first 24 months
- IRR solved on monthly cashflows, annualised (effective) — equivalent to XIRR
- Breakeven = month cumulative net cashflow turns positive and stays positive

