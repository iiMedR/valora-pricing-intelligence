import { SessionService } from '../../core/session.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Orders } from './orders';
describe('Orders', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Orders],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('keeps the exact long order reference accessible while shortening its visible link', async () => {
    const f = TestBed.createComponent(Orders);
    const reference = 'portfolio-v1/order/portfolio/COST_CHANGE_UNKNOWN/1/2025-12-31';
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/sales/orders')
      .flush({
        content: [
          {
            id: 'order-123',
            externalReference: reference,
            placedAt: '2025-12-31T12:00:00Z',
            status: 'COMPLETED',
            source: 'DEMO',
            currencyCode: 'MAD',
            itemCount: 1,
            totalQuantity: 2,
            netMerchandise: '100.00',
            recognizedNetMerchandise: '100.00',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      });
    await f.whenStable();
    const link = f.nativeElement.querySelector('a[href="/orders/order-123"]') as HTMLAnchorElement;
    expect(link.textContent!.length).toBeLessThan(reference.length);
    expect(link.textContent!.trim()).toBe('Cost change unknown · 1 · 2025-12-31');
    expect(link.getAttribute('aria-label')).toContain(link.textContent!.trim());
    expect(link.getAttribute('aria-label')).toContain(reference);
    expect(f.nativeElement.querySelector('.full-reference span').textContent).toBe(reference);
    expect(f.nativeElement.querySelector('.full-reference summary').textContent).toBe(
      'Full reference',
    );
  });
  it('renders loading then empty and validates reversed date filters', async () => {
    const fixture = TestBed.createComponent(Orders);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading orders');
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/sales/orders')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No orders found');
    fixture.componentInstance.filters.patchValue({
      from: '2026-02-01T00:00',
      to: '2026-01-01T00:00',
    });
    fixture.componentInstance.apply();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'must follow',
    );
  });
  it('shows real backend error and allows retry', async () => {
    const fixture = TestBed.createComponent(Orders);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/api/v1/sales/orders')
      .flush({ message: 'Orders unavailable.' }, { status: 500, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Orders unavailable.');
    expect(fixture.nativeElement.textContent).not.toContain('No orders found');
    fixture.componentInstance.load();
    http
      .expectOne((r) => r.url === '/api/v1/sales/orders')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });
  it('does not offer the manual order route in demo mode', async () => {
    TestBed.inject(SessionService).value.set({
      mode: 'DEMO',
      authenticated: false,
      readOnly: true,
      username: null,
    });
    const f = TestBed.createComponent(Orders);
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/v1/sales/orders')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    await f.whenStable();
    expect(f.nativeElement.querySelector('a[href="/orders/new"]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('orders and refunds are read-only');
  });
});
