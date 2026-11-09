import { Subscription } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AnalyticsApi,
  Performance,
  initialWindow,
} from '../../features/analytics/analytics-api.service';
import { SessionService } from '../../core/session.service';
import { insightWindow } from './insight-window';
import { formatMoney } from './foundation';
export const validCatalogId = (id: string | null): id is string =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
@Component({
  selector: 'app-product-context',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (productId) {
    <aside class="product-context">
      <a [routerLink]="['/products', productId]" [queryParams]="back">← Back to product</a>
      @if (showSales()) {
        <h2>Selected variant sales</h2>
        @if (loading()) {
          <p role="status">Loading selected variant…</p>
        } @else if (row(); as data) {
          <p>
            <strong>{{ data.name }}</strong> · {{ data.sku }}
          </p>
          <p>{{ range?.startDate }} to {{ range?.endDate }} · end excluded, UTC</p>
          <p>
            Net sales {{ money(data.metrics.netSales, range?.currencyCode ?? '') }} ·
            {{ data.metrics.unitsSold }} units sold
          </p>
          <p class="muted">
            Refunds are deducted in their refund period. The report below shows the whole store.
          </p>
        } @else {
          <p>
            Selected variant totals unavailable. Open the product to retry or review its sales
            window.
          </p>
        }
      }
    </aside>
  }`,
  styles: [
    `
      .product-context {
        border-bottom: 1px solid var(--border);
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      h2 {
        margin-top: 20px;
      }
    `,
  ],
})
export class ProductContext {
  readonly showSales = input(false);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly productId = validCatalogId(this.params.get('productId'))
    ? this.params.get('productId')
    : null;
  readonly variantId = validCatalogId(this.params.get('variantId'))
    ? this.params.get('variantId')
    : null;
  readonly back = {
    variant: this.variantId,
    search: (this.params.get('catalogSearch') ?? '').slice(0, 160),
    categoryId: this.params.get('catalogCategory') ?? '',
    status: this.params.get('catalogStatus') ?? '',
    page: this.params.get('catalogPage') ?? 0,
    view: this.params.get('catalogView') ?? 'grid',
  };
  private request?: Subscription;
  readonly row = signal<Performance | null>(null);
  readonly loading = signal(false);
  readonly money = formatMoney;
  range: { startDate: string; endDate: string; currencyCode: string } | null = null;
  constructor() {
    const api = inject(AnalyticsApi),
      session = inject(SessionService),
      destroy = inject(DestroyRef);
    const route = inject(ActivatedRoute);
    effect(() => {
      const value = session.value();
      if (value?.mode === 'NORMAL' && !value.authenticated) {
        this.request?.unsubscribe();
        this.row.set(null);
        this.loading.set(false);
      }
    });
    if (route.snapshot.routeConfig?.path === 'analytics' && this.productId && this.variantId) {
      const q = {
        ...insightWindow(initialWindow(365, session.value()?.mode === 'DEMO'), this.params),
        search: (this.params.get('search') ?? '').slice(0, 100),
        sort: 'NET_DESC',
        granularity: 'MONTH',
      };
      this.loading.set(true);
      this.request = api
        .products(q, 0, this.productId)
        .pipe(takeUntilDestroyed(destroy))
        .subscribe({
          next: (r) => {
            this.range = r.range;
            this.row.set(
              r.results.content.find(
                (row) => row.productId === this.productId && row.variantId === this.variantId,
              ) ?? null,
            );
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
    }
  }
}
