# Milestone 07 — constrained read-only recommendation verification

Implemented 2026-11-12 on existing `codex/milestone-01`, from clean `615e5e5`. No permanent normal/demo reset or reseed, no price changes, remote operations, authentication, Shopify, deployment or later milestone.

## Changed paths

- `backend/src/main/java/com/smartpricing/optimization/service/ContributionOptimizer.java`: pure grid objective, endpoint/interior/cap-kink candidates and rounded neighbors, finite/numeric guards.
- `optimization/service/{OptimizationSettings,OptimizationService}.java`: typed validated safety thresholds, read-only repeatable-read orchestration, conservative evidence gates, comparison/uplift/sensitivity suppression on abstention.
- `optimization/repository/OptimizationRepository.java`: one batch effective authoritative price/cost and latest stock query for selected IDs; no catalog-cost fallback.
- `optimization/dto/OptimizationDtos.java`, `optimization/controller/OptimizationController.java`: typed statuses/input lineage/assumptions and GET-only APIs.
- Compatible internal additions to `forecasting/service/{ForecastService,DemandModel}.java`: reusable validated batch/single series inputs and exact configured baseline-training population. Existing M06 API responses/estimation unchanged; no duplicate elasticity fitter.
- `backend/src/test/java/com/smartpricing/optimization/{ContributionOptimizerTest,OptimizationGateTest,OptimizationApiIT}.java`; extended `demo/DemoSeederIT.java` queries actual permanent-demo scenarios in ephemeral containers and rechecks checksum.
- `frontend/src/app/features/optimization/{optimization-api.service.ts,optimization.ts,optimization.html,optimization.css,optimization.spec.ts}`; existing shell/routes/home add Pricing Recommendations and current scope copy.
- README, architecture/development docs, [optimization.md](optimization.md), this verification report.

Versions unchanged: Java21.0.11, Spring Boot3.5.16, Angular22.2.6, Node24.22.1/npm11.19.1, PostgreSQL17.7. No dependency/lockfile change; no npm ci needed.

## Safety and persistence decision

All evaluation endpoints are read-only and never apply a price. **Evaluation history is not persisted or implemented**: domain input history remains lineage, not an immutable record of a past recommendation. No snapshot save/history endpoint or mutating GET. No V4 required; V1–V3 remain unchanged.

M06 READY does not establish reliable price response. The gate rejects calendar confounding, unstable prefix fits, insufficient coverage, selection/censoring, missing/stale applicable cost/price/stock, inactive catalog state, unsupported price reference/mix, infeasible constraints and inadequate backtests. The known weak seasonal estimate cannot pass. Production code has no scenario/SKU/truth lookup. Good forecasting alone does not override these blockers.

Stock is a fresh trusted observation, conservatively capping sales across the entire horizon with no replenishment assumed. q0 is availability-conditional observed sales, not uncensored demand. Returns, shipping/tax, fees, marketing and overhead excluded. Outputs are estimated contribution, not net profit or promised/realized uplift. All abstentions have null suggested price/comparison/uplift and empty sensitivity.

## Mathematical validation

| Case | Expected/observed test result |
| --- | --- |
| c40, e−2, p0=100, q0=100, wide bounds | Optimum80.0000;156.2500 units;6250.0000 contribution versus6000.0000 at100 |
| −1<e<0, e=−1 and e=−1±.000001 with c40/bounds50–200 | Upper boundary200 |
| e−2,c40 with bounds90–200 /50–70 | Lower90 / upper70 |
| e−2.3,c40,bounds70–71 | Grid result equals exhaustive0.0001 enumeration |
| Stock cap50,e−2,c40,bounds141.40–141.45 | Cap-kink neighbors equal exhaustive grid optimum near141.4214 |
| Zero cost, narrow sub-grid bounds | Correct representable inward rounding; exact empty-grid rejection |
| Invalid/negative/unknown cost, reversed/zero bounds, cost above max | Refused; no fabricated zero cost |
| Equal cost/max | Mathematical break-even zero; service refuses break-even-only recommendation |
| NaN/Infinity/nonnegative e, zero price, overflowing response | Refused, finite safe output only |
| Pure supported gate fixture e−2,q0=700,p0=100,c40,bounds90–110 | Suggested90.0000; estimated uplift1209.8765; deterministic; ≤21 sensitivity points |

The actual project grid is four decimals, not an assumed two-decimal MAD grid. BigDecimal stores prices/costs/grid/money; pow remains approximate statistical response. Four-place outputs match the analytical oracle; exhaustive tests compare the same modeled objective across every grid point in representative intervals. No arbitrary-precision transcendental guarantee for extreme scales.

## Actual permanent demo outcomes (replica1, full2025, h7)

These were queried from real persisted demo APIs without mutations. Known truth is test/documentation context only; an oracle constant-elasticity optimum is not automatically actionable.

| Scenario | Ground-truth e | M06 estimate | Status | Suggested price | Why |
| --- | ---: | ---: | --- | --- | --- |
| ELASTIC_HIGH | -2.6 | -2.692563 | DIAGNOSTIC_ONLY | null | Quarterly prices/calendar confounded |
| ELASTIC_LOW | -.25 | -.199629 | DIAGNOSTIC_ONLY | null | Same; negative estimate alone insufficient |
| **SEASONAL** | **-1.1** | **-.531116** | **DIAGNOSTIC_ONLY** | **null** | **SEASONAL_OR_CALENDAR_CONFOUNDING** |
| PROMOTION | -1.2 | -1.244189 | DIAGNOSTIC_ONLY | null | Price discrepancy/selection and confounding |
| STOCKOUT | -1.4 | -1.250901 | DIAGNOSTIC_ONLY | null | Excess critical censoring and confounding |
| SPARSE | -.9 | null | MISSING_PRICE | null | No authoritative current price; sparse/missing costs/evidence also disclosed |
| REFUND | -.8 | -.744336 | DIAGNOSTIC_ONLY | null | Calendar confounding; returns not demand |
| COST_CHANGE_UNKNOWN | -1.0 | -.921772 | DIAGNOSTIC_ONLY | null | Full-year effective cost known but confounding; gap evaluation separately MISSING_COST |
| ARCHIVE | -.7 | null | INACTIVE_VARIANT | null | Current archival; history retained |
| ZERO_SALES | -1.2 | null | UNRELIABLE_ELASTICITY | null | Baseline-only/zero-selection not price-response authority |

Thus **all permanent demo recommendations abstain**, intentionally; none was manufactured by changing data or weakening eligibility. Raw demand may still be forecast. The seasonal case beats the naive sales baseline on recent folds but still abstains, demonstrating why forecast success alone is insufficient.

The separate ephemeral PostgreSQL actionable fixture uses independently cycling80/100/120 prices, e≈−2 with integer units, and stable100 reference price September–December so both holdout lookbacks match p0. Applicable historical cost40 overrides deliberately unrelated mutable catalog cost999. Current constraints/support/±10% bound yield90, not the unconstrained80. Test asserts ACTIONABLE/recommended90, deterministic repeated GET/sensitivity, original catalog values/version and365 orders unchanged. This fixture is never inserted into permanent demo/normal databases. Actual actionable UI rendering/sensitivity is tested automatically with controlled HTTP fixtures, not claimed as a live permanent-demo browser result.

## Automated results

Final complete Maven verification finished **15:50:58 UTC**, BUILD SUCCESS in **9:10**: **62 unit +24 PostgreSQL integration tests**, zero failures/errors/skips. Permanent-demo checksum/normal-safety and all previous milestone regressions passed.

| Command/check | Actual result |
| --- | --- |
| `backend/mvnw.cmd verify` |BUILD SUCCESS;62 unit +24 PostgreSQL integration tests, zero failures/errors/skips |
| `backend/mvnw.cmd verify -Dit.test=OptimizationApiIT` | BUILD SUCCESS;62 unit +3 focused PostgreSQL tests |
| `npm.cmd test -- --watch=false` |44 tests/16 suites passed, including6 optimization tests; final copy rerun recorded below |
| `npm.cmd run build` |Production build passed |
| Final frontend tests/build after percentage explanation copy |44/16 passed; build succeeded15:52:41 UTC |
| `scripts/demo.ps1 summary` |BUILD SUCCESS15:53:17 UTC; original checksum, matchesSeed true |
| `git diff --check` |Passed |
| Migration diff against615e5e5 |Empty |
| Runtime optimization source search for generator/truth/SKU reads |None; generic seasonal/calendar diagnostic only |

Backend coverage includes analytic/boundary/grid/kink math, invalid numeric inputs, determinism, exact display rounding, known effective costs versus catalog fallback, missing/stale costs/prices, inactive/baseline/sparse/seasonal/stockout abstention, unavailable forecast, page/search/ID/date/horizon validation, archive retention and no GET mutations. The full permanent-demo fixture also queries missing-cost gap and null suggestions before checksum verification. Existing M04–M06 regressions remain in full verify.

Frontend tests include actionable fields/accessible chart/text table, conditional non-actionable suppression even when an unsafe response supplies candidate fields, seasonal warning, missing cost/empty/error/retry, date/horizon/search/page filters, GET-only requests, stale-request cancellation and invalid windows. Existing environment/health/catalog/order/history/analytics/forecasting tests remain passing.

## Browser evidence

Browser plugin unavailable; established Playwright CLI fallback. Demo `http://localhost:4201/optimization`, normal `http://localhost:4200/optimization`, desktop1440×1050/mobile390×844. Screenshots outside repository were captured and inspected. Flow: Full2025 → searchSEASONAL → inspect → DIAGNOSTIC_ONLY/Recommendation withheld, explicit seasonal warning, cost/price provenance/bounds/stock/backtests; no candidate/uplift/chart on abstention. Pagination next/previous and14-day horizon worked. Mobile no document overflow; dense tables scroll inside labeled focusable regions.

Normal empty workspace shows no variants, no synthetic badge and no fabricated suggestion. Deliberately aborted optimization request shows error/retry and recovers. Existing health Connected → injected unavailable → Check again → Connected passed. Analytics Full2025 actual9466 orders, forecasting30 variants, product detail/four-period price history and immutable order detail regressions passed read-only. Console had no unexplained errors/warnings; injected network aborts generated expected errors. No overlay/blank-page problem.

Single-variant live evaluations took approximately114–688ms locally while integration tests ran, including first-request warmup. Bounded page processing shares batch queries; these measurements are not a production SLA.

Final current-build page10 timing: page0 cold1389ms, page1 warm424ms, page2 warm374ms. All30 outcomes:21 DIAGNOSTIC_ONLY,3 MISSING_PRICE,3 UNRELIABLE_ELASTICITY,3 INACTIVE_VARIANT,0 ACTIONABLE. UI counts remain page-scoped; these aggregate totals were independently collected from the three page responses for verification.

## Resolved issues and limitations

An initial ambiguous Java Overview import was qualified. An analytical-unit assertion initially compared a double-derived quantity at arbitrary full precision; corrected to the documented four-place output (156.2500/6250.0000), retaining exact optimum80 and exhaustive-neighbor tests. A test-only PostgreSQL alias required AS. The first independent fixture failed the strong backtest gate because its recent mixed prices made weekday error worse than naive; the gate correctly abstained. A stable reference-price period covering both lookbacks now tests the supported case without relaxing thresholds or changing permanent data.

Recommendation history, status-filtered global counts, calibrated uncertainty and causal identification are intentionally not implemented. Counts are explicitly current-page scoped; search/stable order is supported, global status filtering/sorting would require unbounded pre-evaluation. Current catalog policies/statuses are not historical policy reconstruction. Observational association can still be confounded even when configured checks pass. Future inventory/replenishment and excluded expenses can invalidate modeled uplift. No auto-apply/store write API exists. No required check is silently skipped; live actionable browser rendering is limited to automated fixtures as stated.

Existing startup: `scripts/demo.ps1 serve`, then `npm.cmd run start:demo` in frontend; normal startup remains README. Ports remain5433/8080/4200 normal and5434/8081/4201 demo. No new dependencies, migration or reseed needed. Final integrity/commit status recorded after complete verification below. Stop after07;08 requires review/new instruction.

## Final integrity and delivery

Both current-build backends report Actuator UP. Normal PostgreSQL retains baseline **0 products/0 orders**, with Flyway1/2/3 all successful. V1–V3 have no diff from615e5e5. Demo summary after all optimization queries confirms `matchesSeed: true`, unchanged SHA-256 **6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34**. No persistent demo/normal reset or reseed was performed. Local credentials/logs/runtime copies remain Git-ignored.

Local commits:803ffaa contribution module/contracts/shared inputs,60c9253 numerical/abstention/PostgreSQL tests,3c6723b Angular workflow. Final documentation commit is in the completion report/Git log. All requested verification ran; no required check skipped. Working tree clean after documentation commit. No push/remote creation/history rewrite/identity change. Milestone07 meets safety acceptance with explicitly conservative abstention and stated observational/numerical limitations; ready for user review before08, which was not started.
