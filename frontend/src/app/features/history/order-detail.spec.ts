import { SessionService } from '../../core/session.service';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderDetail } from './order-detail';
describe('OrderDetail refunds', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'order' }) } },
        },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows unknown cost separately from zero and preserves refund errors', async () => {
    const fixture = TestBed.createComponent(OrderDetail),
      http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/sales/orders/order').flush({
      order: {
        id: 'order',
        externalReference: 'TEST',
        status: 'COMPLETED',
        currencyCode: 'MAD',
        source: 'MANUAL',
        placedAt: '2026-01-01T00:00:00Z',
        subtotal: '10.0000',
        discountAmount: '0.0000',
        shippingAmount: '0.0000',
        taxAmount: null,
        recognizedNetMerchandise: '10.0000',
        merchandiseRefunds: '0.0000',
        shippingRefunds: '0.0000',
        taxRefunds: '0.0000',
        totalCharged: null,
      },
      lines: [
        {
          id: 'item',
          sku: 'SKU',
          name: 'Name',
          quantity: 1,
          unitPrice: '10.0000',
          lineNet: '10.0000',
          discountAmount: '0.0000',
          unitCost: null,
          listUnitPrice: null,
          costProvenance: 'UNKNOWN',
        },
      ],
      refunds: [],
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Unknown');
    expect(fixture.nativeElement.textContent).toContain('0.0000');
    fixture.componentInstance.form.patchValue({ itemId: 'item', quantity: 0, amount: '1' });
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.error()).toContain('at least one');
    fixture.componentInstance.form.patchValue({ quantity: 1, amount: '11' });
    fixture.componentInstance.submit();
    http
      .expectOne('/api/v1/sales/orders/order/refunds')
      .flush({ message: 'Refund exceeds paid amount.' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.error()).toContain('exceeds');
    expect(fixture.componentInstance.form.controls.amount.value).toBe('11');
  });
  it('disables refunds in the anonymous demo and guards the handler even if an editor is forced open', async () => {
    TestBed.inject(SessionService).value.set({
      mode: 'DEMO',
      authenticated: false,
      readOnly: true,
      username: null,
    });
    const f = TestBed.createComponent(OrderDetail),
      http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/sales/orders/order').flush({
      order: { id: 'order', status: 'COMPLETED', currencyCode: 'MAD', source: 'DEMO' },
      lines: [],
      refunds: [],
    });
    await f.whenStable();
    const button = [...f.nativeElement.querySelectorAll('button')].find((b: any) =>
      b.textContent.includes('Record refund'),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    f.componentInstance.editing.set(true);
    await f.whenStable();
    expect(f.nativeElement.querySelector('form')).toBeNull();
    f.componentInstance.submit();
    http.expectNone((r) => r.method === 'POST');
  });
});
