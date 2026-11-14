import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Optimization } from './optimization';
import { Evaluation, RecommendationStatus } from './optimization-api.service';
import { SessionService } from '../../core/session.service';
const evaluation: Evaluation = {
  variant: {
    variantId: 'v1',
    productId: 'p1',
    productName: 'Test variant',
    name: 'Standard',
    sku: 'TEST-1',
    status: 'ACTIVE',
    productStatus: 'ACTIVE',
  },
  window: { startDate: '2025-01-01', endDate: '2026-01-01', timezone: 'UTC', currencyCode: 'MAD' },
  horizonDays: 7,
  evaluationInstant: '2025-12-31T23:59:59.999999Z',
  modelVersion: 'constrained-contribution-v1',
  status: 'ACTIONABLE',
  reasons: [],
  assumptions: ['NO_CAUSAL_ELASTICITY_PROOF'],
  inputs: {
    currentPrice: '100.0000',
    unitCost: '40.0000',
    priceEffectiveFrom: '2025-12-31T00:00:00Z',
    costEffectiveFrom: '2025-10-01T00:00:00Z',
    stockCap: 10000,
    stockObservedAt: '2025-12-31T00:00:00Z',
    stockQuality: 'SNAPSHOT',
    catalogMin: '50.0000',
    catalogMax: '150.0000',
    lowerBound: '90.0000',
    upperBound: '110.0000',
    referenceUnits: '700.0000',
  },
  recommendedPrice: '90.0000',
  comparison: {
    current: { price: '100.0000', expectedUnits: '700.0000', estimatedContribution: '42000.0000' },
    candidate: { price: '90.0000', expectedUnits: '864.1975', estimatedContribution: '43209.8765' },
    estimatedUplift: '1209.8765',
    estimatedUpliftPercent: '2.8807',
  },
  elasticity: {
    status: 'READY',
    method: 'TEST',
    identification: {
      status: 'CONDITIONAL_ASSOCIATION_ONLY',
      calendarPriceR2: 0.1,
      residualLogPriceSd: 0.16,
      uncertaintyStatus: 'UNCERTAINTY_UNAVAILABLE',
      promotionControl: 'PROMOTION_LABELS_UNAVAILABLE',
    },
    estimate: -2,
    logRmse: 0.01,
    samples: 365,
    reasons: ['OBSERVATIONAL_ASSOCIATION'],
  },
  forecast: {
    status: 'READY',
    method: 'TEST',
    target: 'OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY',
    assumedPrice: '100.0000',
    totalUnits: '700.0000',
    daily: [],
    reasons: [],
  },
  backtests: [],
  sensitivity: [
    { price: '90.0000', expectedUnits: '864.1975', estimatedContribution: '43209.8765' },
    { price: '110.0000', expectedUnits: '578.5124', estimatedContribution: '40495.8678' },
  ],
};
describe('Pricing Recommendations', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Optimization],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function overview(rows: Evaluation[] = [evaluation], page = 0) {
    const counts: Record<RecommendationStatus, number> = {
      ACTIONABLE: 0,
      DIAGNOSTIC_ONLY: 0,
      INSUFFICIENT_DATA: 0,
      UNRELIABLE_ELASTICITY: 0,
      MISSING_COST: 0,
      MISSING_PRICE: 0,
      INACTIVE_VARIANT: 0,
      INVALID_CONSTRAINTS: 0,
      UNAVAILABLE_FORECAST: 0,
    };
    for (const row of rows) counts[row.status]++;
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/overview'))
      .flush({
        window: evaluation.window,
        horizonDays: 7,
        countScope: 'CURRENT_PAGE',
        statusCounts: counts,
        results: {
          content: rows,
          page,
          size: 10,
          totalElements: rows.length ? 30 : 0,
          totalPages: rows.length ? 3 : 0,
        },
      });
  }
  function detail(row = evaluation) {
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/recommendation'))
      .flush(row);
  }
  it('loads page-scoped counts and renders actionable comparison with accessible exact sensitivity', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Checking this page of products');
    overview();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('this page only');
    expect(f.nativeElement.querySelector('.row-price').textContent).toContain('100.00 MAD');
    expect(f.nativeElement.querySelector('.row-price').textContent).toContain('90.00 MAD');
    expect(f.nativeElement.querySelector('.row-impact').textContent).toContain('1,209.88 MAD');
    const compare = f.nativeElement.querySelector('app-pricing-result button');
    expect(compare.textContent.trim()).toBe('Compare prices');
    expect(compare.getAttribute('aria-label')).toContain('Compare prices');
    f.componentInstance.select('v1');
    detail();
    await f.whenStable();
    expect(f.nativeElement.querySelector('.price-change').textContent).toContain('90');
    expect(f.nativeElement.textContent).toContain('Estimated contribution');
    expect(f.nativeElement.querySelector('dialog')).toBeNull();
    f.componentInstance.openWhy();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No calibrated uncertainty interval available');
    expect(f.nativeElement.textContent).toContain('Observational association only');
    expect(f.nativeElement.textContent).toContain('1,209.8765');
    expect(f.nativeElement.querySelector('svg[role="img"] title').textContent).toContain(
      'Conditional contribution',
    );
    expect(f.nativeElement.querySelector('[aria-label="Sensitivity data table"]')).toBeTruthy();
    expect(f.nativeElement.textContent).not.toContain('Apply price');
  });
  it('suppresses unsafe recommendation fields even if supplied and shows seasonal abstention', async () => {
    const unsafe = {
      ...evaluation,
      status: 'DIAGNOSTIC_ONLY' as const,
      reasons: ['SEASONAL_OR_CALENDAR_CONFOUNDING'],
    };
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview([unsafe]);
    await f.whenStable();
    const list = f.nativeElement.textContent;
    expect(list).toContain('Withheld · uncertain');
    expect(f.nativeElement.querySelector('.row-price')).toBeNull();
    expect(f.nativeElement.querySelector('.row-impact')).toBeNull();
    expect(list).not.toContain('90.0000');
    f.componentInstance.select('v1');
    detail(unsafe);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No reliable price suggestion yet');
    f.componentInstance.openWhy();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Prices mostly changed with the calendar');
    expect(f.nativeElement.textContent).toContain('Withheld · uncertain');
    expect(f.nativeElement.textContent).not.toContain('Conditional suggested price');
    expect(
      f.nativeElement.querySelector('[aria-label="Contribution comparison table"]'),
    ).toBeNull();
    expect(f.nativeElement.querySelector('svg')).toBeNull();
  });
  it('shows empty normal data without fabricated suggestions', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview([]);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No variants to evaluate');
    expect(f.nativeElement.querySelector('svg')).toBeNull();
  });
  it('handles loading failure and retry then missing cost detail', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/overview'))
      .flush({ message: 'Pricing unavailable.' }, { status: 503, statusText: 'Unavailable' });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Pricing unavailable.');
    (f.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    const missing = {
      ...evaluation,
      status: 'MISSING_COST' as const,
      reasons: ['MISSING_OR_STALE_EFFECTIVE_COST'],
      inputs: { ...evaluation.inputs, unitCost: null },
      recommendedPrice: null,
      comparison: null,
      sensitivity: [],
    };
    overview([missing]);
    await f.whenStable();
    f.componentInstance.select('v1');
    detail(missing);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Withheld · needs inputs');
    f.componentInstance.openWhy();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Unavailable');
    expect(f.nativeElement.querySelector('.candidate')).toBeNull();
  });
  it('applies shared dates/horizon/search and paginates without mutating requests', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview();
    await f.whenStable();
    f.componentInstance.filters.patchValue({ search: 'coffee', horizonDays: 30 });
    f.componentInstance.preset();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne((r) => r.url.endsWith('/overview'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('endDate')).toBe('2026-01-01');
    expect(request.request.params.get('horizonDays')).toBe('30');
    request.flush({
      window: evaluation.window,
      horizonDays: 30,
      statusCounts: {},
      results: { content: [], page: 0, totalElements: 21, totalPages: 3 },
    });
    await f.whenStable();
    f.componentInstance.changePage(1);
    const page = http.expectOne((r) => r.url.endsWith('/overview'));
    expect(page.request.params.get('page')).toBe('1');
    expect(page.request.params.get('search')).toBe('coffee');
    page.flush({
      window: evaluation.window,
      horizonDays: 30,
      statusCounts: {},
      results: { content: [], page: 1, totalElements: 21, totalPages: 3 },
    });
    await f.whenStable();
  });
  it('cancels stale responses and validates date windows', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    const old = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/overview'));
    f.componentInstance.preset();
    expect(old.cancelled).toBe(true);
    overview();
    await f.whenStable();
    f.componentInstance.filters.patchValue({ startDate: '2025-01-01', endDate: '2025-01-02' });
    f.componentInstance.apply();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('28–731');
  });
  it('cancels an active catalog check and removes old suggestions when a filter changes', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview();
    await f.whenStable();
    f.componentInstance.checkCatalog();
    const first = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/overview'),
    );
    expect(first.request.params.get('horizonDays')).toBe('30');
    first.flush({
      results: {
        content: Array.from({ length: 10 }, (_, i) => ({
          ...evaluation,
          variant: { ...evaluation.variant, variantId: 'scan-' + i },
        })),
        page: 0,
        size: 10,
        totalElements: 20,
        totalPages: 2,
      },
    });
    const pending = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.params.get('page') === '1',
    );
    expect(f.componentInstance.suggestions().length).toBe(10);
    f.componentInstance.filters.controls.horizonDays.setValue(14);
    await f.whenStable();
    expect(pending.cancelled).toBe(true);
    expect(f.componentInstance.suggestions()).toEqual([]);
    expect(f.componentInstance.catalogCheck.state()).toBe('idle');
    expect(f.componentInstance.needsApply()).toBe(true);
    expect(f.nativeElement.textContent).not.toContain(
      'No reliable price suggestions from this catalog check',
    );
  });
  it('clears protected catalog results and cancels pending checks on session loss', async () => {
    const session = TestBed.inject(SessionService);
    session.value.set({ mode: 'NORMAL', authenticated: true, readOnly: false, username: 'owner' });
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview();
    await f.whenStable();
    f.componentInstance.checkCatalog();
    const pending = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/overview'),
    );
    session.clear();
    await f.whenStable();
    expect(pending.cancelled).toBe(true);
    expect(f.componentInstance.rows()).toEqual([]);
    expect(f.componentInstance.detail()).toBeNull();
  });
  it('opens the exact supported variant deep link without saving an evaluation', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        queryParamMap: of(
          convertToParamMap({
            variantId: id,
            search: 'TEST-1',
            startDate: '2025-01-01',
            endDate: '2026-01-01',
            horizonDays: '14',
          }),
        ),
        snapshot: {
          queryParamMap: convertToParamMap({
            variantId: id,
            search: 'TEST-1',
            startDate: '2025-01-01',
            endDate: '2026-01-01',
            horizonDays: '14',
          }),
        },
      },
    });
    const f = TestBed.createComponent(Optimization),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http
      .expectOne((r) => r.url.endsWith('/overview'))
      .flush({
        results: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
        statusCounts: {},
      });
    const request = http.expectOne((r) => r.url.endsWith('/' + id + '/recommendation'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('horizonDays')).toBe('14');
    request.flush({ ...evaluation, variant: { ...evaluation.variant, variantId: id } });
    await f.whenStable();
    expect(f.componentInstance.selectedId()).toBe(id);
    http.expectNone((r) => r.method !== 'GET');
  });
  it('filters loaded results locally and keeps page counts separate from the global matching total', async () => {
    const f = TestBed.createComponent(Optimization),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    overview([
      evaluation,
      {
        ...evaluation,
        variant: { ...evaluation.variant, variantId: 'v2' },
        status: 'MISSING_COST',
        recommendedPrice: null,
        comparison: null,
      },
    ]);
    await f.whenStable();
    f.componentInstance.setView('actionable');
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('app-pricing-result').length).toBe(1);
    expect(f.nativeElement.textContent).toContain('this page only');
    f.componentInstance.setView('evidence');
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('app-pricing-result').length).toBe(1);
    http.expectNone(() => true);
  });
  it('reuses the loaded matching evaluation and keeps diagnostics hidden until Why', async () => {
    const session = TestBed.inject(SessionService);
    session.value.set({ mode: 'DEMO', authenticated: false, readOnly: true, username: null });
    const f = TestBed.createComponent(Optimization),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    const row = { ...evaluation, horizonDays: 30 };
    overview([row]);
    await f.whenStable();
    f.componentInstance.select('v1');
    await f.whenStable();
    http.expectNone((r) => r.url.endsWith('/recommendation'));
    expect(f.nativeElement.querySelector('dialog')).toBeNull();
    expect(f.nativeElement.querySelector('svg')).toBeNull();
    const why = [...f.nativeElement.querySelectorAll('button')].find((b: any) =>
      b.textContent.includes('Why this result?'),
    ) as HTMLButtonElement;
    why.focus();
    why.click();
    await f.whenStable();
    const dialog = f.nativeElement.querySelector('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('pricing-evidence-title');
    expect(dialog.textContent).toContain('UNCERTAINTY_UNAVAILABLE');
    http.expectNone((r) => r.method !== 'GET');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await f.whenStable();
    expect(f.nativeElement.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(why);
  });
  it('keeps an actionable-empty view helpful without claiming a catalog-wide result', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview([
      { ...evaluation, status: 'DIAGNOSTIC_ONLY', recommendedPrice: null, comparison: null },
    ]);
    await f.whenStable();
    f.componentInstance.setView('actionable');
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No matching insights in this page only');
    expect(f.nativeElement.textContent).not.toContain('Catalog check complete');
    expect(f.nativeElement.querySelector('a[href="/onboarding"]')).toBeTruthy();
  });
  it('shows a selection mismatch as unavailable rather than another variant price', async () => {
    const f = TestBed.createComponent(Optimization);
    f.detectChanges();
    overview();
    await f.whenStable();
    f.componentInstance.select('other', true);
    detail();
    await f.whenStable();
    expect(f.componentInstance.detail()).toBeNull();
    expect(f.nativeElement.textContent).toContain('did not match');
  });
});
