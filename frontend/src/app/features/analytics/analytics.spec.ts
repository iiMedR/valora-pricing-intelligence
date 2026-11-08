import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Analytics } from './analytics';
import { Metrics, Performance, decimalText, utcPreset } from './analytics-api.service';

const metrics: Metrics = {
  grossSales: '38.4936',
  refundAmount: '6.0000',
  netSales: '32.4936',
  unitsSold: 4,
  unitsRefunded: 1,
  orders: 1,
  grossAverageOrderValue: '38.4936',
  salesLines: 2,
  knownCostLines: 1,
  refundEvents: 2,
  knownCostRefundEvents: 2,
  knownCostSales: '19.2468',
  knownCostRefunds: '6.0000',
  knownCostNetSales: '13.2468',
  historicalSoldCost: '6.0000',
  knownContributionBeforeReturnRecovery: '7.2468',
  knownContributionMarginPercent: '54.7060',
  salesCostCoveragePercent: '50.0000',
  costCoverageState: 'PARTIAL',
};
const product: Performance = {
  productId: 'p1',
  variantId: null,
  name: 'Archived linen',
  sku: null,
  status: 'ARCHIVED',
  productStatus: 'ARCHIVED',
  metrics,
};
const range = {
  startDate: '2025-01-01',
  endDate: '2026-01-01',
  currencyCode: 'MAD',
  timezone: 'UTC',
};
describe('Analytics', () => {
  // jsdom has no layout observer; actual chart sizing/tooltips are checked in Chrome.
  beforeEach(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    ),
  );
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Analytics],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function flush(m = metrics, rows: Performance[] = [product], total = 21, page = 0) {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith('/overview')).flush({ range, metrics: m });
    http
      .expectOne((r) => r.url.endsWith('/trends'))
      .flush({ range, granularity: 'MONTH', content: [{ date: '2025-01-01', metrics: m }] });
    http
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({
        range,
        results: {
          content: rows,
          page,
          size: 10,
          totalElements: total,
          totalPages: Math.ceil(total / 10),
        },
      });
    http
      .expectOne((r) => r.url.endsWith('/inventory'))
      .flush({
        range,
        asOf: '2026-01-01T00:00:00Z',
        staleAfterHours: 24,
        summary: { variants: 21, stockouts: 1, unknown: 1, uncertain: 0, stale: 1 },
        results: {
          content: [
            {
              productId: 'p1',
              variantId: 'v1',
              productName: 'Archived linen',
              name: 'Standard',
              sku: 'OLD-1',
              status: 'ARCHIVED',
              productStatus: 'ARCHIVED',
              quantityAvailable: null,
              observedAt: null,
              stockState: 'UNKNOWN',
              stale: false,
            },
            {
              productId: 'p2',
              variantId: 'v2',
              productName: 'Jar',
              name: 'Standard',
              sku: 'JAR',
              status: 'ACTIVE',
              productStatus: 'ACTIVE',
              quantityAvailable: 0,
              observedAt: '2025-01-01T00:00:00Z',
              stockState: 'KNOWN_STOCKOUT',
              stale: true,
            },
          ],
          page: 0,
          size: 10,
          totalElements: 21,
          totalPages: 3,
        },
      });
  }
  it('loads real API results, partial coverage, archived status, exact money and accessible chart', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Loading analytics');
    flush();
    await f.whenStable();
    const text = f.nativeElement.textContent;
    expect(text).toContain('32.4936');
    expect(text).toContain('50.0000%');
    expect(text).toContain('PARTIAL');
    expect(text).toContain('ARCHIVED');
    expect(text).toContain('Unknown');
    expect(text).toContain('KNOWN_STOCKOUT');
    expect(text).toContain('Stale');
    expect(f.nativeElement.querySelector('z-chart')).toBeTruthy();
    expect(f.nativeElement.querySelector('[aria-label="Net sales data"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('[aria-label="Trend data table"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('[aria-label="Product performance table"]').tabIndex).toBe(
      0,
    );
  });
  it('reports known zero and undefined ratios for empty activity without fake data', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    flush(
      {
        ...metrics,
        grossSales: '0.0000',
        refundAmount: '0.0000',
        netSales: '0.0000',
        orders: 0,
        salesLines: 0,
        refundEvents: 0,
        knownContributionBeforeReturnRecovery: null,
        knownContributionMarginPercent: null,
        grossAverageOrderValue: null,
        salesCostCoveragePercent: null,
        costCoverageState: 'NO_ACTIVITY',
      },
      [],
      0,
    );
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No sales activity');
    expect(f.nativeElement.textContent).toContain('Unavailable');
    expect(f.nativeElement.textContent).toContain('No products match');
  });
  it('applies dates and granularity consistently and rejects reversed ranges', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    flush();
    await f.whenStable();
    f.componentInstance.preset('2025');
    const requests = TestBed.inject(HttpTestingController).match((r) =>
      r.url.includes('/analytics/'),
    );
    expect(requests.length).toBe(4);
    for (const r of requests) {
      expect(r.request.params.get('startDate')).toBe('2025-01-01');
      expect(r.request.params.get('endDate')).toBe('2026-01-01');
    }
    requests[0].flush({}, { status: 503, statusText: 'Unavailable' });
    await f.whenStable();
    f.componentInstance.filters.patchValue({ startDate: '2026-01-01', endDate: '2025-01-01' });
    f.componentInstance.apply();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('increasing UTC');
  });
  it('shows backend failure and retries without presenting stale reports as current', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    const req = TestBed.inject(HttpTestingController).match((r) => r.url.includes('/analytics/'));
    req[0].flush({ message: 'Analytics unavailable.' }, { status: 500, statusText: 'Failure' });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Analytics unavailable.');
    expect(f.nativeElement.querySelector('.kpi-grid')).toBeNull();
    (f.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    flush();
    await f.whenStable();
    expect(f.nativeElement.querySelector('.kpi-grid')).toBeTruthy();
  });
  it('paginates searches with stable filters and drills down variant history', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    flush();
    await f.whenStable();
    f.componentInstance.filters.patchValue({ search: 'linen', sort: 'NAME_ASC' });
    f.componentInstance.apply();
    flush();
    await f.whenStable();
    f.componentInstance.changePage(1);
    const http = TestBed.inject(HttpTestingController);
    const products = http.expectOne((r) => r.url.endsWith('/products'));
    expect(products.request.params.get('page')).toBe('1');
    expect(products.request.params.get('search')).toBe('linen');
    expect(products.request.params.get('sort')).toBe('NAME_ASC');
    products.flush({
      range,
      results: { content: [product], page: 1, size: 10, totalElements: 21, totalPages: 3 },
    });
    http.expectOne((r) => r.url.endsWith('/overview')).flush({ range, metrics });
    http
      .expectOne((r) => r.url.endsWith('/trends'))
      .flush({ range, granularity: 'DAY', content: [] });
    http
      .expectOne((r) => r.url.endsWith('/inventory'))
      .flush({
        range,
        asOf: '2026-01-01T00:00:00Z',
        summary: { variants: 0, stockouts: 0, unknown: 0, uncertain: 0, stale: 0 },
        results: { content: [], page: 0, totalPages: 0, totalElements: 0 },
      });
    await f.whenStable();
    f.componentInstance.showVariants(product);
    const detail = http.expectOne((r) => r.url.endsWith('/products/p1/variants'));
    expect(detail.request.params.get('search')).toBe('');
    detail.flush({
      range,
      results: {
        content: [{ ...product, variantId: 'v1', sku: 'LINEN-1' }],
        page: 0,
        totalPages: 1,
      },
    });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('LINEN-1');
    expect(
      f.nativeElement.querySelector('a[href="/products/p1/variants/v1/history"]'),
    ).toBeTruthy();
  });
  it('cancels superseded range requests so older responses cannot overwrite a new report', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    const old = TestBed.inject(HttpTestingController).match((r) => r.url.includes('/analytics/'));
    f.componentInstance.preset('2025');
    expect(old.every((r) => r.cancelled)).toBe(true);
    flush();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('32.4936');
  });
  it('formats money without Number precision loss and uses UTC presets across offsets', () => {
    expect(decimalText('999999999999999.1234')).toBe('999,999,999,999,999.1234');
    expect(decimalText('-6.0000')).toBe('-6.0000');
    expect(decimalText(null)).toBe('Unavailable');
    expect(utcPreset(30, new Date('2025-02-01T23:30:00-03:00'))).toEqual({
      startDate: '2025-01-04',
      endDate: '2025-02-03',
    });
  });
  it('keeps product details open when search refreshes the report', async () => {
    const f = TestBed.createComponent(Analytics);
    f.detectChanges();
    flush();
    await f.whenStable();
    f.componentInstance.productsDetailsOpen.set(true);
    await f.whenStable();
    f.componentInstance.filters.controls.search.setValue('Coffee');
    f.componentInstance.apply();
    flush();
    await f.whenStable();
    const region = f.nativeElement.querySelector('[aria-label="Product performance table"]');
    expect(region.closest('details').open).toBe(true);
  });
});
