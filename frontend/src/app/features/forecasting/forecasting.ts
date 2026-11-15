import { ForecastProductChoice } from './forecast-product-choice';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideCalendarDays } from '@ng-icons/lucide';
import { ProductContext, validCatalogId } from '../../shared/merchant/product-context';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { SessionService } from '../../core/session.service';
import { initialWindow } from '../analytics/analytics-api.service';
import { statusLabel, explainReason, reasonSummary } from '../../core/presentation';
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SensitivitySummary, comparisonDates } from '../../shared/merchant/decision-summary';
import { insightWindow } from '../../shared/merchant/insight-window';
import { ForecastChart } from '../../shared/merchant/forecast-chart';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { apiError } from '../catalog/services/catalog-api.service';
import { utcPreset, decimalText } from '../analytics/analytics-api.service';
import {
  ForecastApi,
  ForecastQuery,
  Overview,
  DemandDetail,
  Backtest,
  Variant,
} from './forecast-api.service';
@Component({
  imports: [
    ProductContext,
    ForecastProductChoice,
    NgIcon,
    ZardButtonComponent,
    ZardInputComponent,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    SensitivitySummary,
    ForecastChart,
  ],
  providers: [provideIcons({ lucideSearch, lucideCalendarDays })],
  templateUrl: './forecasting.html',
  styleUrl: './forecasting.css',
})
export class Forecasting {
  private readonly session = inject(SessionService);
  readonly isDemo = () => this.session.value()?.mode === 'DEMO';
  private contextSelection: string | null =
    inject(ActivatedRoute).snapshot.queryParamMap.get('variantId');
  private readonly initial = insightWindow(
    initialWindow(365, this.isDemo()),
    inject(ActivatedRoute).snapshot.queryParamMap,
  );
  readonly dates = comparisonDates;
  readonly statusLabel = statusLabel;
  readonly reasonSummary = reasonSummary;
  readonly explainReason = explainReason;
  private readonly api = inject(ForecastApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private detailRequest?: Subscription;
  readonly forecastPanel = viewChild<ElementRef<HTMLElement>>('forecastPanel');
  private forecastTrigger?: HTMLElement;
  private focusTimer?: ReturnType<typeof setTimeout>;
  readonly filters = new FormGroup({
    startDate: new FormControl(this.initial.startDate, { nonNullable: true }),
    endDate: new FormControl(this.initial.endDate, { nonNullable: true }),
    search: new FormControl(
      (inject(ActivatedRoute).snapshot.queryParamMap.get('search') ?? '').slice(0, 100),
      { nonNullable: true },
    ),
    horizonDays: new FormControl(this.initial.horizonDays, { nonNullable: true }),
  });
  readonly result = signal<Overview | null>(null);
  readonly detail = signal<DemandDetail | null>(null);
  readonly backtest = signal<Backtest | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly selected = signal<Variant | null>(null);
  readonly format = decimalText;
  page = 0;
  private applied: ForecastQuery = this.filters.getRawValue();
  readonly historyWindow = () => this.applied;
  constructor() {
    this.destroy.onDestroy(() => clearTimeout(this.focusTimer));
    this.load();
  }
  preset() {
    this.filters.patchValue({ startDate: '2025-01-01', endDate: '2026-01-01' });
    this.apply();
  }
  apply() {
    const q = this.filters.getRawValue();
    const days =
      (Date.parse(q.endDate + 'T00:00:00Z') - Date.parse(q.startDate + 'T00:00:00Z')) / 86400000;
    if (!Number.isFinite(days) || days < 28 || days > 731) {
      this.error.set('Choose 28–731 increasing UTC days.');
      return;
    }
    this.applied = q;
    this.page = 0;
    this.close();
    this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .overview(this.applied, this.page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.loading.set(false);
          if (this.contextSelection) {
            const row = r.results.content.find(
              (row) => row.variant.variantId === this.contextSelection,
            );
            this.contextSelection = null;
            if (row) this.select(row.variant);
          }
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  changePage(delta: number) {
    this.page += delta;
    this.close();
    this.load();
  }
  select(variant: Variant) {
    if (this.selected()?.variantId !== variant.variantId || !this.forecastTrigger?.isConnected)
      this.forecastTrigger =
        document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    clearTimeout(this.focusTimer);
    this.detailRequest?.unsubscribe();
    this.selected.set(variant);
    this.detail.set(null);
    this.backtest.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    this.focusTimer = setTimeout(() => {
      if (this.selected()?.variantId === variant.variantId)
        this.forecastPanel()?.nativeElement.focus();
    });
    const q = { ...this.applied, horizonDays: Number(this.filters.controls.horizonDays.value) };
    this.detailRequest = forkJoin({
      detail: this.api.demand(variant.variantId, q),
      backtest: this.api.backtest(variant.variantId, q),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.detail.set(r.detail);
          this.backtest.set(r.backtest);
          this.detailLoading.set(false);
        },
        error: (e) => {
          this.detailError.set(apiError(e));
          this.detailLoading.set(false);
        },
      });
  }
  horizon() {
    const selected = this.selected();
    if (selected) this.select(selected);
  }
  close(restoreFocus = false) {
    clearTimeout(this.focusTimer);
    if (restoreFocus && this.forecastTrigger?.isConnected) this.forecastTrigger.focus();
    this.detailRequest?.unsubscribe();
    this.selected.set(null);
    this.detail.set(null);
    this.backtest.set(null);
    this.detailLoading.set(false);
    this.detailError.set('');
  }
}
