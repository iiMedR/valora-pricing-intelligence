# Portfolio demo and legacy research fixture

SmartPricing is a junior full-stack portfolio project built with Spring Boot, Angular and PostgreSQL. Explore recorded financial calculations, hypothetical scenarios and guarded experimental models. It is not a commercial SaaS launch or a validated autonomous pricing system. No prices are applied automatically.

## Launch the portfolio — PowerShell

Use JDK21, Node/npm and Docker Desktop with Linux containers (pinned versions in the root README). From the repository root:

```powershell
$env:JAVA_HOME='C:/Program Files/Java/jdk-21.0.11' # adapt to your JDK21
./scripts/portfolio-demo.ps1 init
./scripts/portfolio-demo.ps1 serve
# Separate terminal:
cd frontend
npm.cmd ci
npm.cmd run start:portfolio
```

Open [Products](http://localhost:4207/products) or [Overview](http://localhost:4207). Browsing is anonymous and read-only. Init explicitly seeds an isolated volume; ordinary serve never seeds. The first seed can take several minutes while existing business services validate immutable history. No customer identity or default administrator is created.

## A 3–5-minute walkthrough

1. Open **Products → Explore the portfolio → Choose an example → Elastic demand**. Open the matching product. Its scenario label explains the synthetic history; the selected variant and search survive back navigation.
2. Follow **Pricing guidance**. This is financial arithmetic. For Roasted Coffee · Classic, the recorded price is90 MAD and recorded unit cost36 MAD. Try candidate80, assumed current units100 and assumed candidate units110. Explicitly confirm simplified cost assumptions. These volumes are your assumptions, not a demand forecast; contribution excludes other business expenses.
3. Open **View pricing evidence**. Compare the engine's current and model-suggested prices, units and estimated contribution. “Experimental suggestion” means the existing model returned a comparison; it is not a proven optimal price or validated causal effect. Historical forecast dates are1–30January2026, not the coming month today.
4. Return to **Explore the portfolio** and open **Hidden marketing** or **Incorrect recorded cost**. Each carries a **Known synthetic failure** warning beside the statistical result. Approval is not evidence of correctness. These deliberately misleading approvals remain visible rather than being tuned away.
5. Try **Seasonality**, **Missing costs**, **Stock constraints** or **Refunds**. Review a withheld reason and “Why this result?” or compare financial assumptions with missing inputs. Adding records alone does not guarantee eligibility. The near-optimum example also shows why tiny estimated improvements can be misleading.

Optional separate SaaS installation: follow [subscription setup](../subscription-setup.md), then **Plans → Review plan → Pricing guidance** at http://localhost:4202/saas/plans. Monthly and annual prices retain their billing periods; subscriber counts, cancellations and servicing costs are assumptions. Cash is not MRR. SaaS has no validated price-response model and receives no commerce portfolio labels. There is no anonymous SaaS demo seed or business-mode switch; use your own separate approved test installation. Browser verification uses an existing disposable QA installation, never normal records or live billing.

## What the examples mean

|Example|What to inspect|
|---|---|
|Elastic / inelastic demand|Independent synthetic weekly price variation; conditional model suggestions.|
|Seasonality / promotions|Calendar overlap or listed-versus-paid price differences; actual withholding reasons.|
|Hidden marketing|Known failure: an unobserved influence produces a misleading approved price.|
|Incorrect recorded cost|Known failure: a good model fit does not verify a cost input.|
|Missing costs|Sparse observations and unavailable cost; no invented zero contribution.|
|Stock constraints|Censored sales and availability limits; lost customers are not estimated.|
|Refunds|Recorded sales/refunds; model contribution excludes future refund effects.|
|Near the optimum|A small estimated improvement can be worse under known synthetic truth.|

The unchanged seed has15 approved and15 withheld engine outcomes. That is not15 scientifically correct recommendations. Earlier11.13 research still found unsafe TEST65/260 and CHALLENGE41/156, and hidden causal interval coverage0/20. See [every actual scenario and limitation](portfolio-evaluation.md). No independent merchant usability or live Shopify/billing validation is claimed.

## Installations and safe repeat/reset

|Installation|PostgreSQL|Backend|Frontend|
|---|---:|---:|---:|
|Normal records|5433|8080|4200|
|Original legacy research fixture|5434|8081|4201|
|Separate SaaS installation|5435|8082|4202|
|Portfolio synthetic fixture|5437|8087|4207|

```powershell
./scripts/portfolio-demo.ps1 seed       # idempotent; refuses edited/mismatched data
./scripts/portfolio-demo.ps1 summary
./scripts/portfolio-demo.ps1 export     # backend/target/demo-canonical.jsonl
./scripts/portfolio-demo.ps1 reset -ConfirmReset
```

Reset replaces only the verified portfolio fixture and requires the explicit flag. Before reset, export and copy the canonical file to a safe local backup path. This export is an audit artifact, not a pg_restore backup; for recovery of IDs/metadata, also use pg_dump for the portfolio container and retain the private ignored credentials. Do not remove volumes or point demo commands at normal/live databases.

The shared scripts/demo.ps1 defaults to legacy; scripts/portfolio-demo.ps1 selects portfolio. Existing `./scripts/demo.ps1 summary` and `./scripts/demo.ps1 serve` and `npm.cmd run start:demo` still address the legacy installation. Switching means opening a different installation, not reseeding it. The original fixture remains unchanged at30 variants,9466 orders,114 refunds,10044 observations and30 abstentions.

Portfolio requires demo+portfolio profiles, ECOMMERCE mode, a restricted dedicated DB/user and its admin-owned immutable PORTFOLIO marker. Legacy uses a different immutable SYNTHETIC marker. Checks precede Flyway and every reset. No local/saas profile mixing; frozen portfolio seed20251114/date2025-01-01; no automatic seeding. Init creates private ignored infra/.env.portfolio.local credentials; never commit or print them. No migrations, providers or new dependencies are needed.

## Reproduce verification

```powershell
cd backend
./mvnw.cmd verify
cd ..
npm.cmd test --prefix frontend -- --watch=false
npm.cmd run build --prefix frontend
./frontend/node_modules/.bin/tsc.cmd --noEmit -p frontend/tsconfig.app.json
```

PortfolioSeederIT compares two fresh isolated canonical exports, idempotency and guarded reset. The original golden checksum, oracle80/actionable90 and security/SaaS/research regressions remain included. UUIDs and insertion timestamps normalize out; logical keys and money remain stable. Milestone11.14 evidence is retained. Latest UX checks and curated screenshots are documented in [11.15 verification](../milestone-11-15-verification.md).

## Final verification

See [Milestone12 verification](../milestone-12-verification.md) for the final local test matrix, fresh-seed evidence and publishing limits, and [interview notes](../portfolio-interview-notes.md) for a concise technical explanation. The root project license is still an owner decision; no public repository or deployment was created. Existing11.15 screenshots remain representative because no runtime UI changed in12; current browser evidence is versioned separately.

Milestone12.1 refines the existing interface with shared semantic colors, compact catalog/forecast layouts and clearer evidence states. See [visual verification](../milestone-12-1-verification.md) and [matching before/after screenshots](screenshots/milestone-12-1/README.md). Dataset and model outputs remain unchanged.
