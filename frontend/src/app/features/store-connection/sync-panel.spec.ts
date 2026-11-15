import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SyncPanel, SyncStatus } from './sync-panel';
const status: SyncStatus = {
  demo: false,
  connected: true,
  shop: 'fixture-shop.myshopify.com',
  lastSuccessfulSync: null,
  latest: null,
  checkpoints: [],
  requiredScopes: ['read_products'],
  liveValidation: 'LIVE_SHOPIFY_NOT_VERIFIED',
};
describe('Shopify synchronization panel', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SyncPanel],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  function create(value = status) {
    const fixture = TestBed.createComponent(SyncPanel);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/shopify/sync/status').flush(value);
    fixture.detectChanges();
    return fixture;
  }
  it('starts a bounded explicit historical job without provider credentials', () => {
    const f = create();
    expect(f.nativeElement.textContent).toContain(
      'Live store sync has not been verified with a real Shopify store.',
    );
    f.componentInstance.from = '2026-11-01';
    f.componentInstance.to = '2026-11-08';
    f.componentInstance.start('INITIAL');
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/shopify/sync');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      kind: 'INITIAL',
      from: '2026-11-01T00:00:00Z',
      to: '2026-11-08T00:00:00Z',
      maxPages: 100,
    });
    request.flush({ id: 'fixture-job', state: 'PENDING' });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/shopify/sync/status')
      .flush({
        ...status,
        latest: {
          id: 'fixture-job',
          kind: 'INITIAL',
          state: 'PENDING',
          from: '2026-11-01',
          to: '2026-11-08',
          counts: {},
          warnings: [],
          errorCode: null,
          attempts: 1,
        },
      });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('PENDING');
    expect(f.nativeElement.textContent).not.toContain('ephemeral-token');
    f.destroy();
  });
  it('shows partial progress and resumes the same job at its saved checkpoint', () => {
    const value = {
      ...status,
      latest: {
        id: 'fixture-job',
        kind: 'INITIAL',
        state: 'PARTIAL',
        from: '2026-11-01',
        to: '2026-11-08',
        counts: { variantsRead: 10 },
        warnings: ['COST_UNAVAILABLE'],
        errorCode: 'SHOPIFY_RETRY_EXHAUSTED',
        attempts: 1,
      },
      checkpoints: [
        { resource: 'CATALOG', complete: true },
        { resource: 'ORDERS', complete: false },
      ],
    };
    const f = create(value);
    expect(f.nativeElement.textContent).toContain('SHOPIFY_RETRY_EXHAUSTED');
    expect(f.nativeElement.textContent).toContain('cost unavailable');
    f.componentInstance.resume('fixture-job');
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/shopify/sync');
    expect(request.request.body).toEqual({ resumeJobId: 'fixture-job' });
    request.flush({});
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/shopify/sync/status')
      .flush({ ...value, latest: { ...value.latest, state: 'SUCCEEDED' } });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('SUCCEEDED');
    f.destroy();
  });
  it('keeps anonymous demo and disconnected stores from starting imports', () => {
    const f = create({ ...status, demo: true, connected: false, shop: null });
    f.componentInstance.start('INITIAL');
    f.componentInstance.resume('fixture-job');
    TestBed.inject(HttpTestingController).expectNone('/api/v1/shopify/sync');
    expect(f.nativeElement.textContent).toContain('imports are disabled');
    expect(f.nativeElement.textContent).not.toContain('fixture-shop');
    f.destroy();
  });
  it('renders safe error retry and paginated history', () => {
    const f = create();
    f.componentInstance.start('INCREMENTAL');
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/shopify/sync')
      .flush({ message: 'Sign in to continue.' }, { status: 401, statusText: 'Unauthorized' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Sign in to continue.');
    f.componentInstance.load();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/shopify/sync/status').flush(status);
    f.componentInstance.history();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/shopify/sync/jobs?page=0&size=20')
      .flush([]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No import jobs.');
    f.destroy();
  });
});
