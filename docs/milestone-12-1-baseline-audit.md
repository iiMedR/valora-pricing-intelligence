# Milestone 12.1 baseline audit

2026-11-14. Starting branch codex/milestone-01, clean HEAD bc3c9b4. Prompt: SmartPricing_Codex_Prompt_12_1_Visual_Design_Polish.md. No UI implementation has begun.

## Inspected baseline

Angular22 frontend in frontend/src/app; shared source-owned Zard primitives in shared/components and shared/core, documented by shared/ZARD-LICENSE and zard-provenance.json. Global styles frontend/src/styles.css; Tailwind/Zard tokens frontend/src/zard-theme.css; reusable merchant UI in shared/merchant. Existing feature files cover home, catalog product-list/detail, history/orders, analytics, forecasting, optimization/pricing-evidence, store-connection, onboarding, settings and categories; separate SaaS routes remain protected. No backend/API/schema/model/seed changes are in scope.

Current theme is predominantly neutral, with existing warning/success/error tokens, system Apple-oriented font stack, compact metric styles and lazy chart components. The requested work needs contextual layout improvements, not merely changing primary color. Preserve black charts, explicit experimental/known-failure warnings, historical dates, read-only demo controls and financial/model separation.

Last measured Milestone12 results (historical baseline, not rerun12.1):451.87kB initial/115.71kB estimated transfer;126unit+67integration+156frontend tests pass;62browser/axe states. Canonical portfolio5c9b2e4391fcf5cbb0a3f4b15f0ca97ad25b8fe6ecad9252e718f4826fff3ca6,15approved/15withheld; legacy6668dcb85d28e183c3e0f94cd9f1043616a96b1f978597fc6e8e3daca1b06c34,30withheld. These must be rechecked after implementation. Current reports: milestone-12-verification.md and demo/artifacts/milestone-12.

## Skills and supplied references

Read Frontend Design at C:/Users/iimedr/.codex/skills/frontend-design/SKILL.md and Playwright CLI at C:/Users/iimedr/.codex/skills/playwright/SKILL.md. npx.cmd exists. Searched installed skill/cache directories for Zard and Review Agent SKILL.md: neither found; no claim of using them. Existing source-owned Zard components are available, but are not the missing Zard skill. Image generation is optional and not used; OpenAI Docs/Skill Creator are unnecessary. Independent subagent review is explicitly requested by the prompt and can provide a fallback if the named Review Agent skill remains unavailable, without claiming that skill was used.

The ten application screenshots plus one Skills screenshot described by this prompt are not attached in this turn. Earlier conversation images and existing repository browser captures are available but cannot be represented as those eleven supplied references. The prompt explicitly requires asking for originals if absent, and reading Zard guidance before UI modifications. Implementation is therefore pending these required references/guidance or a user-directed fallback. No screenshots falsely claimed inspected. Fresh page/width baseline capture, bundle/test measurements and design plan remain pending; historical values above are clearly labeled.

## Planned scope once references are available

Define a small shared semantic token system, restrained interactive accent, financial teal only where appropriate, amber evidence states and red known failures; retain neutral light-first surfaces and compact type. Audit actual screenshots against current pages before choosing targeted changes. Prioritize catalog proportions/placeholders, order reference traceability, scan-friendly forecast/insight states, concise portfolio orientation, read-only categories/settings/connection layout and navigation focus. Reuse existing Angular/Zard primitives; no new dependency, algorithm, fake data or automatic price application.

Record before/after at320/375/768/1440, test interactions/zoom/keyboard/axe, run complete suites/build and read-only invariants, independent review, then logical local commits. No push/deploy/remote action. Preserve all research failures, fixtures, optima80/90, checksums and mode isolation.
