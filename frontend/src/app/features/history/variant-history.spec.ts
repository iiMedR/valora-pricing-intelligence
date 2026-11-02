import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VariantHistory } from './variant-history';
describe('VariantHistory', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [VariantHistory],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ productId: 'product', variantId: 'variant' }),
            },
          },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function flush(kind: string) {
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/products/product')
      .flush({ product: { id: 'product' }, variants: [{ id: 'variant', sku: 'SKU', version: 0 }] });
    http.expectOne('/api/v1/business-settings').flush({ currencyCode: 'MAD' });
    http
      .expectOne((r) => r.url === '/api/v1/products/variants/variant/' + kind + '-history')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    return http;
  }
  it('distinguishes missing inventory from a known zero observation', async () => {
    const fixture = TestBed.createComponent(VariantHistory);
    flush('price');
    fixture.componentInstance.select('inventory');
    flush('inventory');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Inventory unknown');
    expect(
      fixture.componentInstance.rowValue({
        id: 'stock',
        variantId: 'variant',
        observedAt: '2026-01-01Z',
        quantityAvailable: 0,
        source: 'MANUAL',
        quality: 'SNAPSHOT',
        externalReference: null,
        stockState: 'KNOWN_STOCKOUT',
        createdAt: '',
      }),
    ).toContain('0 · KNOWN_STOCKOUT');
  });
  it('rejects invalid date bounds and sends observations with version/retry key', () => {
    const component = TestBed.createComponent(VariantHistory).componentInstance;
    const http = flush('price');
    component.form.patchValue({
      amount: '12.1234',
      from: '2026-01-02T00:00',
      to: '2026-01-01T00:00',
      quality: 'VERIFIED_CHANGE',
    });
    component.submit();
    expect(component.error()).toContain('must follow');
    component.form.controls.to.setValue('');
    component.submit();
    const request = http.expectOne('/api/v1/products/variants/variant/price-history');
    expect(request.request.body.variantVersion).toBe(0);
    expect(request.request.body.amount).toBe('12.1234');
    expect(request.request.body.externalReference).toBeTruthy();
    request.flush({ message: 'Overlapping period.' }, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toContain('Overlapping');
    expect(component.form.controls.amount.value).toBe('12.1234');
  });
});
