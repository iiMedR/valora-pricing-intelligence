import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { OrderForm } from './order-form';
describe('OrderForm', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [OrderForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function setup() {
    const fixture = TestBed.createComponent(OrderForm),
      http = TestBed.inject(HttpTestingController);
    http
      .expectOne((r) => r.url === '/api/v1/products')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    http.expectOne('/api/v1/business-settings').flush({ currencyCode: 'MAD' });
    return { fixture, http, component: fixture.componentInstance };
  }
  it('does not send invalid quantities or precision', () => {
    const { component } = setup();
    component.form.controls.lines
      .at(0)
      .patchValue({
        productId: 'product',
        variantId: 'variant',
        quantity: 0,
        unitPrice: '1.00001',
      });
    component.submit();
    expect(component.form.invalid).toBe(true);
    expect(component.saving()).toBe(false);
  });
  it('sends exact money and unknown cost without substituting catalog cost', async () => {
    const { component, http, fixture } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.controls.lines
      .at(0)
      .patchValue({
        productId: 'product',
        variantId: 'variant',
        quantity: 1,
        unitPrice: '999999999999999.9999',
        discountAmount: '0',
      });
    component.submit();
    const request = http.expectOne('/api/v1/sales/orders');
    expect(request.request.body.lines[0].unitPrice).toBe('999999999999999.9999');
    expect(request.request.body.lines[0].unitCost).toBeNull();
    expect(request.request.body.shippingAmount).toBeNull();
    component.submit();
    http.expectNone('/api/v1/sales/orders');
    request.flush({ order: { id: 'order' }, lines: [], refunds: [] });
    await fixture.whenStable();
  });
});
