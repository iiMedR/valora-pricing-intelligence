import { ProductContext, validCatalogId } from '../../shared/merchant/product-context';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { SessionService } from '../../core/session.service';
import { initialWindow } from '../analytics/analytics-api.service';
import { statusLabel, explainReason, reasonSummary } from '../../core/presentation';
import { EvaluationHistory } from './evaluation-history';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PriceComparison, PricingExample } from '../../shared/merchant/decision-summary';
import { insightWindow } from '../../shared/merchant/insight-window';
import { CatalogCheck } from './catalog-check';
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
  imports: [
    ProductContext,
    ZardButtonComponent,
    ZardInputComponent,
    EvaluationHistory,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    PriceComparison,
    PricingExample,
  ],
  providers: [CatalogCheck],
  templateUrl: './optimization.html',
  styleUrl: './optimization.css',
})
export class Optimization {
  private readonly session = inject(SessionService);
  readonly isDemo = () => this.session.value()?.mode === 'DEMO';
  private contextSelection: string | null =
    inject(ActivatedRoute).snapshot.queryParamMap.get('variantId');
  private readonly initial = insightWindow(
    initialWindow(365, this.isDemo()),
    inject(ActivatedRoute).snapshot.queryParamMap,
  );
  readonly catalogCheck = inject(CatalogCheck);
  readonly statusLabel = statusLabel;
  readonly reasonSummary = reasonSummary;
  readonly explainReason = explainReason;
  private readonly api = inject(OptimizationApi);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private detailRequest?: Subscription;
  readonly evaluationPanel = viewChild<ElementRef<HTMLElement>>('evaluationPanel');
  private detailTrigger?: HTMLElement;
  private focusTimer?: ReturnType<typeof setTimeout>;
  readonly filters = new FormGroup({
    startDate: new FormControl(this.initial.startDate, { nonNullable: true }),
    endDate: new FormControl(this.initial.endDate, { nonNullable: true }),
    horizonDays: new FormControl(this.initial.horizonDays, { nonNullable: true }),
    search: new FormControl(
      (inject(ActivatedRoute).snapshot.queryParamMap.get('search') ?? '').slice(0, 100),
      { nonNullable: true },
    ),
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
  readonly needsApply = signal(false);
  readonly rows = computed(() =>
    this.catalogCheck.state() === 'idle'
      ? (this.result()?.results.content ?? [])
      : this.catalogCheck.evaluations(),
  );
  readonly suggestions = computed(() =>
    this.rows().filter(
      (row) =>
        row.status === 'ACTIONABLE' && row.comparison !== null && row.recommendedPrice !== null,
    ),
  );
  readonly withheld = computed(() =>
    this.rows().filter(
      (row) =>
        row.status !== 'ACTIONABLE' || row.comparison === null || row.recommendedPrice === null,
    ),
  );
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
    const max = Math.max(0, ...points.map((p) => Number(p.estimatedContribution)));
    const min = Math.min(0, ...points.map((p) => Number(p.estimatedContribution)));
    const span = max - min || 1;
    const first = Number(points[0]?.price),
      last = Number(points.at(-1)?.price);
    const x = (price: number) =>
      40 + (last === first ? 360 : ((price - first) / (last - first)) * 720);
    const y = (value: number) => 190 - ((value - min) / span) * 160;
    const reference = this.detail()?.inputs.currentPrice;
    return {
      points: points
        .map((p) => `${x(Number(p.price))},${y(Number(p.estimatedContribution))}`)
        .join(' '),
      dots: points.map((p) => ({
        ...p,
        x: x(Number(p.price)),
        y: y(Number(p.estimatedContribution)),
      })),
      zero: y(0),
      referenceX:
        reference !== null &&
        reference !== undefined &&
        Number(reference) >= first &&
        Number(reference) <= last
          ? x(Number(reference))
          : null,
      max: max.toFixed(2),
      min: min.toFixed(2),
      first: points[0]?.price,
      last: points.at(-1)?.price,
    };
  });
  constructor() {
    this.destroy.onDestroy(() => clearTimeout(this.focusTimer));
    this.filters.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.request?.unsubscribe();
      this.catalogCheck.reset();
      this.result.set(null);
      this.close();
      this.loading.set(false);
      this.error.set('');
      this.needsApply.set(true);
    });
    effect(() => {
      const session = this.session.value();
      if (session?.mode === 'NORMAL' && !session.authenticated) {
        this.request?.unsubscribe();
        this.catalogCheck.reset();
        this.result.set(null);
        this.close();
      }
    });
    this.load();
    if (validCatalogId(this.contextSelection)) {
      this.select(this.contextSelection);
      this.contextSelection = null;
    }
  }
  reason(value: string) {
    return explainReason(value);
  }
  preset() {
    this.filters.patchValue({ startDate: '2025-01-01', endDate: '2026-01-01' });
    this.apply();
  }
  apply() {
    if (!this.prepare()) return;
    this.load();
  }
  private prepare() {
    const q = this.filters.getRawValue();
    const days =
      (Date.parse(q.endDate + 'T00:00:00Z') - Date.parse(q.startDate + 'T00:00:00Z')) / 86400000;
    if (!Number.isFinite(days) || days < 28 || days > 731) {
      this.error.set('Choose an increasing UTC window of 28–731 days.');
      return false;
    }
    if (![7, 14, 30].includes(Number(q.horizonDays))) {
      this.error.set('Choose 7, 14 or 30 days.');
      return false;
    }
    this.request?.unsubscribe();
    this.catalogCheck.reset();
    this.result.set(null);
    this.error.set('');
    this.needsApply.set(false);
    this.applied = { ...q, horizonDays: Number(q.horizonDays) };
    this.page = 0;
    this.close();
    return true;
  }
  checkCatalog() {
    if (!this.prepare()) return;
    this.loading.set(false);
    this.catalogCheck.start(this.applied);
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
    if (this.selectedId() !== id || !this.detailTrigger?.isConnected)
      this.detailTrigger =
        document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    clearTimeout(this.focusTimer);
    this.detailRequest?.unsubscribe();
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    this.focusTimer = setTimeout(() => {
      if (this.selectedId() === id) this.evaluationPanel()?.nativeElement.focus();
    });
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
  close(restoreFocus = false) {
    clearTimeout(this.focusTimer);
    if (restoreFocus && this.detailTrigger?.isConnected) this.detailTrigger.focus();
    this.detailRequest?.unsubscribe();
    this.detail.set(null);
    this.selectedId.set(null);
    this.detailLoading.set(false);
    this.detailError.set('');
  }
}
