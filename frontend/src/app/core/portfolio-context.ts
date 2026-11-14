import { Injectable, computed, inject } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { SessionService } from './session.service';
export interface PortfolioExample {
  sku: string;
  title: string;
  productName: string;
  context: string;
  failure?: boolean;
}
// Presentation-only stories; never prices, oracle coefficients, eligibility rules or stored results.
export const PORTFOLIO_EXAMPLES: readonly PortfolioExample[] = [
  {
    sku: 'PORT-ELASTIC_HIGH-1',
    productName: 'Roasted Coffee · Classic',
    title: 'Elastic demand',
    context: 'Explore independent weekly price variation and a conditional model suggestion.',
  },
  {
    sku: 'PORT-ELASTIC_LOW-1',
    productName: 'Everyday Rice · Classic',
    title: 'Inelastic demand',
    context:
      'Compare a different observed price response. An estimate is not a proven price effect.',
  },
  {
    sku: 'PORT-SEASONAL-1',
    productName: 'Summer Picnic Set · Classic',
    title: 'Seasonality',
    context: 'Prices and calendar patterns overlap. See why the model withholds a suggestion.',
  },
  {
    sku: 'PORT-PROMOTION-1',
    productName: 'Ceramic Mug · Classic',
    title: 'Hidden marketing',
    failure: true,
    context:
      'Hidden marketing distorts the observed price response. The engine may approve an incorrect suggestion.',
  },
  {
    sku: 'PORT-PROMOTION-2',
    productName: 'Ceramic Mug · Studio',
    title: 'Promotions',
    context: 'Listed and paid prices differ. Review excluded observations and the withheld result.',
  },
  {
    sku: 'PORT-STOCKOUT-1',
    productName: 'Glass Storage Jar · Classic',
    title: 'Stock constraints',
    context: 'Sales are limited by availability; recorded sales do not reveal all lost demand.',
  },
  {
    sku: 'PORT-SPARSE-1',
    productName: 'Travel Organizer · Classic',
    title: 'Missing costs',
    context:
      'Limited history and missing recorded cost. Explore financial guidance without invented inputs.',
  },
  {
    sku: 'PORT-REFUND-1',
    productName: 'Canvas Carry Bag · Classic',
    title: 'Refunds',
    context:
      'Review sales and returns. Model contribution excludes future refund effects and other expenses.',
  },
  {
    sku: 'PORT-COST_CHANGE_UNKNOWN-2',
    productName: 'Cotton Table Linen · Studio',
    title: 'Incorrect recorded cost',
    failure: true,
    context:
      'The recorded cost is wrong. An approved suggestion and a good model fit do not establish correctness.',
  },
  {
    sku: 'PORT-ARCHIVE-2',
    productName: 'Classic Notebook · Studio',
    title: 'Near the optimum',
    context:
      'Known synthetic limitation: a small estimated improvement can be a worse price in the generator. Review assumptions before interpreting tiny differences.',
  },
];
@Injectable({ providedIn: 'root' })
export class PortfolioContext {
  private readonly environment = inject(EnvironmentService);
  private readonly session = inject(SessionService);
  readonly active = computed(() => {
    const e = this.environment.value(),
      s = this.session.value();
    return (
      e?.mode === 'DEMO' &&
      e.synthetic &&
      e.datasetVersion === 'portfolio-v1' &&
      e.datasetState === 'READY' &&
      e.businessMode === 'ECOMMERCE' &&
      s?.mode === 'DEMO' &&
      s.readOnly &&
      (s.loginRequired ? s.authenticated : !s.authenticated)
    );
  });
  exampleByName(name: string) {
    return this.active() ? PORTFOLIO_EXAMPLES.find((e) => e.productName === name) : undefined;
  }
  example(sku: string) {
    return this.active() ? PORTFOLIO_EXAMPLES.find((e) => e.sku === sku) : undefined;
  }
}
