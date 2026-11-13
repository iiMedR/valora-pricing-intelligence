# Milestone 11.14 cleanup audit

Scope: dataset selection and directly affected seeding/presentation. No broad refactor or dependency removal. No optimizer/gate/model behavior changed.

Reference searches performed with rg/git ls-files across scripts, README, demo generator/service/repository, tests and docs. Searches for demo.ps1, DemoGenerator and DemoChecksum show active references in README, demo-data.md, analytics/forecast/optimization docs and regression tests. git ls-files searched dump/debug/log/temp/backup/sql paths: no tracked disposable dump/debug log candidates; historical migrations and source directives are active. Research artifact directories, original checksum/evaluations and regression truth are explicitly retained. Ignored local logs/target files are not repository deletions.

|Change / candidate|Dependency evidence and decision|Impact|
|---|---|---|
|Duplicate portfolio CLI setup|Both fixture commands need identical credential lifecycle, Compose/Maven invocation and reset handling. scripts/portfolio-demo.ps1 delegates to scripts/demo.ps1 with a validated dataset selector.|One implementation of CLI mechanics; existing legacy defaults preserved. No parallel seed loader.|
|Duplicate canonical export SQL|DemoChecksum already defines canonical ordering/normalization. Extracted writeCanonical byte sink shared by digest and export.|Same legacy bytes; new fresh-seed golden checksum and byte comparison verify preservation. Export explicitly buffers its bounded dataset; no new cache/framework.|
|Hard-coded seeder version/name/bounds/archive behavior|DemoSeedService and DemoMetadataRepository used legacy constants. Small dataset methods on existing DemoGenerator provide the portfolio differences.|Shared transaction, advisory lock and catalog/history/sales loading remain. No general plugin abstraction or ORM rewrite.|
|Missing cost import|CatalogRules requires a known cost; schema V5/import paths support null. Portfolio-only EntityManager insertion preserves null rather than storing0 or relaxing user editing rules.|First integration failure rolled back; fixed inside isolated loader. Normal catalog rules untouched.|
|Historical benchmark CSV/JSON and screenshots|Referenced by milestone/research docs and required scientific evidence.|Retained; no deleted history, tests, truth, migration or assets.|
|N+1/service call cost|Existing loader validates per-row immutable history/order behavior in one outer transaction. No measured bottleneck comparison initially available.|No speculative bulk rewrite, batching framework or speedup claim. Measure actual seed timing/bytes in verification.|

Removed tracked files: none. Removed dependencies: none. New image dependencies: none; existing local fallback illustrations used. No actual customer/provider records or normal/SaaS code removed. New source remains focused on demo loading/guards and minimal environment wording. Further readability/product work belongs to a separately reviewed11.15.


Measured evidence: legacy canonical export4,146,763 bytes; portfolio4,878,054 bytes. They are different datasets, not a before/after optimization benchmark. Legacy seeder integration case245.9s and portfolio case239.3s cover different assertions; no speedup is inferred. First fresh portfolio seed78.448s inside the IT; local CLI successful seed195s included Maven/startup and concurrent verification. No bulk/per-row behavior was rewritten merely to claim an improvement. Full generated exports stay ignored under backend/target rather than adding redundant tracked dumps.
