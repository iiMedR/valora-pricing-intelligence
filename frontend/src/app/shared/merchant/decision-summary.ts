import { PortfolioStory } from './portfolio-examples';
import { actionable } from './pricing-presentation';
import { StatusPill, formatMoney } from './foundation';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideCalendarDays,
  lucideArrowRight,
  lucideInfo,
  lucidePackage,
  lucideCoins,
  lucideChartNoAxesColumnIncreasing,
  lucideCircleHelp,
  lucideTrendingDown,
} from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '../components/button';
import { Evaluation } from '../../features/optimization/optimization-api.service';
import { DemandDetail } from '../../features/forecasting/forecast-api.service';
import { reasonSummary } from '../../core/presentation';

/** Presentation only: retain every significant digit in the server decimal. */
export function decisionNumber(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'Unavailable';
  const [whole, fraction = ''] = value.split('.');
  const tail = fraction.replace(/0+$/, '');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (tail ? '.' + tail : '');
}

export function comparisonDates(start: string, days: number): string {
  const last = new Date(start + 'T00:00:00Z');
  last.setUTCDate(last.getUTCDate() + days - 1);
  return `${start} to ${last.toISOString().slice(0, 10)} · UTC`;
}

export function sensitivityText(elasticity: DemandDetail['elasticity']): string | null {
  const beta = elasticity.estimate;
  if (
    elasticity.status !== 'READY' ||
    elasticity.identification?.status !== 'CONDITIONAL_ASSOCIATION_ONLY' ||
    beta === null ||
    !Number.isFinite(beta) ||
    beta >= 0
  )
    return null;
  return `In the analyzed history, a 1% higher price was associated with approximately ${new Intl.NumberFormat('en', { maximumSignificantDigits: 3 }).format(Math.abs(beta))}% fewer units sold.`;
}

@Component({
  selector: 'app-sensitivity-summary',
  imports: [NgIcon],
  providers: [provideIcons({ lucideTrendingDown, lucideArrowRight, lucideInfo })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="response-summary">
    <h3>
      <ng-icon
        [name]="explanation() ? 'lucideTrendingDown' : 'lucideInfo'"
        aria-hidden="true"
      />Price sensitivity
    </h3>
    @if (explanation(); as text) {
      <div class="response-content">
        <div class="response-visual" aria-hidden="true">
          <div><strong>1%</strong><span>higher price</span></div>
          <ng-icon name="lucideArrowRight" />
          <div>
            <strong>{{ magnitude() }}%</strong><span>fewer units</span>
          </div>
        </div>
        <div class="response-explanation">
          <p>{{ text }}</p>
          <p class="qualification">
            Estimated association, not a guaranteed effect. The 1% explanation is a local
            approximation.
          </p>
        </div>
      </div>
    } @else {
      <p><strong>Price response cannot be estimated reliably yet.</strong></p>
      <p class="qualification">{{ reason() }}</p>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .response-summary {
        padding: 20px;
        background: var(--canvas);
        border: 1px solid var(--border);
        border-radius: 9px;
      }
      h3 {
        display: flex;
        align-items: center;
        gap: 9px;
        font-size: 14px;
        margin: 0 0 16px;
      }
      ng-icon {
        font-size: 18px;
        color: var(--muted-foreground);
        flex-shrink: 0;
      }
      .response-content {
        display: flex;
        align-items: center;
        gap: 28px;
      }
      .response-visual {
        display: flex;
        align-items: center;
        gap: 18px;
        flex-shrink: 0;
      }
      .response-visual strong {
        display: block;
        font-size: 23px;
        line-height: 1.2;
        font-weight: 600;
        letter-spacing: -0.025em;
      }
      .response-visual span {
        display: block;
        font-size: 11px;
        color: var(--muted-foreground);
        margin-top: 5px;
      }
      .response-explanation {
        border-left: 1px solid var(--border);
        padding-left: 24px;
      }
      p {
        font-size: 13px;
        line-height: 1.65;
        margin: 0;
        max-width: 85ch;
      }
      .qualification {
        color: var(--muted-foreground);
        font-size: 12px;
        margin-top: 8px;
      }
      @media (max-width: 700px) {
        .response-content {
          flex-direction: column;
          align-items: start;
          gap: 18px;
        }
        .response-explanation {
          border-left: 0;
          padding: 0;
        }
        .response-summary {
          padding: 16px;
        }
      }
    `,
  ],
})
export class SensitivitySummary {
  readonly elasticity = input.required<DemandDetail['elasticity']>();
  readonly explanation = () => sensitivityText(this.elasticity());
  readonly magnitude = () => {
    const value = this.elasticity().estimate;
    return value == null
      ? 'Unavailable'
      : new Intl.NumberFormat('en', { maximumSignificantDigits: 3 }).format(Math.abs(value));
  };
  readonly reason = () =>
    this.elasticity().identification?.status === 'WEAK_PRICE_IDENTIFICATION'
      ? 'Price changes overlap with calendar patterns, so we cannot separate their effects reliably.'
      : reasonSummary(this.elasticity().reasons);
}

@Component({
  selector: 'app-price-comparison',
  imports: [
    StatusPill,
    RouterLink,
    ZardButtonComponent,
    SensitivitySummary,
    PortfolioStory,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './price-comparison.html',
  styleUrl: './price-comparison.css',
  providers: [
    provideIcons({
      lucideArrowLeftRight,
      lucideCalendarDays,
      lucideArrowRight,
      lucideInfo,
      lucidePackage,
      lucideCoins,
      lucideChartNoAxesColumnIncreasing,
      lucideCircleHelp,
    }),
  ],
})
export class PriceComparison {
  readonly eligible = actionable;
  readonly showHeader = input(true);
  readonly inspectLabel = input<string | null>(null);
  readonly evaluation = input.required<Evaluation>();
  readonly inspect = output<string>();
  readonly money = formatMoney;
  readonly amount = (value: string | null | undefined, currency: string) => {
    const formatted = formatMoney(value, currency);
    return formatted.endsWith(' ' + currency)
      ? formatted.slice(0, -currency.length - 1)
      : formatted;
  };
  readonly tone = (value: string | null) =>
    !value || !/^-?\d+(\.\d+)?$/.test(value) || /^-?0+(\.0+)?$/.test(value)
      ? 'neutral'
      : value.startsWith('-')
        ? 'negative'
        : 'positive';
  readonly number = decisionNumber;
  readonly dates = comparisonDates;
  readonly reason = reasonSummary;
}

@Component({
  selector: 'app-pricing-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<details class="teaching-example">
    <summary>See a worked pricing example</summary>
    <h2>Worked example — illustrative, not your store’s recommendation</h2>
    <p>
      Assume 100 units sold over 30 days at a price of 100, a unit variable cost of 40, and price
      sensitivity of −2.
    </p>
    <div class="price-change">
      <span><small>Example current price</small>100</span><span aria-hidden="true">→</span
      ><span><small>Example suggested price</small>80</span>
    </div>
    <dl class="decision-comparison">
      <div>
        <dt>Expected units over 30 days</dt>
        <dd>100 → 156.25</dd>
      </div>
      <div>
        <dt>Estimated contribution</dt>
        <dd>6,000 → 6,250</dd>
      </div>
      <div>
        <dt>Estimated difference</dt>
        <dd>250 · approximately 4.17%</dd>
      </div>
    </dl>
    <p>At price 100: (100 − 40) × 100 = 6,000. At price 80: (80 − 40) × 156.25 = 6,250.</p>
    <p>
      A 1% higher price is associated with approximately 2% fewer units in this assumed model.
      Larger price changes use the model’s curved relationship, rather than multiplying that 1%
      approximation.
    </p>
    <p class="muted">
      Amounts are illustrative currency units. This example assumes adequate stock and excludes
      other business expenses. It is not based on your store’s data, is never counted as a result
      and cannot be saved as an evaluation.
    </p>
  </details>`,
})
export class PricingExample {}
