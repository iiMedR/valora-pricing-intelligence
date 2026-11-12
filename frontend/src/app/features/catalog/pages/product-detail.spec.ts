import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductDetail } from './product-detail';
import { VariantSummary } from '../components/variant-summary';
import { PricingGuidance } from '../../../shared/merchant/pricing-guidance';
import { SessionService } from '../../../core/session.service';
@Component({ selector: 'app-variant-summary', template: '' })
class SummaryStub {
  readonly variant = input<unknown>();
  readonly context = input<unknown>();
}
@Component({ selector: 'app-pricing-guidance', template: '' })
class GuidanceStub {
  readonly productId = input('');
  readonly variantId = input('');
}
describe('Product detail URL and native variant selection', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([{ path: 'products/:id', component: ProductDetail }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    // Child requests/rendering have their own tests. Keep this regression on the real parent,
    // router query state and asynchronously created native select options.
    TestBed.overrideComponent(ProductDetail, {
      remove: { imports: [VariantSummary, PricingGuidance] },
      add: { imports: [SummaryStub, GuidanceStub] },
    });
    TestBed.inject(SessionService).value.set({
      mode: 'DEMO',
      authenticated: false,
      readOnly: true,
      username: null,
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function load() {
    const harness = await RouterTestingHarness.create(
      '/products/p?variant=b&search=bag&page=2&view=list',
    );
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/products/p')
      .flush({
        product: { id: 'p', name: 'Product', status: 'ACTIVE', categoryId: null, version: 0 },
        variants: ['a', 'b'].map((id) => ({
          id,
          productId: 'p',
          name: id,
          sku: id,
          status: 'ACTIVE',
          currentPrice: '100',
          costPrice: id === 'b' ? null : '40',
          minPrice: '50',
          maxPrice: '200',
          version: 0,
        })),
      });
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/business-settings').flush({ currencyCode: 'MAD', version: 0 });
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }
  it('selects the requested second variant when its options arrive after the route', async () => {
    const h = await load();
    const select = h.routeNativeElement!.querySelector('select')!;
    expect(select.value).toBe('b');
    expect(h.routeNativeElement!.textContent).toContain('Cost');
  });
  it('keeps native selection aligned on same-product Back/forward query navigation', async () => {
    const h = await load();
    await h.navigateByUrl('/products/p?variant=a&search=bag&page=2&view=list');
    expect(h.routeNativeElement!.querySelector('select')!.value).toBe('a');
    await h.navigateByUrl('/products/p?variant=b&search=bag&page=2&view=list');
    expect(h.routeNativeElement!.querySelector('select')!.value).toBe('b');
  });
});
