import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Forecasting } from './forecasting';
import { Variant, Readiness, DemandDetail } from './forecast-api.service';
const variant: Variant = {
  variantId: 'v1',
  productId: 'p1',
  productName: 'Coffee',
  name: 'Standard',
  sku: 'COFFEE-1',
  status: 'ACTIVE',
  productStatus: 'ACTIVE',
};
const readiness: Readiness = {
  status: 'READY',
  days: 365,
  eligibleDays: 365,
  unknownDays: 0,
  censoredDays: 0,
  zeroDays: 0,
  missingPriceDays: 0,
  discrepancyDays: 0,
  outlierDays: 0,
  distinctPrices: 3,
  minPrice: '83.0000',
  maxPrice: '107.9000',
  reasons: ['OBSERVATIONAL_ASSOCIATION', 'NO_CALIBRATED_INTERVAL'],
};
const detail: DemandDetail = {
  variant,
  window: { startDate: '2025-01-01', endDate: '2026-01-01', timezone: 'UTC', currencyCode: 'MAD' },
  readiness,
  elasticity: {
    status: 'READY',
    method: 'calendar-log-ols-v1',
    estimate: -2.69,
    logRmse: 0.063,
    samples: 365,
    reasons: readiness.reasons,
  },
  forecast: {
    status: 'READY',
    method: 'weekday-mean-v1',
    target: 'OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY',
    assumedPrice: '83.0000',
    totalUnits: '14.0000',
    daily: [{ date: '2026-01-01', expectedUnits: '14.0000', lower: null, upper: null }],
    reasons: ['PRICE_HELD_CONSTANT_ASSUMPTION', 'NO_CALIBRATED_INTERVAL'],
  },
  history: [
    {
      date: '2025-12-31',
      units: 20,
      returnedUnits: 1,
      listedPrice: '83.0000',
      effectivePrice: '83.0000',
      priceSource: 'REALIZED_UNIT_WEIGHTED',
      availability: 'IN_STOCK',
      observedStock: 60,
      censored: false,
      exclusions: [],
    },
  ],
};
describe('Demand Forecasting', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Forecasting],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function overview(empty = false, page = 0) {
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/overview'))
      .flush({
        results: {
          content: empty ? [] : [{ variant, readiness }],
          page,
          size: 10,
          totalElements: empty ? 0 : 30,
          totalPages: empty ? 0 : 3,
        },
      });
  }
  function demand(data = detail) {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith('/demand')).flush(data);
    http
      .expectOne((r) => r.url.endsWith('/backtest'))
      .flush({
        folds: [
          {
            cutoff: '2025-12-18',
            endDate: '2025-12-25',
            status: 'EVALUATED',
            trainingDays: 56,
            evaluatedDays: 7,
            censoredDays: 0,
            unknownDays: 0,
            actualUnits: 90,
            model: { mae: 1, wapePercent: 7, bias: 0, predictedUnits: '90.0000' },
            naive: { mae: 2, wapePercent: 10, bias: 1, predictedUnits: '95.0000' },
            reasons: ['OBSERVED_SALES_NOT_LATENT'],
          },
        ],
      });
  }
  it('loads readiness and ready forecast with accessible separate observed/forecast and honest uncertainty', async () => {
    const f = TestBed.createComponent(Forecasting);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Loading demand readiness');
    overview();
    await f.whenStable();
    f.componentInstance.select(variant);
    demand();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('-2.690');
    expect(f.nativeElement.textContent).toContain('Association is not causation');
    expect(f.nativeElement.textContent).toContain('Trailing mean');
    expect(f.nativeElement.querySelector('svg[role="img"] title').textContent).toContain(
      'Observed units',
    );
    expect(f.nativeElement.querySelector('[aria-label="Forecast values table"]')).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('No calibrated uncertainty');
  });
  it('renders an instructive empty normal catalog and no fabricated chart', async () => {
    const f = TestBed.createComponent(Forecasting);
    f.detectChanges();
    overview(true);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No variants found');
    expect(f.nativeElement.querySelector('svg')).toBeNull();
  });
  it('shows insufficient and baseline-only without a fake elasticity', async () => {
    const f = TestBed.createComponent(Forecasting);
    f.detectChanges();
    overview();
    await f.whenStable();
    f.componentInstance.select(variant);
    demand({
      ...detail,
      elasticity: {
        ...detail.elasticity,
        status: 'BASELINE_ONLY',
        estimate: null,
        reasons: ['INSUFFICIENT_PRICE_SPREAD'],
      },
      forecast: {
        ...detail.forecast,
        status: 'INSUFFICIENT_DATA',
        daily: [],
        totalUnits: null,
        reasons: ['INSUFFICIENT_RECENT_BASELINE'],
      },
    });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Unavailable');
    expect(f.nativeElement.textContent).toContain('INSUFFICIENT_RECENT_BASELINE');
    expect(f.nativeElement.textContent).toContain('BASELINE_ONLY');
    expect(f.nativeElement.querySelector('[aria-label="Forecast values table"]')).toBeNull();
  });
  it('switches horizon and preserves UTC window for both requests', async () => {
    const f = TestBed.createComponent(Forecasting);
    f.detectChanges();
    overview();
    await f.whenStable();
    f.componentInstance.preset();
    overview();
    await f.whenStable();
    f.componentInstance.select(variant);
    demand();
    await f.whenStable();
    f.componentInstance.filters.controls.horizonDays.setValue(30);
    f.componentInstance.horizon();
    const requests = TestBed.inject(HttpTestingController).match((r) =>
      r.url.includes('/variants/v1/'),
    );
    expect(requests).toHaveLength(2);
    for (const r of requests) {
      expect(r.request.params.get('horizonDays')).toBe('30');
      expect(r.request.params.get('endDate')).toBe('2026-01-01');
    }
    requests[0].flush(detail);
    requests[1].flush({ folds: [] });
    await f.whenStable();
  });
  it('paginates and searches while canceling superseded responses', async () => {
    const f = TestBed.createComponent(Forecasting);
    f.detectChanges();
    const old = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/overview'));
    f.componentInstance.preset();
    expect(old.cancelled).toBe(true);
    overview();
    await f.whenStable();
    f.componentInstance.filters.controls.search.setValue('Coffee');
    f.componentInstance.apply();
    overview();
    await f.whenStable();
    f.componentInstance.changePage(1);
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/overview'));
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('search')).toBe('Coffee');
    req.flush({ results: { content: [], page: 1, totalElements: 0, totalPages: 0 } });
    await f.whenStable();
  });
  it('handles backend error/retry and invalid windows', async () => {
    const f = TestBed.createComponent(Forecasting);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/overview'))
      .flush(
        { message: 'Demand backend unavailable.' },
        { status: 503, statusText: 'Unavailable' },
      );
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Demand backend unavailable.');
    (f.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    overview();
    await f.whenStable();
    f.componentInstance.filters.patchValue({ startDate: '2025-01-01', endDate: '2025-01-02' });
    f.componentInstance.apply();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('28–731');
  });
});
