import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogApi, apiError } from './catalog-api.service';
describe('CatalogApi', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('encodes filters and pagination', () => {
    TestBed.inject(CatalogApi)
      .products({ page: 2, size: 20, search: 'Blue & white', categoryId: '', status: 'ARCHIVED' })
      .subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      (r) => r.url === '/api/v1/products',
    );
    expect(request.request.params.get('search')).toBe('Blue & white');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.has('categoryId')).toBe(false);
    request.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });
  it('preserves monetary strings and exposes conflict messages', () => {
    let message = '';
    TestBed.inject(CatalogApi)
      .saveVariant('product', {
        sku: 'SKU',
        name: 'Standard',
        costPrice: '0',
        currentPrice: '999999999999999.9999',
        minPrice: '1',
        maxPrice: '999999999999999.9999',
        status: 'ACTIVE',
      })
      .subscribe({ error: (e) => (message = apiError(e)) });
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/products/product/variants',
    );
    expect(request.request.body.currentPrice).toBe('999999999999999.9999');
    request.flush(
      { code: 'DUPLICATE_SKU', message: 'SKU is already used.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(message).toContain('SKU is already used.');
  });
});
