import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { SessionService } from '../../core/session.service';
describe('Home health connection', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows loading followed by a real successful response', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Checking connection');
    TestBed.inject(HttpTestingController).expectOne('/api/v1/health').flush({ status: 'UP' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Connected',
    );
  });
  it('shows failure and supports retry', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/health').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Backend unavailable');
    fixture.nativeElement.querySelector('button').click();
    http.expectOne('/api/v1/health').flush({ status: 'UP' });
    await fixture.whenStable();
    expect(fixture.componentInstance.status()).toBe('connected');
  });
  it('rejects unexpected status', async () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/health').flush({ status: 'DOWN' });
    await fixture.whenStable();
    expect(fixture.componentInstance.status()).toBe('unavailable');
  });
  it('waits for authorized access and clears protected records when access is lost', async () => {
    const fixture = TestBed.createComponent(Home);
    const http = TestBed.inject(HttpTestingController);
    const session = TestBed.inject(SessionService);
    fixture.detectChanges();
    http.expectOne('/api/v1/health').flush({ status: 'UP' });
    http.expectNone((r) => r.url.includes('/analytics/') || r.url.includes('/onboarding/'));
    session.value.set({ mode: 'DEMO', authenticated: false, readOnly: true, username: null });
    await fixture.whenStable();
    const pending = http.match(
      (r) => r.url.includes('/analytics/') || r.url.includes('/onboarding/'),
    );
    expect(pending.length).toBe(3);
    for (const request of pending) {
      expect(request.request.params.get('startDate')).toBe('2025-01-01');
      expect(request.request.params.get('endDate')).toBe('2026-01-01');
      expect(request.request.method).toBe('GET');
    }
    session.clear();
    await fixture.whenStable();
    expect(pending.every((request) => request.cancelled)).toBe(true);
    expect(fixture.componentInstance.overview()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sign in');
  });
  it('renders transmitted sales precision and real counts without a readiness score', async () => {
    TestBed.inject(SessionService).value.set({
      mode: 'DEMO',
      authenticated: false,
      readOnly: true,
      username: null,
    });
    const fixture = TestBed.createComponent(Home);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/api/v1/health').flush({ status: 'UP' });
    const range = {
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      currencyCode: 'MAD',
      timezone: 'UTC',
    };
    http
      .expectOne((r) => r.url.endsWith('/analytics/overview'))
      .flush({ range, metrics: { netSales: '1234.5678', orders: 9, unitsSold: 17 } });
    http
      .expectOne((r) => r.url.endsWith('/analytics/trends'))
      .flush({ range, granularity: 'MONTH', content: [] });
    http
      .expectOne((r) => r.url.endsWith('/onboarding/summary'))
      .flush({
        counts: { products: 3, variants: 4, stale_or_uncertain_stock: 2, missing_cost: 1 },
        synchronization: { connected: false, lastSuccessfulSync: null },
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1,234.5678');
    expect(fixture.nativeElement.textContent).toContain('3 products · 4 variants');
    expect(fixture.nativeElement.textContent).toContain('2 stale or uncertain');
    expect(fixture.nativeElement.textContent).not.toContain('85%');
    expect(fixture.nativeElement.textContent).not.toContain('owner');
  });
});
