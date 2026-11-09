import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { SessionService } from '../../core/session.service';
import { ModalFocus } from '../../core/confirmation';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { StatusPill } from '../../shared/merchant/foundation';
import { ProductThumbnail } from '../../shared/merchant/product-thumbnail';
import { ProductContext, validCatalogId } from '../../shared/merchant/product-context';
import { PriceComparison, PricingExample } from '../../shared/merchant/decision-summary';
import {
  actionable,
  pricingGroup,
  pricingLabel,
  pricingReason,
} from '../../shared/merchant/pricing-presentation';
import { insightWindow } from '../../shared/merchant/insight-window';
import { initialWindow } from '../analytics/analytics-api.service';
import { apiError } from '../catalog/services/catalog-api.service';
import { CatalogCheck } from './catalog-check';
import {
  Evaluation,
  OptimizationApi,
  OptimizationOverview,
  OptimizationQuery,
} from './optimization-api.service';
import { PricingResult } from './pricing-result';
import { PricingEvidence } from './pricing-evidence';
@Component({
  selector: 'app-optimization',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    ModalFocus,
    ZardButtonComponent,
    ZardInputComponent,
    StatusPill,
    ProductThumbnail,
    ProductContext,
    PriceComparison,
    PricingExample,
    PricingResult,
    PricingEvidence,
  ],
  providers: [CatalogCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './optimization.html',
  styleUrl: './optimization.css',
})
export class Optimization {
  readonly session = inject(SessionService);
  readonly isDemo = () => this.session.value()?.mode === 'DEMO';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(OptimizationApi);
  private readonly destroy = inject(DestroyRef);
  private readonly initial = insightWindow(
    initialWindow(365, this.isDemo()),
    this.route.snapshot.queryParamMap,
  );
  readonly catalogCheck = inject(CatalogCheck);
  readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    startDate: new FormControl(this.initial.startDate, { nonNullable: true }),
    endDate: new FormControl(this.initial.endDate, { nonNullable: true }),
    horizonDays: new FormControl(this.initial.horizonDays, { nonNullable: true }),
  });
  private applied: OptimizationQuery = this.filters.getRawValue();
  private key = '';
  private request?: Subscription;
  private detailRequest?: Subscription;
  private focusTimer?: ReturnType<typeof setTimeout>;
  private detailTrigger?: HTMLElement;
  page = 0;
  readonly result = signal<OptimizationOverview | null>(null);
  readonly detail = signal<Evaluation | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly needsApply = signal(false);
  readonly view = signal('all');
  readonly group = signal('all');
  readonly whyOpen = signal(false);
  readonly closeWarning = signal(false);
  readonly evaluationPanel = viewChild<ElementRef<HTMLElement>>('evaluationPanel');
  readonly evidence = viewChild(PricingEvidence);
  readonly label = pricingLabel;
  readonly reason = pricingReason;
  readonly eligible = actionable;
  readonly rows = computed(() =>
    this.catalogCheck.state() === 'idle'
      ? (this.result()?.results.content ?? [])
      : this.catalogCheck.evaluations(),
  );
  readonly suggestions = computed(() => this.rows().filter(actionable));
  readonly withheld = computed(() => this.rows().filter((r) => !actionable(r)));
  readonly visibleRows = computed(() =>
    this.rows().filter(
      (r) =>
        (this.view() === 'all' ||
          (this.view() === 'actionable' ? actionable(r) : !actionable(r))) &&
        (this.group() === 'all' || pricingGroup(r) === this.group()),
    ),
  );
  readonly scope = () =>
    this.catalogCheck.state() === 'idle' ? 'this page only' : 'loaded results only';
  constructor() {
    this.destroy.onDestroy(() => clearTimeout(this.focusTimer));
    effect((onCleanup) => {
      if (this.whyOpen()) {
        const before = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        onCleanup(() => (document.body.style.overflow = before));
      }
    });
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => this.hydrate(params));
    this.filters.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.request?.unsubscribe();
      this.catalogCheck.reset();
      this.result.set(null);
      this.close(false, false);
      this.loading.set(false);
      this.error.set('');
      this.needsApply.set(true);
    });
    this.filters.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (this.needsApply()) this.apply(true);
      });
    effect(() => {
      const s = this.session.value();
      if (s?.mode === 'NORMAL' && !s.authenticated)
        untracked(() => {
          this.request?.unsubscribe();
          this.catalogCheck.reset();
          this.result.set(null);
          this.close(false, false);
        });
    });
  }
  private hydrate(params: ParamMap) {
    const dates = insightWindow(initialWindow(365, this.isDemo()), params);
    const q = { ...dates, search: (params.get('search') ?? '').slice(0, 100) };
    const p = Number(params.get('page'));
    this.page = Number.isSafeInteger(p) && p >= 0 && p <= 100000 ? p : 0;
    this.view.set(
      ['all', 'actionable', 'evidence'].includes(params.get('pricingView') ?? '')
        ? params.get('pricingView')!
        : 'all',
    );
    this.group.set(
      ['all', 'actionable', 'uncertain', 'history', 'evidence', 'inactive', 'unavailable'].includes(
        params.get('pricingStatus') ?? '',
      )
        ? params.get('pricingStatus')!
        : 'all',
    );
    const key = JSON.stringify([q.startDate, q.endDate, q.horizonDays, q.search, this.page]);
    if (key !== this.key) {
      this.key = key;
      this.filters.setValue(q, { emitEvent: false });
      this.applied = q;
      this.catalogCheck.reset();
      this.close(false, false);
      this.needsApply.set(false);
      this.load();
    }
    const id = params.get('variantId');
    if (validCatalogId(id) && id !== this.selectedId()) this.select(id, false, false);
    else if (!id && this.selectedId()) this.close(false, false);
  }
  private sync(replaceUrl = false) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.applied,
        page: this.page,
        pricingView: this.view(),
        pricingStatus: this.group(),
        variantId: this.selectedId(),
      },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
  setView(value: string) {
    this.view.set(value);
    this.sync(true);
  }
  setGroup(value: string) {
    this.group.set(value);
    this.sync(true);
  }
  private prepare() {
    const q = this.filters.getRawValue(),
      days =
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
    this.close(false, false);
    this.error.set('');
    this.needsApply.set(false);
    this.applied = { ...q, horizonDays: Number(q.horizonDays) };
    this.page = 0;
    this.key = JSON.stringify([
      this.applied.startDate,
      this.applied.endDate,
      this.applied.horizonDays,
      this.applied.search,
      0,
    ]);
    return true;
  }
  apply(replaceUrl = false) {
    if (!this.prepare()) return;
    this.load();
    this.sync(replaceUrl);
  }
  preset() {
    this.filters.patchValue({ startDate: '2025-01-01', endDate: '2026-01-01' });
    this.apply();
  }
  reset() {
    this.filters.controls.search.setValue('', { emitEvent: false });
    this.view.set('all');
    this.group.set('all');
    this.apply();
  }
  checkCatalog() {
    if (!this.prepare()) return;
    this.loading.set(false);
    this.catalogCheck.start(this.applied);
    this.sync();
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
    const next = this.page + delta;
    if (next < 0 || next >= (this.result()?.results.totalPages ?? 0)) return;
    this.page = next;
    this.close(false, false);
    this.key = JSON.stringify([
      this.applied.startDate,
      this.applied.endDate,
      this.applied.horizonDays,
      this.applied.search,
      this.page,
    ]);
    this.load();
    this.sync();
  }
  select(id: string, force = false, syncURL = true) {
    clearTimeout(this.focusTimer);
    this.detailTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.detailRequest?.unsubscribe();
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailError.set('');
    this.whyOpen.set(false);
    const cached = !force
      ? this.rows().find(
          (r) =>
            r.variant.variantId === id &&
            r.horizonDays === this.applied.horizonDays &&
            r.window.startDate === this.applied.startDate &&
            r.window.endDate === this.applied.endDate,
        )
      : undefined;
    if (cached) {
      this.detail.set(cached);
      this.detailLoading.set(false);
    } else {
      this.detailLoading.set(true);
      this.detailRequest = this.api
        .evaluation(id, this.applied)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (r) => {
            if (r.variant.variantId === id) this.detail.set(r);
            else
              this.detailError.set(
                'The response did not match the selected variant. Retry this insight.',
              );
            this.detailLoading.set(false);
          },
          error: (e) => {
            this.detailError.set(apiError(e));
            this.detailLoading.set(false);
          },
        });
    }
    if (syncURL && validCatalogId(id)) this.sync();
    this.focusTimer = setTimeout(() => {
      if (this.selectedId() === id && !this.whyOpen())
        this.evaluationPanel()?.nativeElement.focus({ preventScroll: true });
    });
  }
  openWhy() {
    clearTimeout(this.focusTimer);
    if (this.detail() && !document.querySelector('dialog[open]')) {
      this.closeWarning.set(false);
      this.whyOpen.set(true);
    }
  }
  closeWhy() {
    if (this.evidence()?.saving()) {
      this.closeWarning.set(true);
      return;
    }
    this.whyOpen.set(false);
  }
  close(restoreFocus = false, syncURL = true) {
    const previousId = this.selectedId();
    clearTimeout(this.focusTimer);
    this.detailRequest?.unsubscribe();
    this.whyOpen.set(false);
    this.detail.set(null);
    this.selectedId.set(null);
    this.detailLoading.set(false);
    this.detailError.set('');
    if (syncURL) this.sync();
    if (restoreFocus)
      setTimeout(() => {
        const row = document.getElementById('pricing-open-' + previousId);
        if (row) row.focus();
        else if (this.detailTrigger?.isConnected) this.detailTrigger.focus();
        else document.querySelector<HTMLElement>('#pricing-results')?.focus();
      });
  }
  catalogQuery(d: Evaluation) {
    const p = this.route.snapshot.queryParamMap;
    return {
      variant: d.variant.variantId,
      search: p.get('catalogSearch') ?? '',
      categoryId: p.get('catalogCategory') ?? '',
      status: p.get('catalogStatus') ?? '',
      page: p.get('catalogPage') ?? 0,
      view: p.get('catalogView') ?? 'grid',
    };
  }
  evidenceLinks(d: Evaluation) {
    return {
      ...this.route.snapshot.queryParams,
      ...this.applied,
      productId: d.variant.productId,
      variantId: d.variant.variantId,
      search: d.variant.sku.slice(0, 100),
    };
  }
  @HostListener('window:beforeunload', ['$event']) warnPendingSave(event: BeforeUnloadEvent) {
    if (this.evidence()?.saving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
