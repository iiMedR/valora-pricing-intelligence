import { InventoryObservations } from './inventory-observations';
import { ProductPerformance } from './product-performance';
import { ProductContext } from '../../shared/merchant/product-context';
import { insightWindow } from '../../shared/merchant/insight-window';
import { ActivatedRoute } from '@angular/router';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { SessionService } from '../../core/session.service';
import { SalesChart } from '../../shared/merchant/sales-chart';
import { HelpTooltip } from '../../shared/merchant/primitives';
import { decisionNumber } from '../../shared/merchant/decision-summary';
import { initialWindow } from '../analytics/analytics-api.service';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { apiError } from '../catalog/services/catalog-api.service';
import {
  AnalyticsApi,
  AnalyticsQuery,
  Inventory,
  Overview,
  Performance,
  PerformancePage,
  Trends,
  decimalText,
  utcPreset,
} from './analytics-api.service';

@Component({
  imports: [
    ProductContext,
    ProductPerformance,
    InventoryObservations,
    ZardButtonComponent,
    ZardInputComponent,

    ReactiveFormsModule,
    RouterLink,
    SalesChart,
    HelpTooltip,
  ],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics {
  private readonly session = inject(SessionService);
  readonly isDemo = () => this.session.value()?.mode === 'DEMO';
  private readonly initial = insightWindow(
    initialWindow(30, this.isDemo()),
    inject(ActivatedRoute).snapshot.queryParamMap,
  );
  private readonly api = inject(AnalyticsApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private detailRequest?: Subscription;
  readonly filters = new FormGroup({
    startDate: new FormControl(this.initial.startDate, { nonNullable: true }),
    endDate: new FormControl(this.initial.endDate, { nonNullable: true }),
    granularity: new FormControl('MONTH', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
    sort: new FormControl('NET_DESC', { nonNullable: true }),
  });
  readonly loading = signal(true);
  readonly number = decisionNumber;
  readonly metricsDetailsOpen = signal(false);
  readonly productsDetailsOpen = signal(false);
  readonly inventoryDetailsOpen = signal(false);
  readonly error = signal('');
  readonly overview = signal<Overview | null>(null);
  readonly trends = signal<Trends | null>(null);
  readonly products = signal<PerformancePage | null>(null);
  readonly inventory = signal<Inventory | null>(null);
  readonly selectedProduct = signal<Performance | null>(null);
  readonly variants = signal<PerformancePage | null>(null);
  readonly detailError = signal('');
  readonly detailLoading = signal(false);
  readonly money = decimalText;
  page = 0;
  inventoryPage = 0;
  variantPage = 0;
  private applied = this.filters.getRawValue();
  readonly chart = computed(() => {
    const rows = this.trends()?.content ?? [];
    const values = rows.map((r) => Number(r.metrics.netSales));
    const low = Math.min(0, ...values),
      high = Math.max(0, ...values),
      span = high - low || 1;
    const y = (n: number) => 190 - ((n - low) / span) * 160;
    return {
      points: values
        .map(
          (n, i) => `${45 + (values.length < 2 ? 355 : (i / (values.length - 1)) * 710)},${y(n)}`,
        )
        .join(' '),
      zero: y(0),
      high: high.toFixed(2),
      low: low.toFixed(2),
      first: rows[0]?.date,
      last: rows.at(-1)?.date,
    };
  });
  constructor() {
    this.load();
  }
  preset(value: string) {
    this.filters.patchValue(
      value === '2025'
        ? { startDate: '2025-01-01', endDate: '2026-01-01' }
        : utcPreset(Number(value)),
    );
    this.apply();
  }
  apply() {
    const q = this.filters.getRawValue();
    const duration =
      (Date.parse(q.endDate + 'T00:00:00Z') - Date.parse(q.startDate + 'T00:00:00Z')) / 86400000;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 731) {
      this.error.set('Choose an increasing UTC date range of at most 731 days.');
      return;
    }
    this.applied = q;
    this.page = 0;
    this.inventoryPage = 0;
    this.closeVariants();
    this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = forkJoin({
      overview: this.api.overview(this.applied),
      trends: this.api.trends(this.applied),
      products: this.api.products(this.applied, this.page),
      inventory: this.api.inventory(this.applied, this.inventoryPage),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.overview.set(r.overview);
          this.trends.set(r.trends);
          this.products.set(r.products);
          this.inventory.set(r.inventory);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  changePage(delta: number, inventory = false) {
    if (inventory) this.inventoryPage += delta;
    else this.page += delta;
    this.closeVariants();
    this.load();
  }
  showVariants(product: Performance, delta = 0) {
    this.detailRequest?.unsubscribe();
    this.variantPage =
      this.selectedProduct()?.productId === product.productId ? this.variantPage + delta : 0;
    this.selectedProduct.set(product);
    this.variants.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    const q: AnalyticsQuery = { ...this.applied, search: '' };
    this.detailRequest = this.api
      .products(q, this.variantPage, product.productId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.variants.set(r);
          this.detailLoading.set(false);
        },
        error: (e) => {
          this.detailError.set(apiError(e));
          this.detailLoading.set(false);
        },
      });
  }
  closeVariants() {
    this.detailRequest?.unsubscribe();
    this.selectedProduct.set(null);
    this.variants.set(null);
    this.detailLoading.set(false);
  }
}
