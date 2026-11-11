# Novice usability task script — milestone 11.10

**Independent participant validation: NOT VERIFIED.** This protocol is ready for future participants. No participant timings, scores, identities or quotes have been collected. Automated/developer walkthroughs are structured simulations, not merchant research.

## Preparation for the facilitator

Use one participant code, not a personal name. Recruit a small-store merchant for M tasks or a SaaS founder for S tasks. Use an approved disposable test installation and non-sensitive records. Never use production writes, customer PII, provider credentials or live sync. E-commerce and SaaS are separate installations, not a mode switch. Do not guide a participant through screens; read the task and ask them to explain what they expect. Record assistance, mistakes, backtracking, and the screen on which they get stuck. If an editable test record is not available, mark that task blocked; do not invent a successful result.

For the supplied controlled QA history, the SaaS plan is QA Basic, annual comparison QA Annual, report window 2–31 January 2025, currency MAD. Verify the actual API fixture beforehand. For independent studies on another approved dataset, replace these targets with real supplied plan names and expected API values. Automated intercepted fixtures are only UI edge-case tests, not proof of live business outcomes.

Planned completion criteria: finish without documentation/developer guidance, correctly explain what the displayed value means, and identify an appropriate next action. Planned observation limit is five minutes per task; this is a protocol limit, not a measured result. Pause if personal data or an irreversible/non-test action would be involved.

## E-commerce tasks — read these prompts without the answer key

| ID  | Participant prompt                                                                                                                                                                                              | Completion criterion                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M1  | Enter the sample store. Tell me whose data this is, which dates it covers and whether you can edit it.                                                                                                          | Identifies synthetic historical 2025 data and read-only mode.                                                         |
| M2  | Find the product containing SKU DEMO-REFUND-1. Try the alternate list/grid view and inspect a variant. What is its current price, and what sales are being shown?                                               | Correct variant price/currency; scoped sales/date window; no invented product-wide price.                             |
| M3  | From that product, find its pricing evidence. What does its status mean? Open an explanation only if needed, then return to your product search.                                                                | Distinguishes withheld evidence from actionable advice; retains variant/search context.                               |
| M4  | The sample has no actionable price changes. Find a concise explanation and tell me one appropriate next review.                                                                                                 | Finds demo teaching disclosure or actual reason/readiness; does not assume adding rows guarantees a recommendation.   |
| M5  | Find a data-readiness issue. In the approved editable test business, open its corrective editor, make a harmless draft edit, attempt to leave, then cancel leaving. Finally discard the draft.                  | Draft survives cancelled navigation; explicit discard removes it; nothing is saved. Demo cannot edit.                 |
| M6  | Find the store connection and import status. Has sync with a real store been verified?                                                                                                                          | Locates Shopify/status and understands unverified live sync; does not connect/import during study.                    |
| M7  | In an approved normal-mode test business, find the explicit evaluation-save action. First cancel/back out, then save only if the facilitator supplied a disposable evaluation. Compare this with demo behavior. | No automatic save, correct authenticated/CSRF action, historical snapshot is not realized uplift; demo writes denied. |

## SaaS tasks

| ID  | Participant prompt                                                                                                                                                                     | Completion criterion                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Tell me which business workspace this is and find the supplied plan.                                                                                                                   | Recognizes SaaS mode; no Shopify billing assumption; finds plan by name.                                                                        |
| S2  | Inspect its price and billing interval on 31 January 2025. Find an earlier price, then return to the same search.                                                                      | Finds current/historical versions without confusing assigned subscriber prices; Back/reload preserve selection and filter.                      |
| S3  | In Revenue & retention, choose 2–31 January 2025. Explain MRR, annual run rate, cash and one churn rate. Where could you find the denominator and exact values?                        | Distinguishes run rate/cash, correct window/population, partial coverage and unavailable metrics.                                               |
| S4  | In the supplied disposable installation, enter the provided record and preview it. Cancel. Tell me whether anything was recorded. Then commit only the explicitly approved test entry. | Validation precedes preview; cancel writes nothing; explicit commit once. No live billing change.                                               |
| S5  | Try the facilitator's exact duplicate source record, then the supplied out-of-bounds refund. What does each response mean, and what would you do next?                                 | Identical replay does not duplicate; changed replay/refund bound error retains history and input. Does not invent a new ID for the same charge. |
| S6  | Find plan pricing evidence. Is an optimal price available? What do we know, and what still needs validation?                                                                           | Understands no validated SaaS pricing model; more arbitrary records do not establish causality.                                                 |

## Shared checks

At 320px and at least one desktop size: use only keyboard to open navigation, search, review a plan/product, open and close explanation/confirmation dialogs, inspect the table, and recover from a controlled read failure. Check that Tab stays in a modal and Escape returns focus where safe. Change a filter without applying it: the previous report must remain identified as the previous selection. In a controlled expired session, protected content disappears and sign-in preserves safe selection context. Do not use real secrets to simulate failure.

## Facilitator answer key for the controlled SaaS fixture

Monthly 100 + annual 1,200/12 = beginning MRR 200. An explicit upgrade adds 50; effective cancellation removes 100: ending MRR 150, ARR 1,800, one active paid subscription. Jan 2–31 cash is −100 because a refund falls in that window. Subscription churn is 1/2=50%; gross revenue churn 100/200=50%; net revenue churn (100−50)/200=25%. Scheduled cancellation remains active until its effective end. Paid means active lifecycle plus historical paid evidence, not proof of current renewal collection. Source coverage remains partial. Customer/logo/cohort metrics and validated SaaS price optimization are unavailable. Do not read these answers to the participant before observing their attempt.

## Blank recording sheet — copy for each participant

Participant code: __________ Role: __________ Date: __________ Viewport/input method: __________

Installation/dataset identifier (non-sensitive): __________ Facilitator: __________

| Task        | Start | End | Completion (pass/partial/fail/blocked) | Assistance / backtracks | Participant explanation or confusion (no PII) | Evidence reference |
| ----------- | ----- | --- | -------------------------------------- | ----------------------- | --------------------------------------------- | ------------------ |
| M1 / S1     |       |     |                                        |                         |                                               |                    |
| M2 / S2     |       |     |                                        |                         |                                               |                    |
| M3 / S3     |       |     |                                        |                         |                                               |                    |
| M4 / S4     |       |     |                                        |                         |                                               |                    |
| M5 / S5     |       |     |                                        |                         |                                               |                    |
| M6 / S6     |       |     |                                        |                         |                                               |                    |
| M7 / shared |       |     |                                        |                         |                                               |                    |

Confidence after tasks (optional 1–5): __________

Most confusing label/screen: __________

What the participant expected next: __________

Suggested follow-up and severity: __________

No results are prefilled. Independent validation remains NOT VERIFIED until actual sessions are performed and recorded.
