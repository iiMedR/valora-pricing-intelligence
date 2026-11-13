import { PortfolioStory } from '../../../shared/merchant/portfolio-examples';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink, Params } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Variant } from '../models/catalog.models';
import {
  AnalyticsApi,
  PerformancePage,
  initialWindow,
} from '../../analytics/analytics-api.service';
import { OptimizationApi, Evaluation } from '../../optimization/optimization-api.service';
import { SessionService } from '../../../core/session.service';
import { reasonSummary, explainReason } from '../../../core/presentation';
import { apiError } from '../services/catalog-api.service';
import { ExplainMore, formatMoney } from '../../../shared/merchant/foundation';
import { ZardButtonComponent } from '../../../shared/components/button';
@Component({
  selector: 'app-variant-summary',
  imports: [RouterLink, ExplainMore, ZardButtonComponent, PortfolioStory],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="product-sales" aria-labelledby="variant-sales-title">
      <h2 id="variant-sales-title">Sales performance</h2>
      <p class="muted">{{ window().startDate }} to {{ window().endDate }} · end excluded, UTC</p>
      @if (salesLoading()) {
        <p role="status">Loading variant sales…</p>
      } @else if (salesError()) {
        <p role="alert">{{ salesError() }}</p>
        <button z-button zType="outline" (click)="loadSales()">Retry sales</button>
      } @else if (performance(); as row) {
        <dl class="variant-kpis">
          <div>
            <dt>Net sales</dt>
            <dd>{{ money(row.metrics.netSales, sales()!.range.currencyCode) }}</dd>
          </div>
          <div>
            <dt>Units sold</dt>
            <dd>{{ row.metrics.unitsSold.toLocaleString('en') }}</dd>
          </div>
        </dl>
        <p class="muted">
          Refunds are deducted in the refund period. Only this variant is included.
        </p>
        <details>
          <summary>Exact sales amounts</summary>
          <p>{{ row.metrics.netSales }} {{ sales()!.range.currencyCode }}</p>
        </details>
      } @else {
        <p>Sales totals unavailable for this variant in the returned results.</p>
      }
      <p class="muted">
        A variant sales trend is not available. Open sales to inspect the recorded totals.
      </p>
      <a z-button zType="outline" routerLink="/analytics" [queryParams]="links()">View sales</a>
    </section>
    <section class="product-pricing" aria-labelledby="variant-pricing-title">
      <h2 id="variant-pricing-title">Pricing insight</h2>
      @if (pricingLoading()) {
        <p role="status">Checking pricing evidence…</p>
      } @else if (pricingError()) {
        <p role="alert">Pricing evidence unavailable. {{ pricingError() }}</p>
        <button z-button zType="outline" (click)="loadPricing()">Retry pricing evidence</button>
      } @else if (evaluation(); as result) {
        <h3>
          {{
            actionable()
              ? 'Experimental suggestion to review'
              : 'No reliable price change suggested'
          }}
        </h3>
        <app-portfolio-story [sku]="result.variant.sku" />
        <p>{{ reason() }}</p>
        @if (actionable()) {
          <p class="suggested-price">
            {{ money(result.inputs.currentPrice, result.window.currencyCode) }} →
            {{ money(result.recommendedPrice, result.window.currencyCode) }}
          </p>
          <p class="muted">
            Not causally validated or a proven optimal price. Review the estimated contribution and
            assumptions.
          </p>
        }
        <app-explain-more label="Why this result?" title="Pricing evidence for this variant"
          ><p>{{ result.variant.productName }} · {{ result.variant.sku }}</p>
          <p>
            {{ result.window.startDate }} to {{ result.window.endDate }} ·
            {{ result.horizonDays }}-day comparison
          </p>
          <ul>
            @for (code of result.reasons; track $index) {
              <li>{{ explain(code) }}</li>
            }
          </ul>
          <details>
            <summary>Model and audit details</summary>
            <p>Model {{ result.modelVersion }} · evaluated {{ result.evaluationInstant }}</p>
            <p>
              Price-response estimate: {{ result.elasticity.estimate ?? 'Unavailable' }} ·
              {{ result.elasticity.status }}
            </p>
            <p>These are historical associations, not guaranteed causal effects.</p>
            <ul>
              @for (assumption of result.assumptions; track $index) {
                <li>{{ assumption }}</li>
              }
            </ul>
          </details>
          <a routerLink="/optimization" [queryParams]="links()"
            >View pricing evidence and evaluations</a
          ></app-explain-more
        >
      }
      <div class="actions">
        <a z-button zType="outline" routerLink="/forecasting" [queryParams]="links()"
          >View forecast</a
        ><a z-button zType="outline" routerLink="/optimization" [queryParams]="links()"
          >View pricing evidence</a
        >
      </div>
    </section>`,
  styles: [
    `
      :host {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 28px;
        margin-top: 28px;
      }
      section {
        border-top: 1px solid var(--border);
        padding-top: 24px;
        min-width: 0;
      }
      h2 {
        margin: 0 0 12px;
      }
      h3 {
        font-size: 18px;
        margin: 16px 0 8px;
      }
      .variant-kpis {
        display: flex;
        gap: 36px;
        flex-wrap: wrap;
        margin: 24px 0;
      }
      dt {
        font-size: 14px;
        color: var(--muted-foreground);
      }
      dd {
        font-size: 26px;
        font-weight: 600;
        margin: 4px 0;
        overflow-wrap: anywhere;
      }
      .suggested-price {
        font-size: 20px;
        font-weight: 600;
      }
      .actions {
        margin-top: 16px;
      }
      @media (max-width: 850px) {
        :host {
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .product-pricing {
          order: -1;
        }
      }
    `,
  ],
})
export class VariantSummary {
  readonly variant = input.required<Variant>();
  readonly context = input<Params>({});
  private readonly analytics = inject(AnalyticsApi);
  private readonly optimization = inject(OptimizationApi);
  private readonly session = inject(SessionService);
  private readonly destroy = inject(DestroyRef);
  private salesRequest?: Subscription;
  private pricingRequest?: Subscription;
  readonly window = computed(() => initialWindow(365, this.session.value()?.mode === 'DEMO'));
  readonly sales = signal<PerformancePage | null>(null);
  readonly salesLoading = signal(false);
  readonly salesError = signal('');
  readonly evaluation = signal<Evaluation | null>(null);
  readonly pricingLoading = signal(false);
  readonly pricingError = signal('');
  readonly money = formatMoney;
  readonly explain = explainReason;
  readonly performance = computed(
    () =>
      this.sales()?.results.content.find(
        (row) => row.variantId === this.variant().id && row.productId === this.variant().productId,
      ) ?? null,
  );
  readonly actionable = computed(() => {
    const r = this.evaluation();
    return r?.status === 'ACTIONABLE' && typeof r.recommendedPrice === 'string' && !!r.comparison;
  });
  readonly reason = computed(
    () =>
      reasonSummary(this.evaluation()?.reasons ?? [])
        .split('. ')[0]
        .replace(/\.$/, '') + '.',
  );
  readonly links = computed(() => ({
    ...this.context(),
    ...this.window(),
    horizonDays: 30,
    productId: this.variant().productId,
    variantId: this.variant().id,
    search: this.variant().sku.slice(0, 100),
  }));
  private authorized() {
    const s = this.session.value();
    return s?.mode === 'DEMO' || s?.authenticated === true;
  }
  constructor() {
    effect(() => {
      this.variant();
      this.session.value();
      untracked(() => {
        this.salesRequest?.unsubscribe();
        this.pricingRequest?.unsubscribe();
        this.sales.set(null);
        this.evaluation.set(null);
        if (this.authorized()) {
          this.loadSales();
          this.loadPricing();
        }
      });
    });
  }
  loadSales() {
    if (!this.authorized()) return;
    this.salesRequest?.unsubscribe();
    this.sales.set(null);
    this.salesError.set('');
    this.salesLoading.set(true);
    const v = this.variant();
    this.salesRequest = this.analytics
      .products(
        { ...this.window(), search: v.sku.slice(0, 100), sort: 'NET_DESC', granularity: 'MONTH' },
        0,
        v.productId,
      )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.sales.set(r);
          this.salesLoading.set(false);
        },
        error: (e) => {
          this.salesError.set(apiError(e));
          this.salesLoading.set(false);
        },
      });
  }
  loadPricing() {
    if (!this.authorized()) return;
    this.pricingRequest?.unsubscribe();
    this.evaluation.set(null);
    this.pricingError.set('');
    this.pricingLoading.set(true);
    const id = this.variant().id;
    this.pricingRequest = this.optimization
      .evaluation(id, { ...this.window(), horizonDays: 30, search: '' })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          if (r.variant.variantId !== id || r.variant.productId !== this.variant().productId) {
            this.pricingError.set('The response did not match the selected variant.');
          } else this.evaluation.set(r);
          this.pricingLoading.set(false);
        },
        error: (e) => {
          this.pricingError.set(apiError(e));
          this.pricingLoading.set(false);
        },
      });
  }
}
