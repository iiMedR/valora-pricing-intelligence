# Merchant workflow

Open the **normal workspace** at http://localhost:4200 for your business records. It requires the existing administrator account for business screens. The **synthetic demo** at http://localhost:4201/products contains30 products and9,466 orders from2025; it is anonymous and read-only. They use separate backends/databases. Links in the workspace notice help switch deliberately; opening the demo never imports its records into your business.

## Find your way around

Desktop has a workflow rail. Tablet/mobile has an **Open navigation** button, with expanded state announced. Use Tab/Enter to navigate; Escape closes the disclosure and returns focus to its button. Following a link focuses the new page content. A skip link bypasses navigation. The mode label and account state remain visible on nested screens.

1. **Store connection**: inspect authorization and explicitly start/resume/retry existing sync operations when allowed. Authorization is separate from successful import. Demo connection controls are disabled.
2. **Onboarding**: review coverage and the prioritized checklist. Follow links for missing costs, stale stock or incomplete dated observations. Imported, analytically observable, forecast-evaluable and optimization-eligible are separate decisions.
3. **Products / Categories / Orders & refunds**: inspect catalog and immutable history. Normal merchant edits use existing validated forms and optimistic versions. Archived records retain their history. Only unused categories can be deleted.
4. **Analytics**: examine observed transactions, refund-period adjustments and known-cost contribution. Unknown historical costs are not zero.
5. **Demand forecasting**: review availability-conditional observed-sales forecasts, association estimates and chronological backtests. These are not recovered latent demand or proof of a causal price effect.
6. **Pricing recommendations**: inspect eligibility and all withholding reasons. A conditional suggestion is displayed only when the existing backend gates pass. No price is applied automatically.

## Historical dates and the demo

Demo insights initially select **Full2025** (2025-01-01 through2026-01-01 exclusive UTC), matching the existing seed. Normal mode retains current UTC defaults. All date inputs remain editable; date presets issue real API queries rather than inserting or fabricating data. Orders/history retain explicitly labeled local-time entry and UTC display conventions. If a window has no records, change the filters; do not reseed/reset to make a chart appear.

## Safe editing and confirmation

Merchant editors highlight invalid fields and focus the first invalid input on submission. Fields and duplicate submissions are disabled while a save is in progress. Errors retain values. Successful saves clear the unsaved marker. Leaving/reloading a dirty editor asks before discarding; leaving during a pending save warns that the server may still finish it. Native browser unload confirmation also protects dirty forms when leaving the app. Explicit Cancel buttons intentionally dismiss an edit.

Archive/delete confirmation dialogs explain consequences, start on Cancel, wrap Tab/Shift+Tab, cancel with Escape and restore the triggering focus where possible. Archiving products/variants does not erase order or observation history. A stale-version conflict keeps your edits so you can review before an explicitly confirmed reload. History-type changes ask before clearing an unfinished observation. Session expiry always permits removal of protected content and sign-in; unsafe requests are not automatically retried.

## Evaluation snapshots

In normal authenticated mode, **Save fresh evaluation** re-evaluates the selected dates/horizon and saves that fresh conclusion through the existing CSRF-protected endpoint. It saves metadata only. The saved status can differ from a previously displayed result if inputs changed. Identical inputs are deduplicated by the backend. Load saved evaluations to inspect bounded pages; no record is created merely by viewing diagnostics/history.

Saved conclusions are append-only evidence of what the model concluded, not measured sales/profit outcomes. Realized uplift is not measured. Demo has no save affordance and the backend denies writes. Uncertainty intervals remain unavailable/uncalibrated. The permanent seasonal example remains weakly identified and all30 permanent-demo variants withhold recommendations; this is a limitation to understand, not a reason to relax the gates.
