import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Onboarding } from './onboarding';
import { VariantReadiness } from './variant-readiness';
import { Assessment, Summary, Variants } from './onboarding-api';
const window = {
  startDate: '2025-01-01',
  endDate: '2026-01-01',
  assessedAt: '2026-11-12T00:00:00Z',
  modelAsOf: '2025-12-31T23:59:59Z',
  currencyCode: 'MAD',
};
const sync = {
  demo: false,
  connected: false,
  shop: null,
  lastSuccessfulSync: null,
  latest: null,
  checkpoints: [],
  requiredScopes: [],
  liveValidation: 'LIVE_SHOPIFY_NOT_VERIFIED',
};
const summary: Summary = {
  window,
  synthetic: false,
  scope: 'INSTALLATION_HISTORY',
  workflowState: 'NOT_CONNECTED',
  workflowExplanation: 'Workflow is not model eligibility.',
  connectionStatus: 'CONFIGURATION_REQUIRED',
  synchronization: sync,
  counts: { variants: 0 },
  checklist: [
    {
      code: 'CONNECT_STORE',
      priority: 1,
      message: 'Connect a permitted store.',
      href: '/store-connection',
    },
  ],
  liveValidation: 'LIVE_SHOPIFY_NOT_VERIFIED',
  limitations: [],
};
const rows: Variants = {
  window,
  synthetic: false,
  scope: 'INSTALLATION_HISTORY',
  filter: 'ALL',
  results: { content: [], page: 0, size: 5, totalElements: 0, totalPages: 0 },
};
const finding = {
  status: 'MISSING',
  code: 'CURRENT_COST_UNKNOWN',
  message: 'Unknown cost is never zero.',
  provenance: 'UNKNOWN',
};
const assessment: Assessment = {
  variant: {
    variantId: 'fixture-id',
    productId: 'product-id',
    productName: 'Synthetic fixture',
    name: 'Standard',
    sku: 'FIXTURE',
    status: 'ACTIVE',
    productStatus: 'ACTIVE',
  },
  inputs: {
    currentPrice: '10.0000',
    currentCost: null,
    minimum: '10.0000',
    maximum: '10.0000',
    stock: null,
    stockObservedAt: null,
    costSource: null,
    costRecordedAt: null,
    mappingSource: 'DEMO',
    providerSku: null,
    localEditConflict: false,
  },
  coverage: {
    orders: 1,
    lines: 1,
    knownCostLines: 0,
    salesDays: 1,
    firstSale: '2025-01-01',
    lastSale: '2025-01-01',
    merchandiseRefunds: 0,
  },
  dimensions: { current_cost: finding },
  analytics: { ...finding, status: 'AVAILABLE' },
  forecasting: { ...finding, status: 'INSUFFICIENT' },
  optimization: { ...finding, status: 'INSUFFICIENT' },
  forecastStatus: 'INSUFFICIENT_DATA',
  optimizationStatus: 'DIAGNOSTIC_ONLY',
  forecastReasons: ['INSUFFICIENT_RECENT_BASELINE'],
  optimizationReasons: ['SEASONAL_OR_CALENDAR_CONFOUNDING'],
  demandDiagnostics: {
    status: 'INSUFFICIENT_DATA',
    days: 365,
    eligibleDays: 0,
    unknownDays: 365,
    censoredDays: 0,
    distinctPrices: 1,
    reasons: ['INSUFFICIENT_DISTINCT_PRICES'],
  },
  catalogHref: '/products/product-id',
  historyHref: '/products/product-id/variants/fixture-id/history',
};
describe('Onboarding workflow and readiness', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Onboarding, VariantReadiness],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'fixture-id' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function flush(f: ReturnType<typeof TestBed.createComponent<Onboarding>>, s = summary, v = rows) {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url === '/api/v1/onboarding/summary').flush(s);
    http.expectOne((r) => r.url === '/api/v1/onboarding/readiness/variants').flush(v);
    f.detectChanges();
    http.match('/api/v1/shopify/sync/status').forEach((r) => r.flush(s.synchronization));
    f.detectChanges();
  }
  it('renders useful disconnected guidance and never starts an import implicitly', () => {
    const f = TestBed.createComponent(Onboarding);
    flush(f);
    expect(f.nativeElement.textContent).toContain('not connected');
    expect(f.nativeElement.textContent).toContain('No variants in this view');
    expect(f.nativeElement.textContent).toContain(
      'Data imported, ready for analytics, forecast evaluable and eligible for optimization are different',
    );
    TestBed.inject(HttpTestingController).expectNone((r) => r.method !== 'GET');
    f.destroy();
  });
  it('sends stable filters and bounded pagination without treating diagnostics as actionable', () => {
    const f = TestBed.createComponent(Onboarding);
    flush(f, summary, {
      ...rows,
      results: { ...rows.results, content: [assessment], totalElements: 6, totalPages: 2 },
    });
    f.componentInstance.status = 'MISSING_COST';
    f.componentInstance.apply();
    const http = TestBed.inject(HttpTestingController);
    const page = http.expectOne((r) => r.url === '/api/v1/onboarding/readiness/variants');
    expect(page.request.params.get('status')).toBe('MISSING_COST');
    expect(page.request.params.get('size')).toBe('5');
    page.flush({
      ...rows,
      results: { ...rows.results, content: [assessment], totalElements: 6, totalPages: 2 },
    });
    http.expectOne((r) => r.url === '/api/v1/onboarding/summary').flush(summary);
    f.detectChanges();
    f.componentInstance.move(1);
    const next = http.expectOne((r) => r.url === '/api/v1/onboarding/readiness/variants');
    expect(next.request.params.get('page')).toBe('1');
    next.flush({
      ...rows,
      results: { ...rows.results, page: 1, content: [assessment], totalElements: 6, totalPages: 2 },
    });
    http.expectOne((r) => r.url === '/api/v1/onboarding/summary').flush(summary);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Page 2');
    expect(f.nativeElement.textContent).toContain('Abstains');
    f.destroy();
  });
  it('shows retryable assessment failure and recovers', () => {
    const f = TestBed.createComponent(Onboarding),
      http = TestBed.inject(HttpTestingController);
    const variants = http.expectOne((r) => r.url === '/api/v1/onboarding/readiness/variants');
    http
      .expectOne((r) => r.url === '/api/v1/onboarding/summary')
      .flush({ message: 'Assessment unavailable.' }, { status: 503, statusText: 'Unavailable' });
    expect(variants.cancelled).toBe(true);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Assessment unavailable');
    f.componentInstance.load();
    flush(f);
    expect(f.nativeElement.textContent).toContain('No variants in this view');
    f.destroy();
  });
  it('keeps the synthetic view read-only without connection or import controls', () => {
    const f = TestBed.createComponent(Onboarding);
    flush(
      f,
      {
        ...summary,
        synthetic: true,
        workflowState: 'SYNTHETIC_DEMO',
        synchronization: { ...sync, demo: true },
        checklist: [],
      },
      {
        ...rows,
        synthetic: true,
        results: { ...rows.results, content: [assessment], totalElements: 1, totalPages: 1 },
      },
    );
    expect(f.nativeElement.textContent).toContain('Synthetic demo · read-only');
    expect(f.nativeElement.querySelector('app-sync-panel')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('Business settings');
    TestBed.inject(HttpTestingController).expectNone((r) => r.method !== 'GET');
    f.destroy();
  });
  it('explains unknown costs and unchanged model reasons, with dated-input links', () => {
    const f = TestBed.createComponent(VariantReadiness);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/onboarding/readiness/variants/fixture-id')
      .flush({ window, synthetic: false, scope: 'INSTALLATION_HISTORY', assessment });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Unknown cost is never zero');
    expect(f.nativeElement.textContent).toContain('DIAGNOSTIC_ONLY');
    expect(f.nativeElement.textContent).toContain('seasonal or calendar confounding');
    expect(f.nativeElement.textContent).toContain('Complete catalog inputs');
    expect(f.nativeElement.textContent).toContain('LOCAL_EDIT_CONFLICT');
    expect(f.nativeElement.textContent).not.toContain('Recommended price');
    f.destroy();
  });
});
