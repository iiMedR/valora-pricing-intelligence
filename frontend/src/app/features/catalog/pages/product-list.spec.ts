import { Router } from '@angular/router';
import { EditorState } from '../../../core/editor-state';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
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
  it('restores URL filters/view/page and cancels superseded result requests', async () => {
    const params = new BehaviorSubject(
      convertToParamMap({ search: 'Coffee', page: '1', view: 'list' }),
    );
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { queryParamMap: params, snapshot: { queryParamMap: params.value } },
    });
    const f = TestBed.createComponent(ProductList),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    const old = http.match(() => true);
    expect(old.find((r) => r.request.url.endsWith('/products'))!.request.params.get('page')).toBe(
      '1',
    );
    expect(f.componentInstance.view()).toBe('list');
    params.next(convertToParamMap({ search: 'Tea', page: '0', view: 'grid', status: 'ACTIVE' }));
    expect(old.every((r) => r.cancelled)).toBe(true);
    http.expectOne('/api/v1/categories').flush([]);
    const request = http.expectOne((r) => r.url.endsWith('/products'));
    expect(request.request.params.get('search')).toBe('Tea');
    request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await f.whenStable();
    expect(f.componentInstance.view()).toBe('grid');
    expect(f.componentInstance.filters.controls.status.value).toBe('ACTIVE');
  });
  it('bounds malformed pagination and unsupported status rather than issuing unbounded requests', () => {
    const params = new BehaviorSubject(
      convertToParamMap({ page: '999999999', status: 'FAKE', view: 'invalid' }),
    );
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { queryParamMap: params, snapshot: { queryParamMap: params.value } },
    });
    const f = TestBed.createComponent(ProductList),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne('/api/v1/categories').flush([]);
    const request = http.expectOne((r) => r.url.endsWith('/products'));
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('status')).toBe(false);
    request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('closes a successfully saved busy editor before navigating to the new product', async () => {
    const f = TestBed.createComponent(ProductList),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne('/api/v1/categories').flush([]);
    http
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await f.whenStable();
    f.componentInstance.creating.set(true);
    f.detectChanges();
    const router = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    f.componentInstance.save({
      name: 'New product',
      description: '',
      categoryId: null,
      status: 'ARCHIVED',
    });
    f.detectChanges();
    expect([...TestBed.inject(EditorState).editors].some((editor) => editor.editorBusy)).toBe(true);
    http
      .expectOne((r) => r.url.endsWith('/products') && r.method === 'POST')
      .flush({ id: 'new-id' });
    expect(TestBed.inject(EditorState).canLeave()).toBe(true);
    expect(f.nativeElement.querySelector('app-product-form')).toBeNull();
    expect(router).toHaveBeenCalledWith(['/products', 'new-id']);
  });

  it('renders only the returned twenty records for a large result set and requests a bounded next page', async () => {
    const f = TestBed.createComponent(ProductList),
      http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne('/api/v1/categories').flush([]);
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: 'product-' + i,
      name: 'Product ' + i,
      status: 'ACTIVE',
      categoryId: null,
    }));
    http
      .expectOne((r) => r.url.endsWith('/products'))
      .flush({ content: rows, page: 0, size: 20, totalElements: 10000, totalPages: 500 });
    await f.whenStable();
    expect(f.nativeElement.querySelectorAll('app-product-entry').length).toBe(20);
    http.expectNone((r) => /\/products\//.test(r.url));
    f.componentInstance.changePage(1);
    http.expectOne('/api/v1/categories').flush([]);
    const request = http.expectOne((r) => r.url.endsWith('/products'));
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({ content: rows, page: 1, size: 20, totalElements: 10000, totalPages: 500 });
  });
});
