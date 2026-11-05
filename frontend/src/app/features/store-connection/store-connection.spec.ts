import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { StoreConnection } from './store-connection';
import { StoreStatus, SHOPIFY_NAVIGATE, validAuthorizationUrl } from './store-api.service';
const status: StoreStatus = {
  status: 'DISCONNECTED',
  configured: true,
  shop: null,
  scopes: [],
  connectedAt: null,
  disconnectedAt: null,
  accessExpiresAt: null,
  refreshExpiresAt: null,
  lastError: null,
  synchronization: 'NOT_YET_SYNCHRONIZED_MILESTONE_09',
};
describe('Shopify connection', () => {
  const navigation = vi.fn();
  beforeEach(() => {
    navigation.mockReset();
    TestBed.configureTestingModule({
      imports: [StoreConnection],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SHOPIFY_NAVIGATE, useValue: navigation },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function initial(value = status) {
    const f = TestBed.createComponent(StoreConnection);
    f.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/integrations/shopify/status')
      .flush(value);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/shopify/sync/status')
      .flush({
        demo: value.status === 'DEMO_DISABLED',
        connected: value.status === 'CONNECTED',
        shop: value.shop,
        lastSuccessfulSync: null,
        latest: null,
        checkpoints: [],
        requiredScopes: [],
        liveValidation: 'LIVE_SHOPIFY_NOT_VERIFIED',
      });
    return f;
  }
  it('validates canonical shop and navigates only to its authorization endpoint', async () => {
    const f = initial();
    await f.whenStable();
    f.componentInstance.shop.setValue('https://evil.test');
    f.componentInstance.connect();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/integrations/shopify/connect');
    f.componentInstance.shop.setValue('example-shop.myshopify.com');
    f.componentInstance.connect();
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/integrations/shopify/connect',
    );
    expect(request.request.body).toEqual({ shop: 'example-shop.myshopify.com' });
    request.flush({
      authorizationUrl:
        'https://example-shop.myshopify.com/admin/oauth/authorize?client_id=public-test-id',
    });
    expect(navigation).toHaveBeenCalled();
    expect(
      validAuthorizationUrl(
        'https://evil.test/admin/oauth/authorize',
        'example-shop.myshopify.com',
      ),
    ).toBe(false);
    expect(
      validAuthorizationUrl(
        'https://example-shop.myshopify.com@evil.test/admin/oauth/authorize',
        'example-shop.myshopify.com',
      ),
    ).toBe(false);
  });
  it('requires deliberate confirmation and never deletes domain history', async () => {
    const f = initial({
      ...status,
      status: 'CONNECTED',
      shop: 'example-shop.myshopify.com',
      scopes: ['read_products'],
      connectedAt: '2026-11-12T00:00:00Z',
    });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain(
      'Connected authorization is separate from import completion',
    );
    f.componentInstance.disconnect();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/integrations/shopify/disconnect');
    f.componentInstance.confirming.set(true);
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    f.componentInstance.disconnect();
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/integrations/shopify/disconnect',
    );
    expect(request.request.method).toBe('POST');
    request.flush({
      ...status,
      shop: 'example-shop.myshopify.com',
      lastError: 'REMOTE_REVOCATION_UNCONFIRMED',
    });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Local credentials were removed');
    expect(f.componentInstance.confirming()).toBe(false);
  });
  it('keeps demo isolated without connect or disconnect actions', async () => {
    const f = initial({ ...status, status: 'DEMO_DISABLED', configured: false });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Synthetic demo');
    expect(f.nativeElement.textContent).not.toContain('Connect to Shopify');
    f.componentInstance.shop.setValue('example-shop.myshopify.com');
    f.componentInstance.connect();
    f.componentInstance.confirming.set(true);
    f.componentInstance.disconnect();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/integrations/shopify/connect');
    TestBed.inject(HttpTestingController).expectNone('/api/v1/integrations/shopify/disconnect');
  });
  it('renders safe OAuth failures and status retry without leaking raw provider data', async () => {
    const f = initial({
      ...status,
      status: 'FAILED',
      shop: 'example-shop.myshopify.com',
      lastError: 'TOKEN_EXCHANGE_FAILED',
    });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Authorization could not be completed');
    f.componentInstance.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/integrations/shopify/status')
      .flush({ message: 'Connection unavailable.' }, { status: 503, statusText: 'Unavailable' });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Connection unavailable.');
    f.componentInstance.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/integrations/shopify/status')
      .flush(status);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('disconnected');
  });
});
