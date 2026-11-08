# Merchant workflow

Open the **normal workspace** at http://localhost:4200 for your business records. It requires the existing administrator account for business screens. The **synthetic demo** at http://localhost:4201/products contains30 products and9,466 orders from2025; it is anonymous and read-only. They use separate backends/databases. The compact workspace button opens an explanation and links to switch deliberately; opening the demo never imports its records into your business.

## Overview and navigation (11.6)

Start on **Overview**: the reporting period, actual net sales, units, orders and product count come first. Demo starts at Full 2025; the black chart shows monthly net sales with refunds deducted in their refund period. **How calculated?** retains the exact API amount behind the rounded currency display. Expand **Inspect exact sales values** to select a month or read the keyboard-accessible table.

**Pricing insights** appears beside the chart. In the permanent demo, **No reliable price changes suggested** follows a complete check of all 30 variants. **Why?** explains the evidence and period; **Review products** opens the existing pricing page. A failed/partial check shows progress and Retry rather than a catalog-wide claim. The next stock-information action leads to Data readiness. Normal empty stores retain setup links and do not invent opportunities.

The header's **Demo · Read-only** / **Normal workspace** button explains mode and provides deliberate workspace-switch links. Demo disclosure identifies synthetic historical 2025 records. At small widths, **Open navigation**, then **Products**, takes two interactions. Escape or Close dismisses the drawer and restores focus; explanation dialogs behave the same way. Navigation now names **Products**, **Orders**, **Forecasts** and **Pricing insights** while retaining the same URLs. Existing detailed calculations, diagnostics and evaluations remain available in their prior workflows.

Products show a named link, neutral image fallback and textual status. Images and product-level prices are absent from the current DTO; open **View variants** for actual prices. Order lists show shorter references and currency-formatted amounts; full IDs and original amounts remain in order details. Filters are local time and displayed dates UTC. Data readiness initially shows up to three API-prioritized actions; **Show all next steps** reveals the rest. Fixing an input does not promise a recommendation.

## Read the four insight pages

**Recommendations — “Which prices should I review?”** Start here for price decisions. Choose a comparison period (30 days by default, or 7/14), optionally search products, then select **Check catalog**. The app checks matching variants in batches of 10 and shows progress. Suggestions appear as they are found; Cancel retains partial results. Retry resumes a failed batch. Changing dates, horizon or search clears the previous selection. Only a completed check can say there are no suggestions across all matching variants.

A supported card shows **current price → suggested price**, expected units at both prices, estimated contribution at both prices, and the amount/percentage difference. **Estimated contribution means sales minus known variable costs; other business expenses are excluded.** It is not guaranteed profit. **Why this suggestion?** opens the supporting costs, constraints, evidence and evaluation history. Closing the analysis returns focus to its product card. No price is applied automatically.

For supported price sensitivity, the explanation translates the estimate into a local 1% relationship. For example, −2 means a 1% higher price was associated with approximately 2% fewer units sold in the analyzed history. Association does not establish a guaranteed causal effect. Where that relationship is unreliable, the app explains why instead of presenting the coefficient as advice. Products without suggestions show their current price, a short reason and **Review what to fix**.

All 30 permanent-demo variants still have no reliable price suggestion. Open **See a worked pricing example** to learn the comparison separately: hypothetical price 100 → 80, unit cost 40, expected units 100 → 156.25, and 30-day estimated contribution 6,000 → 6,250. It is clearly illustrative, is not your store's recommendation, is excluded from result counts and cannot be saved as an evaluation.

**Analytics — “How is my store doing?”** Read Net sales, Orders and Contribution from sales with known costs first. Cost coverage tells you which share of sales lines has a known historical cost. Read the black sales chart for the selected date window. **More sales metrics and accounting details** contains refunds, gross sales, average order value and the accounting caveats. Expand **Product performance: search, sort and drill down** or **Inventory observations and data quality** when needed. Those sections stay open when their report refreshes.

**Forecasting — “How much might this product sell?”** Search the product cards and choose **View sales forecast**. Read expected units, the price used, and the actual forecast dates; select 7/14/30 days. The result assumes the listed price and availability assumptions hold. It does not estimate customers lost during stockouts. Price sensitivity appears alongside it only when sufficiently supported. Statistical evidence, exact tables and backtests remain expandable. Historical demo forecasts show their historical dates, not a prediction for today.

**Data readiness — “What should I fix next?”** Follow **Your next steps**, ordered by the API's priorities. Each item explains what to review and links to the relevant screen or filtered product list. Connection and last-import status remain visible. **Detailed data checks** contains raw counts, technical status codes, per-variant tables and import controls. Completing missing fields helps evaluation but does not guarantee a suggestion.

## Workspace navigation

The redesigned **Overview** opens with your actual reporting figures and next actions. Normal mode shows setup guidance when the catalog is empty. Demo mode opens its historical Full 2025 records: it does not show a fictitious connected Shopify store, completed merchant review, growth percentage or readiness score. Net sales deduct merchandise refunds in their refund period. The currency label applies to the displayed exact decimal amount.

Desktop navigation now groups **Workspace**, **Insights & decisions**, and **Integrations & settings**. **Catalog** opens the existing Products route; **Data readiness** opens Onboarding; **Shopify** opens Store connection; **Recommendations** opens the existing pricing evaluation workflow. Detail URLs remain unchanged. Saved evaluations remain within each variant's recommendation view.

Overview and Analytics use gradient area charts based on actual API buckets. Hover or tap a chart to inspect a period. **Inspect exact sales values** opens a keyboard-accessible period selector and exact-value table; it remains the authoritative alternative to approximate plotted coordinates. Analytics date presets and date/granularity filters request real periods. Help buttons open with click/Enter and close with Escape. The smaller system typography preserves readable mobile inputs and large interaction targets.

Desktop has a workflow rail. Tablet/mobile has an **Open navigation** button, with expanded state announced. Use Tab/Enter to navigate; Escape closes the disclosure and returns focus to its button. Following a link focuses the new page content. A skip link bypasses navigation. The mode label and account state remain visible on nested screens.

1. **Store connection**: inspect authorization and explicitly start/resume/retry existing sync operations when allowed. Authorization is separate from successful import. Demo connection controls are disabled.
2. **Onboarding**: review coverage and the prioritized checklist. Follow links for missing costs, stale stock or incomplete dated observations. Imported, analytically observable, forecast-evaluable and optimization-eligible are separate decisions.
3. **Products / Categories / Orders**: inspect catalog and immutable history. Normal merchant edits use existing validated forms and optimistic versions. Archived records retain their history. Only unused categories can be deleted.
4. **Analytics**: examine observed transactions, refund-period adjustments and known-cost contribution. Unknown historical costs are not zero.
5. **Demand forecasting**: review availability-conditional observed-sales forecasts and choose 7, 14 or 30 days. Open **How this estimate works** for association estimates, fit diagnostics and exclusions, and the validation disclosure for chronological backtests. These are not recovered latent demand or proof of a causal price effect.
6. **Pricing recommendations**: inspect eligibility and all withholding reasons. A conditional suggestion is displayed only when the existing backend gates pass. No price is applied automatically.

## Historical dates and the demo

Demo insights initially select **Full 2025** (2025-01-01 through2026-01-01 exclusive UTC), matching the existing seed. Normal mode retains current UTC defaults. All date inputs remain editable; date presets issue real API queries rather than inserting or fabricating data. Orders/history retain explicitly labeled local-time entry and UTC display conventions. If a window has no records, change the filters; do not reseed/reset to make a chart appear.

## Safe editing and confirmation

Merchant editors highlight invalid fields and focus the first invalid input on submission. Fields and duplicate submissions are disabled while a save is in progress. Errors retain values. Successful saves clear the unsaved marker. Leaving/reloading a dirty editor asks before discarding; leaving during a pending save warns that the server may still finish it. Native browser unload confirmation also protects dirty forms when leaving the app. Explicit Cancel buttons intentionally dismiss an edit.

Archive/delete confirmation dialogs explain consequences, start on Cancel, wrap Tab/Shift+Tab, cancel with Escape and restore the triggering focus where possible. Archiving products/variants does not erase order or observation history. A stale-version conflict keeps your edits so you can review before an explicitly confirmed reload. History-type changes ask before clearing an unfinished observation. Session expiry always permits removal of protected content and sign-in; unsafe requests are not automatically retried.

## Evaluation snapshots

In normal authenticated mode, **Save fresh evaluation** re-evaluates the selected dates/horizon and saves that fresh conclusion through the existing CSRF-protected endpoint. It saves metadata only. The saved status can differ from a previously displayed result if inputs changed. Identical inputs are deduplicated by the backend. Load saved evaluations to inspect bounded pages; no record is created merely by viewing diagnostics/history.

Saved conclusions are append-only evidence of what the model concluded, not measured sales/profit outcomes. Realized uplift is not measured. Demo has no save affordance and the backend denies writes. Uncertainty intervals remain unavailable/uncalibrated. The permanent seasonal example remains weakly identified and all 30 permanent-demo variants withhold recommendations; this is a limitation to understand, not a reason to relax the gates.
