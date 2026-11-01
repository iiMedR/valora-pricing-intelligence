import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductList } from './product-list';
describe('ProductList', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('moves from loading to empty and submits the selected filters', async () => {
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading products');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/categories').flush([]);
    http
      .expectOne((r) => r.url === '/api/v1/products')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No products found');
    fixture.componentInstance.filters.patchValue({ search: 'Blue', status: 'ARCHIVED' });
    fixture.componentInstance.apply();
    http.expectOne('/api/v1/categories').flush([]);
    const request = http.expectOne((r) => r.url === '/api/v1/products');
    expect(request.request.params.get('status')).toBe('ARCHIVED');
    expect(request.request.params.get('search')).toBe('Blue');
    request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });
  it('shows the backend failure instead of a fake empty success', async () => {
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/categories').flush([]);
    http
      .expectOne((r) => r.url === '/api/v1/products')
      .flush({ message: 'Catalog unavailable.' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Catalog unavailable.');
    expect(fixture.nativeElement.textContent).not.toContain('No products found');
  });
});
