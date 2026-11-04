import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './forecasting.html',
  styleUrl: './forecasting.css',
})
export class Forecasting {
  private readonly api = inject(ForecastApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private detailRequest?: Subscription;
  readonly filters = new FormGroup({
    startDate: new FormControl(utcPreset(365).startDate, { nonNullable: true }),
    endDate: new FormControl(utcPreset(365).endDate, { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
    horizonDays: new FormControl(7, { nonNullable: true }),
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
  readonly chart = computed(() => {
    const d = this.detail();
    const history = d?.history.slice(-90) ?? [],
      future = d?.forecast.daily ?? [];
    const max = Math.max(
      1,
      ...history.map((r) => r.units),
      ...future.map((r) => Number(r.expectedUnits)),
    );
    const n = history.length + future.length;
    const x = (i: number) => 40 + (i / Math.max(1, n - 1)) * 720,
      y = (v: number) => 190 - (v / max) * 160;
    return {
      observed: history.map((r, i) => `${x(i)},${y(r.units)}`).join(' '),
      predicted: future
        .map((r, i) => `${x(history.length + i)},${y(Number(r.expectedUnits))}`)
        .join(' '),
      censored: history.flatMap((r, i) => (r.censored ? [{ x: x(i), y: y(r.units) }] : [])),
      max: Math.ceil(max),
      first: history[0]?.date,
      last: future.at(-1)?.date ?? history.at(-1)?.date,
    };
  });
  constructor() {
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
    this.detailRequest?.unsubscribe();
    this.selected.set(variant);
    this.detail.set(null);
    this.backtest.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
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
  close() {
    this.detailRequest?.unsubscribe();
    this.selected.set(null);
    this.detail.set(null);
    this.backtest.set(null);
    this.detailLoading.set(false);
    this.detailError.set('');
  }
}
