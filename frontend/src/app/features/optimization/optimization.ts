import { SessionService } from '../../core/session.service';
import { initialWindow } from '../analytics/analytics-api.service';
import { statusLabel, explainReason, reasonSummary } from '../../core/presentation';
import { EvaluationHistory } from './evaluation-history';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { apiError } from '../catalog/services/catalog-api.service';
import { decimalText, utcPreset } from '../analytics/analytics-api.service';
import {
  OptimizationApi,
  OptimizationQuery,
  OptimizationOverview,
  Evaluation,
} from './optimization-api.service';
@Component({
  imports: [EvaluationHistory, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './optimization.html',
  styleUrl: './optimization.css',
})
export class Optimization {
  private readonly session = inject(SessionService);
  readonly isDemo = () => this.session.value()?.mode === 'DEMO';
  private readonly initial = initialWindow(365, this.isDemo());
  readonly statusLabel = statusLabel;
  readonly reasonSummary = reasonSummary;
  readonly explainReason = explainReason;
  private readonly api = inject(OptimizationApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private detailRequest?: Subscription;
  readonly filters = new FormGroup({
    startDate: new FormControl(this.initial.startDate, { nonNullable: true }),
    endDate: new FormControl(this.initial.endDate, { nonNullable: true }),
    horizonDays: new FormControl(7, { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
  });
  private applied: OptimizationQuery = this.filters.getRawValue();
  page = 0;
  readonly result = signal<OptimizationOverview | null>(null);
  readonly detail = signal<Evaluation | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly money = decimalText;
  readonly otherCount = computed(() => {
    const r = this.result();
    return r
      ? r.results.content.length -
          r.statusCounts.ACTIONABLE -
          r.statusCounts.DIAGNOSTIC_ONLY -
          r.statusCounts.INSUFFICIENT_DATA -
          r.statusCounts.MISSING_COST
      : 0;
  });
  readonly chart = computed(() => {
    const points = this.detail()?.sensitivity ?? [];
    const max = Math.max(1, ...points.map((p) => Number(p.estimatedContribution)));
    return {
      points: points
        .map(
          (p, i) =>
            `${40 + (i / Math.max(1, points.length - 1)) * 720},${190 - (Number(p.estimatedContribution) / max) * 160}`,
        )
        .join(' '),
      max: max.toFixed(2),
      first: points[0]?.price,
      last: points.at(-1)?.price,
    };
  });
  constructor() {
    this.load();
  }
  reason(value: string) {
    return explainReason(value);
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
      this.error.set('Choose an increasing UTC window of 28–731 days.');
      return;
    }
    this.applied = { ...q, horizonDays: Number(q.horizonDays) };
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
  select(id: string) {
    this.detailRequest?.unsubscribe();
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    this.detailRequest = this.api
      .evaluation(id, this.applied)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.detail.set(r);
          this.detailLoading.set(false);
        },
        error: (e) => {
          this.detailError.set(apiError(e));
          this.detailLoading.set(false);
        },
      });
  }
  close() {
    this.detailRequest?.unsubscribe();
    this.detail.set(null);
    this.selectedId.set(null);
    this.detailLoading.set(false);
    this.detailError.set('');
  }
}
