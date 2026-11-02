import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HistoryApi } from './history-api.service';
import { apiError } from '../catalog/services/catalog-api.service';
describe('HistoryApi', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('sends UTC filters and preserves decimal strings', () => {
    const api = TestBed.inject(HistoryApi),
      http = TestBed.inject(HttpTestingController);
    api
      .orders({
        page: 1,
        size: 20,
        from: '2026-01-01T00:00:00Z',
        to: '',
        status: 'COMPLETED',
        source: 'MANUAL',
      })
      .subscribe();
    const get = http.expectOne((r) => r.url === '/api/v1/sales/orders');
    expect(get.request.params.get('from')).toBe('2026-01-01T00:00:00Z');
    expect(get.request.params.get('page')).toBe('1');
    get.flush({ content: [] });
    api
      .addHistory('variant', 'cost', {
        source: 'MANUAL',
        externalReference: 'cost-1',
        quality: 'VERIFIED_CHANGE',
        validFrom: '2026-01-01T00:00:00Z',
        validTo: null,
        amount: '999999999999999.9999',
        currencyCode: 'MAD',
        variantVersion: 2,
      })
      .subscribe();
    const post = http.expectOne('/api/v1/products/variants/variant/cost-history');
    expect(post.request.body.amount).toBe('999999999999999.9999');
    expect(post.request.body.variantVersion).toBe(2);
    post.flush({});
  });
  it('surfaces source-key conflicts rather than fabricating success', () => {
    let message = '';
    TestBed.inject(HistoryApi)
      .addHistory('variant', 'inventory', {
        source: 'MANUAL',
        quality: 'SNAPSHOT',
        externalReference: 'stock',
        observedAt: '2026-01-01T00:00:00Z',
        quantityAvailable: 0,
      })
      .subscribe({ error: (e) => (message = apiError(e)) });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/products/variants/variant/inventory-history')
      .flush(
        { message: 'Source reference has a different payload.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(message).toContain('different payload');
  });
});
