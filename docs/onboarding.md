# Onboarding and data readiness (Milestone 10)

The onboarding journey is **Connect store → Sync data → Review coverage → Complete business inputs → Check readiness**. Open `/onboarding` from the main navigation. Normal access requires the existing administrator session. The permanent demo remains anonymous, synthetic and read-only. Readiness GETs never connect a provider, start/resume a job, edit a catalog record or persist an assessment.

No V6 is required: connection state, import jobs/checkpoints, source mappings, catalog versions, immutable transactions and dated observations already exist in V1–V5. Assessments are derived on request. There is no saved readiness certificate, onboarding completion flag or new credential system. Shopify remains pinned to GraphQL 2026-10 with the same read scopes and limits; bulk operations/webhooks remain deferred. **LIVE_SHOPIFY_NOT_VERIFIED** still applies.

## Workflow states

| State | Evidence / next step |
| --- | --- |
| NOT_CONNECTED | No enabled connected installation. Configure/authorize through Store Connection. Existing imported history is retained and can still be inspected. |
| CONNECTED_NOT_SYNCED | Connected, but no job for the current connection generation. Start an explicit bounded import. |
| SYNC_RUNNING | Latest current-generation job is PENDING/RUNNING. Inspect existing progress/checkpoints; refresh diagnostics when it finishes. |
| SYNC_FAILED | Latest job is PARTIAL/FAILED. Read safe error/warning codes and resolve the cause before resuming the same job. Committed pages remain. |
| SYNC_COMPLETED_NEEDS_REVIEW | A successful job has no observed completed activity, financial/deferred/excluded warnings, or a local-edit conflict. Review scope and business inputs. |
| READY_FOR_ANALYTICS | A successful job plus observed completed-sale/refund activity, without the workflow review flags above. This only permits interpreting observed analytics; it does not certify complete costs, continuous coverage, trustworthy elasticity or actionable recommendations. |
| SYNTHETIC_DEMO | Dedicated demo identity was verified. Diagnostics are inspectable, with no real shop, provider actions or editable merchant settings. |

These are import/review states. Model readiness is assessed **per variant**, never extrapolated from one page to the entire catalog. There is deliberately no global READY_FOR_MODEL_EVALUATION promise. An unmapped manual variant can have useful analytics/model evidence even while the provider workflow is NOT_CONNECTED. A successful import can still lack almost all historical model evidence.

The summary is refreshed explicitly; there is no automatic readiness-triggered import. Existing M09 controls provide progress, history and resume, including their own active-job polling. A failed assessment retains the last displayed results with a stale-data warning and retry. Disconnect invalidates provider credentials/pending authorization, not catalog/history; reconnect changes connection generation, so previous jobs cannot resume as a different installation. See [connection](shopify-connection.md) and [import semantics](shopify-sync.md).

## API and scope

| GET route under `/api/v1/onboarding` | Contract |
| --- | --- |
| `/summary` | Workflow/connection state, current-generation job/checkpoints, last completed import window end, scoped counts and prioritized checklist |
| `/readiness/variants?page=0&size=5&search=&status=ALL` | Deterministic paged diagnostics; size1–10, page0–100000, search≤100 characters |
| `/readiness/variants/{variantId}` | Scoped variant inputs, provenance, coverage, dimensions and unchanged model statuses/reasons |

Optional `startDate`/`endDate` apply consistently to all three GETs. Dates are UTC, increasing, 28–731 days, exclusive end no later than tomorrow. Example: `?startDate=2025-01-01&endDate=2026-01-01` is explicitly retrospective. Normal default is the 365 complete days ending today UTC. Initialized demo defaults to the seeded year's end and preceding365 days, so its original 2025 history remains inspectable; uninitialized demo falls back to the normal window.

`status` is a **persisted-data review filter**, not a global model-result filter: ALL, ACTIVE, ARCHIVED, MISSING_COST, STALE_INVENTORY, LOCAL_CONFLICT, MISSING_PROVIDER_SKU. STALE_INVENTORY includes missing/inferred observations. Filtering happens before pagination/model computation, preserving truthful totals. Model-derived statuses are shown on the selected page/detail rather than pretending to cheaply filter the whole catalog. Search matches canonical SKU, variant name and product name; sorting is product name, SKU, UUID.

Normal scope is the selected connection shop plus unmapped manual records. Other-shop mapped variants are excluded and detail access returns404; imported records remain in the single-business installation and are not deleted. With no selected shop, INSTALLATION_HISTORY explicitly describes retained installation records. Demo scope is SYNTHETIC_DATA and never includes a real connection/job identity. Existing live database-identity guards remain authoritative.

Normal endpoints require ADMIN; anonymous requests return401, insufficient roles403. Demo allows only the enumerated read-only GETs; unsafe requests remain403 even with valid CSRF. Invalid dates/filters/pages return400; missing/out-of-scope variants404. There are no new write endpoints. Existing CSRF, HttpOnly session cookie, explicit credentialed CORS and safe errors remain intact. Responses contain no token, encryption key or raw provider payload.

## Diagnostic dimensions

Findings use stable codes plus plain-language messages and provenance. Statuses are AVAILABLE, MISSING, UNKNOWN, STALE, INSUFFICIENT and CONFLICTING. Counts of existing rows can genuinely be zero; unknown monetary/stock values remain null and display as Unknown.

| Dimension | Meaning / representative codes |
| --- | --- |
| Mapping / SKU | Current shop/provider UUID mapping, manual/unmapped or synthetic origin; LOCAL_EDIT_CONFLICT if mapping version differs; PROVIDER_SKU_MISSING does not destroy stable ID identity |
| Current price | Positive catalog quote, or CURRENT_PRICE_UNAVAILABLE for archived/non-quotable placeholders. A quote is not historical price evidence. Unreconciled local changes are labeled explicitly. |
| Effective price | Existing VERIFIED_CHANGE period covering now, using the optimizer's freshness policy; EFFECTIVE_PRICE_MISSING / STALE / AVAILABLE |
| Current variable cost | Null → CURRENT_COST_UNKNOWN; known but undated → COST_TIMESTAMP_UNKNOWN; old evidence → CURRENT_COST_STALE; disagreement with latest non-inferred dated evidence → CATALOG_COST_HISTORY_MISMATCH |
| Effective cost | Existing authoritative current cost period with unchanged freshness; a provider snapshot never substitutes for a past/current effective period |
| Price constraints | CONSTRAINTS_MISSING/INVALID, COST_AT_OR_ABOVE_MAXIMUM, FIXED_PRICE_BOUNDS, or CONSTRAINTS_PRESENT. This diagnostic does not replace optimizer feasibility checks. |
| Inventory | INVENTORY_UNKNOWN, INVENTORY_INFERRED, INVENTORY_STALE, CURRENT_STOCKOUT, CURRENT_STOCK_OBSERVED; source and quality are included. Known zero is one observation, not reconstructed stockout history. |
| Sales / refunds | Completed-order lines, date span and observed sale days; merchandise refunds are counted independently to avoid sale×refund multiplication. Refund-only windows may be observable for analytics while demand remains insufficient. |
| Cost coverage | Known-cost lines versus observed completed lines; no lines → UNKNOWN, incomplete → HISTORICAL_COSTS_INCOMPLETE. Current edits do not fill missing historical cost snapshots. |
| Model history | Actual eligible/unknown/censored days and distinct prices from the existing demand model; missing days are not proven zero demand |

The API also reports active/archived/mapped variants, imported/empty products, missing source SKUs, local conflicts, missing costs, stock limitations, orders/lines, unpaid/cancelled orders, known-cost lines, observed sale days and refund events. It does not calculate a new profit metric, assume unknown cost zero, or claim financial reconciliation from these counts. M09 job warnings retain unsupported refund components, pending/test order exclusions, access windows and other coverage limits.

### Four separate labels

1. **Data imported** identifies provider mappings and recorded activity; it is not a readiness verdict.
2. **Ready for analytics** means observed completed sale or merchandise-refund activity exists in the selected window. Profit/cost/coverage limitations remain separate.
3. **Forecast evaluable** requires the unchanged forecast to return a baseline/forecast for this variant/window. BASELINE_ONLY is shown distinctly; it does not imply usable price-response elasticity.
4. **Eligible for optimization** comes directly from the existing optimizer's ACTIONABLE/abstention status and full reason list. No blocker is removed, no threshold is lowered, and readiness returns no recommended price.

Current-input findings are assessed **now**. Model diagnostics use the selected end-date instant, matching existing retrospective forecast/optimizer semantics. Both timestamps are explicit. A historical evaluation that passed gates is not present-day eligibility, a causal price-response claim, calibrated uncertainty, merchant consent to an experiment or permission to apply prices. DIAGNOSTIC_ONLY remains abstention.

## Completing merchant inputs

Variant detail links to the existing product/variant form for current variable cost and min/current/max constraints, and to the existing history form for dated authoritative evidence. These forms preserve exact decimal strings, NUMERIC(19,4), configured currency, positive price/bound rules, optimistic versions, archive rules and validated time/period overlap constraints. A known zero cost is allowed; missing cost is never populated with zero automatically.

Catalog price/cost edits append validated MANUAL changes at edit time using existing M03 behavior. A genuinely authoritative dated cost/price period can instead be recorded through the history flow. Do not backdate a current provider quote or guess old costs merely to make a model pass. Existing immutable order/item/refund snapshots are never rewritten by those changes. Bounded past periods do not silently alter today's catalog value.

Source precedence stays conservative: provider source IDs/values remain in M09 mappings and point history; merchant changes remain in catalog/dated MANUAL history. A provider-mapped variant's changed version produces LOCAL_EDIT_CONFLICT. Later imports stop instead of overwriting merchant cost, bounds, SKU or name. Onboarding surfaces the conflict before retry. There is no new automatic merge, ownership-toggle or conflict-resolution write endpoint. Operator reconciliation is still required before that import can continue; blindly pressing Resume will not bypass it. This is deliberate preservation, not a claim that provider and local inputs were reconciled.

Demo catalog creation/edit/archive, category edits, settings form and history-entry controls are disabled/hidden; onboarding offers inspection only. Server write refusal remains the final boundary. No demo credentials work in normal mode and no real provider controls are created in the demo onboarding page.

## Performance, verification and operations

The summary uses scoped aggregate queries. Variant pages first select at most10 rows, then batch daily series, current/historical model inputs and independent sales/refund coverage. Existing model functions run on those bounded inputs; there is no per-variant HTTP/database service call loop and no whole-catalog model scan to manufacture filter totals. Existing source/history indexes support lookups. Endpoints use read-only repeatable-read transactions; a later refresh can legitimately see new committed imports. No readiness cache/table/migration is needed.

Normal startup remains Compose5433, backend local profile8080, frontend4200; demo remains separate5434/8081/4201. From repository root, separate terminals:

```powershell
docker compose -f infra/compose.yaml up -d --wait
```

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.11'
cd backend
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

```powershell
cd frontend
npm.cmd start
```

Existing demo: `.\scripts\demo.ps1 serve`, and separately `cd frontend` then `npm.cmd run start:demo`. Do not reset/reseed an initialized database. Account provisioning/recovery remains in [authentication.md](authentication.md); optional app/HTTPS setup remains in [shopify-connection.md](shopify-connection.md). Readiness works without provider configuration.

Run `.\mvnw.cmd verify` in backend, then frontend `npm.cmd test -- --watch=false` and `npm.cmd run build`. [Milestone10 evidence](milestone-10-verification.md) records actual counts, browser checks and unchanged demo checksum. Browser flow: sign in → checklist → filters/pagination → variant reasons → existing input/history links → refresh/retry; anonymous demo has no editable setup/import actions. Desktop/mobile and keyboard checks use the real local endpoints; failure injection must be described separately from provider validation.

## Deferred roadmap and live status

**LIVE_SHOPIFY_NOT_VERIFIED**. Real validation still requires a permitted app/shop, actual client credentials and separate encryption key, registered public HTTPS callback, successful OAuth/read-scope/currency checks, bounded supported import/incremental repeat, actual field/query-cost permissions, refund/expiry/rotation and uninstall tests. Fixture/model/browser checks do not establish live compatibility.

After Milestone10, revisit the separate Recommendation Quality Improvement workstream: seasonality/weekday/trend/promotion controls, identification and calibrated uncertainty, merchant-approved bounded experiments, stockout-censored demand, model/recommendation versioning and outcome audit history, independent reproducible fixtures and mathematical recovery benchmarks. None is implemented here. Preserve current conservative gates and the permanent2025 demo checksum. Milestones11/12, deployment, bulk/webhook imports and automatic price application also remain outside this milestone.
