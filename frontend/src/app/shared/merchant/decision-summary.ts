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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="sensitivity-summary">
    <h3>How customers responded to price</h3>
    @if (explanation(); as text) {
      <p>{{ text }}</p>
      <p class="muted">
        Estimated association, not a guaranteed effect. The 1% explanation is a local approximation.
      </p>
    } @else {
      <p><strong>Price response cannot be estimated reliably yet.</strong></p>
      <p class="muted">{{ reason() }}</p>
    }
  </section>`,
})
export class SensitivitySummary {
  readonly elasticity = input.required<DemandDetail['elasticity']>();
  readonly explanation = () => sensitivityText(this.elasticity());
  readonly reason = () =>
    this.elasticity().identification?.status === 'WEAK_PRICE_IDENTIFICATION'
      ? 'Price changes overlap with calendar patterns, so we cannot separate their effects reliably.'
      : reasonSummary(this.elasticity().reasons);
}

@Component({
  selector: 'app-price-comparison',
  imports: [RouterLink, ZardButtonComponent, SensitivitySummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let d = evaluation();
    <article class="decision-card" [attr.aria-label]="d.variant.productName + ' pricing review'">
      <div class="decision-card-heading">
        <div>
          <h3>{{ d.variant.productName }}</h3>
          <p class="muted">{{ d.variant.name }} · {{ d.variant.sku }}</p>
        </div>
        <span class="decision-state">{{
          d.status === 'ACTIONABLE' && d.comparison && d.recommendedPrice !== null
            ? 'Suggestion available'
            : 'No reliable suggestion yet'
        }}</span>
      </div>
      @if (d.status === 'ACTIONABLE' && d.comparison && d.recommendedPrice !== null) {
        <div class="price-change">
          <span><small>Current price</small>{{ number(d.inputs.currentPrice) }}</span
          ><span aria-hidden="true">→</span
          ><span><small>Suggested price</small>{{ number(d.recommendedPrice) }}</span
          ><small>{{ d.window.currencyCode }}</small>
        </div>
        <p class="decision-period">
          {{ d.horizonDays }}-day comparison · {{ dates(d.window.endDate, d.horizonDays) }}
        </p>
        <dl class="decision-comparison">
          <div>
            <dt>Expected units sold</dt>
            <dd>
              <span>{{ number(d.comparison.current.expectedUnits) }}</span><span aria-hidden="true"
                >→</span
              ><span class="sr-only">to </span
              ><strong>{{ number(d.comparison.candidate.expectedUnits) }}</strong>
            </dd>
          </div>
          <div>
            <dt>Estimated contribution · {{ d.window.currencyCode }}</dt>
            <dd>
              <span>{{ number(d.comparison.current.estimatedContribution) }}</span><span
                aria-hidden="true"
                >→</span
              ><span class="sr-only">to </span
              ><strong>{{ number(d.comparison.candidate.estimatedContribution) }}</strong>
            </dd>
          </div>
          <div>
            <dt>Estimated difference · {{ d.window.currencyCode }}</dt>
            <dd>
              <strong>{{ number(d.comparison.estimatedUplift) }}</strong><span>{{
                d.comparison.estimatedUpliftPercent === null
                  ? 'Percentage unavailable'
                  : number(d.comparison.estimatedUpliftPercent) + '%'
              }}</span>
            </dd>
          </div>
        </dl>
        <p class="muted contribution-definition">
          Sales minus known variable costs; other business expenses are excluded. This is an
          estimate, not guaranteed profit.
        </p>
        <app-sensitivity-summary [elasticity]="d.elasticity" />
        <button z-button zType="outline" type="button" (click)="inspect.emit(d.variant.variantId)">
          Why this suggestion?
        </button>
      } @else {
        <p>
          Current price:
          <strong>{{ number(d.inputs.currentPrice) }} {{ d.window.currencyCode }}</strong>
        </p>
        <p>{{ reason(d.reasons) }}</p>
        <div class="actions">
          <a
            z-button
            zType="outline"
            [routerLink]="['/onboarding/variants', d.variant.variantId]"
            [queryParams]="{ startDate: d.window.startDate, endDate: d.window.endDate }"
            >Review what to fix</a
          >
          <button z-button zType="ghost" type="button" (click)="inspect.emit(d.variant.variantId)">
            Show details
          </button>
        </div>
      }
    </article>`,
})
export class PriceComparison {
  readonly evaluation = input.required<Evaluation>();
  readonly inspect = output<string>();
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
