# Milestone12.1 before / after screenshots

These are real local Chrome screenshots, not target mockups or generated images. Supplied ZIP originals were inspected as current-app references; SHA2568e6b1a49cec7864f1f55ded5e15ba4db47f2ce7e279c05bd474673e90ef05bde. Originals remain outside Git; the ten application pages and Skills image are not falsely presented as new captures.

Matching captures use Playwright CLI0.1.24, viewport heights960px and widths320/375/768/1440. Before uses the untouched Milestone12 production frontend (same runtime as baselinea9675ea); after uses the12.1 production build. Local read-only proxy4217 forwards to the unchanged portfolio API8087. Images capture the initial viewport; lower content, expanded states and interactions are covered by separate QA captures/reports. Table overflow is contained in labeled keyboard-focusable scroll regions.

## Matching page pairs
### overview

- 320px: [Before](before/overview-320.png) · [After](after/overview-320.png)
- 375px: [Before](before/overview-375.png) · [After](after/overview-375.png)
- 768px: [Before](before/overview-768.png) · [After](after/overview-768.png)
- 1440px: [Before](before/overview-1440.png) · [After](after/overview-1440.png)

### products

- 320px: [Before](before/products-320.png) · [After](after/products-320.png)
- 375px: [Before](before/products-375.png) · [After](after/products-375.png)
- 768px: [Before](before/products-768.png) · [After](after/products-768.png)
- 1440px: [Before](before/products-1440.png) · [After](after/products-1440.png)

### orders

- 320px: [Before](before/orders-320.png) · [After](after/orders-320.png)
- 375px: [Before](before/orders-375.png) · [After](after/orders-375.png)
- 768px: [Before](before/orders-768.png) · [After](after/orders-768.png)
- 1440px: [Before](before/orders-1440.png) · [After](after/orders-1440.png)

### analytics

- 320px: [Before](before/analytics-320.png) · [After](after/analytics-320.png)
- 375px: [Before](before/analytics-375.png) · [After](after/analytics-375.png)
- 768px: [Before](before/analytics-768.png) · [After](after/analytics-768.png)
- 1440px: [Before](before/analytics-1440.png) · [After](after/analytics-1440.png)

### forecasts

- 320px: [Before](before/forecasts-320.png) · [After](after/forecasts-320.png)
- 375px: [Before](before/forecasts-375.png) · [After](after/forecasts-375.png)
- 768px: [Before](before/forecasts-768.png) · [After](after/forecasts-768.png)
- 1440px: [Before](before/forecasts-1440.png) · [After](after/forecasts-1440.png)

### pricing-insights

- 320px: [Before](before/pricing-insights-320.png) · [After](after/pricing-insights-320.png)
- 375px: [Before](before/pricing-insights-375.png) · [After](after/pricing-insights-375.png)
- 768px: [Before](before/pricing-insights-768.png) · [After](after/pricing-insights-768.png)
- 1440px: [Before](before/pricing-insights-1440.png) · [After](after/pricing-insights-1440.png)

### shopify

- 320px: [Before](before/shopify-320.png) · [After](after/shopify-320.png)
- 375px: [Before](before/shopify-375.png) · [After](after/shopify-375.png)
- 768px: [Before](before/shopify-768.png) · [After](after/shopify-768.png)
- 1440px: [Before](before/shopify-1440.png) · [After](after/shopify-1440.png)

### data-readiness

- 320px: [Before](before/data-readiness-320.png) · [After](after/data-readiness-320.png)
- 375px: [Before](before/data-readiness-375.png) · [After](after/data-readiness-375.png)
- 768px: [Before](before/data-readiness-768.png) · [After](after/data-readiness-768.png)
- 1440px: [Before](before/data-readiness-1440.png) · [After](after/data-readiness-1440.png)

### business-settings

- 320px: [Before](before/business-settings-320.png) · [After](after/business-settings-320.png)
- 375px: [Before](before/business-settings-375.png) · [After](after/business-settings-375.png)
- 768px: [Before](before/business-settings-768.png) · [After](after/business-settings-768.png)
- 1440px: [Before](before/business-settings-1440.png) · [After](after/business-settings-1440.png)

### categories

- 320px: [Before](before/categories-320.png) · [After](after/categories-320.png)
- 375px: [Before](before/categories-375.png) · [After](after/categories-375.png)
- 768px: [Before](before/categories-768.png) · [After](after/categories-768.png)
- 1440px: [Before](before/categories-1440.png) · [After](after/categories-1440.png)

## Additional interaction views

The after directory also includes filtered catalog grid/list, full order reference disclosure, selected14-day forecast, four200% CSS-zoom stress views, root-relative200% text scaling, and the experimental detail used in README. These are explicitly additional states, not all matching before/after pairs. CSS zoom is a stress approximation; native browser zoom and all assistive technologies are not certified. The broad54-state regression captures are retained in the local visualization workspace with the compact JSON report committed separately.

[Verification report](../../../milestone-12-1-verification.md) records test methods, computed semantic colors, accessibility results, independent review and data invariants.
