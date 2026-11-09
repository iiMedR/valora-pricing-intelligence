import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VariantSummary } from './variant-summary';
import { SessionService } from '../../../core/session.service';
const variant = {
  id: 'a',
  productId: 'p',
  sku: 'SKU-A',
  name: 'A',
  currentPrice: '100.0000',
  costPrice: '40.0000',
  minPrice: '1',
  maxPrice: '200',
  status: 'ACTIVE',
  belowCost: false,
  version: 0,
  createdAt: '',
  updatedAt: '',
};
const result = (id = 'a') => ({
  variant: { variantId: id, productId: 'p', productName: 'Product', sku: 'SKU-A' },
  status: 'DIAGNOSTIC_ONLY',
  reasons: ['PRICE_CALENDAR_CONFOUNDING_RISK'],
  recommendedPrice: null,
  comparison: null,
  inputs: { currentPrice: '100' },
  elasticity: { estimate: null, status: 'NOT_ESTIMABLE' },
  assumptions: [],
  window: { startDate: '2025-01-01', endDate: '2026-01-01', currencyCode: 'MAD' },
  horizonDays: 30,
  modelVersion: 'actual-model',
  evaluationInstant: '2026-01-01T00:00:00Z',
});
describe('Focused variant evidence', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [VariantSummary],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function create() {
    TestBed.inject(SessionService).value.set({
      mode: 'DEMO',
      authenticated: false,
      readOnly: true,
      username: null,
    });
    const f = TestBed.createComponent(VariantSummary);
    f.componentRef.setInput('variant', variant);
    await f.whenStable();
    return f;
  }
  it('uses exact variant identity and API currency, and does not invent a price suggestion', async () => {
    const f = await create(),
      http = TestBed.inject(HttpTestingController);
    const sales = http.expectOne((r) => r.url.endsWith('/analytics/products/p/variants'));
    expect(sales.request.params.get('search')).toBe('SKU-A');
    expect(sales.request.params.get('startDate')).toBe('2025-01-01');
    sales.flush({
      range: { currencyCode: 'MAD' },
      results: {
        content: [
          { variantId: 'a', productId: 'p', metrics: { netSales: '1234.5678', unitsSold: 5 } },
        ],
      },
    });
    http.expectOne((r) => r.url.endsWith('/a/recommendation')).flush(result());
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('1,234.57 MAD');
    expect(f.nativeElement.textContent).toContain('No reliable price change suggested');
    expect(f.nativeElement.textContent).not.toContain('100.00 MAD →');
    const link = f.nativeElement.querySelector('a[href^="/forecasting"]');
    expect(link.getAttribute('href')).toContain('variantId=a');
    expect(link.getAttribute('href')).toContain('horizonDays=30');
  });
  it('cancels old requests on rapid variant changes and clears protected evidence on session loss', async () => {
    const f = await create(),
      http = TestBed.inject(HttpTestingController);
    const old = http.match(() => true);
    f.componentRef.setInput('variant', { ...variant, id: 'b', sku: 'SKU-B' });
    await f.whenStable();
    expect(old.every((r) => r.cancelled)).toBe(true);
    const pending = http.match(() => true);
    TestBed.inject(SessionService).clear();
    await f.whenStable();
    expect(pending.every((r) => r.cancelled)).toBe(true);
    expect(f.componentInstance.sales()).toBeNull();
    expect(f.componentInstance.evaluation()).toBeNull();
  });
  it('withholds mismatched/unknown rows rather than showing zero or another variant', async () => {
    const f = await create(),
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.includes('/analytics/'))
      .flush({
        range: { currencyCode: 'MAD' },
        results: {
          content: [
            { variantId: 'foreign', productId: 'p', metrics: { netSales: '999', unitsSold: 99 } },
          ],
        },
      });
    http.expectOne((r) => r.url.includes('/optimization/')).flush(result('foreign'));
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Sales totals unavailable');
    expect(f.nativeElement.textContent).toContain('response did not match');
    expect(f.nativeElement.textContent).not.toContain('999');
  });
  it('retries an isolated pricing failure without discarding returned sales', async () => {
    const f = await create(),
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url.includes('/analytics/'))
      .flush({ range: { currencyCode: 'MAD' }, results: { content: [] } });
    http
      .expectOne((r) => r.url.includes('/optimization/'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await f.whenStable();
    f.componentInstance.loadPricing();
    http.expectOne((r) => r.url.includes('/optimization/')).flush(result());
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No reliable price change suggested');
    http.expectNone((r) => r.url.includes('/analytics/'));
  });
});
