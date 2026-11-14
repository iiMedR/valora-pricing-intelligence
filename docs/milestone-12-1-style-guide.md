# SmartPricing visual language — Milestone12.1

Current application screenshots supplied in SmartPricing_12_1_Original_Screenshots.zip are BEFORE references, not target mockups. All11 images inspected:10application pages and Skills. Continue from audit a9675ea; user authorized existing-Zard and independent-subagent fallbacks. No second baseline audit.

## Plan and review before implementation

Use an instrument-panel hierarchy: quiet slate canvas, white working surfaces, clear charcoal figures, one blue next action, and explicit amber/red evidence states. Keep black data lines and real units/dates. Apple-oriented system typography, deliberate14px body/13px supporting text/28px page headings, tabular figures, readable16px mobile inputs; touch controls44px. Avoid decorative gradients, glass and extra shadows.

Palette: canvas#F8FAFC, text#111827, secondary#475569, interaction#2563EB (strong text#1D4ED8), financial#0F766E, evidence#92400E on#FFFBEB, failure#B91C1C on#FEF2F2. Shared root tokens, not page-specific hex palettes. Focus uses blue; selection includes shape/weight/aria state. Model approvals use blue Experimental suggestion text, never financial green. Known failures retain explicit text and adjacent red warnings. Missing inputs use amber, inactive stays neutral.

Layout concept:

```text
navigation | page title + one-line context
           | compact working filters
           | priority figures / scan-friendly results
           | chart or selected detail
           | expandable supporting evidence
```

This is intentionally the merchant's restrained analytics interface, not a new brand/card template. Distinctive detail comes from meaningful evidence rails, compact category-specific line illustrations, traceable order references and clear financial periods. Revise the generic all-colored-KPI idea: only net sales gets a quiet emphasis; estimated model contribution never gets a blanket positive color. Keep the existing scenario chooser expandable, with three grounded entry links from its current story mapping.

## Implementation conventions

Reuse source-owned Zard card/button/badge/input and existing ng-icons. Zard provenance CLI1.6.0; Angular/CDK22.2.6, ng-icons36.1.0, Tailwind4.3.5. No new UI library, dependency, remote font or generated image. Catalog illustrations are explicitly category placeholders; authenticated/private product data is not invented.

Component-level layouts own page density; shared tokens own meaning. Keep permissions/events/DTOs unchanged. Orders may shorten visible references only with the exact full reference available by keyboard/touch details and original detail link. Experimental/withheld reasons remain readable, known-failure explanations never collapsed away. Settings and category demo restrictions stay explicit without repeated unavailable-action chrome.

Use local Playwright CLI0.1.24 from existing cached installation (npx default offline cache lacked its registry metadata); no package downloaded. Capture matching before/after pages at320/375/768/1440, with separate broader interaction/axe regression matrix. Independent review subagent replaces unavailable Review Agent skill. Optional ImageGen, OpenAI Docs and Skill Creator not used. Scientific/data/security constraints remain unchanged.
