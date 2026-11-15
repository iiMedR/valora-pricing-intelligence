import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { SessionService } from '../../core/session.service';
describe('Home workspace', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('waits for authorized access and clears protected records when access is lost', async () => {
    const fixture = TestBed.createComponent(Home);
    const http = TestBed.inject(HttpTestingController);
    const session = TestBed.inject(SessionService);
    fixture.detectChanges();
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
    const row = (id: string) => ({
      variant: { variantId: id },
      status: 'DIAGNOSTIC_ONLY',
      reasons: ['PRICE_CALENDAR_CONFOUNDING_RISK'],
    });
    http
      .expectOne((r) => r.url.endsWith('/optimization/overview'))
      .flush({
        results: { content: [row('a'), row('b')], totalElements: 4, totalPages: 2, page: 0 },
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('No reliable price changes suggested');
    http
      .expectOne((r) => r.url.endsWith('/optimization/overview'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Checked 2 variants');
    expect(fixture.nativeElement.textContent).not.toContain('No reliable price changes suggested');
    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: any) => button.textContent.includes('Retry pricing check'))
      .click();
    http
      .expectOne((r) => r.url.endsWith('/optimization/overview') && r.params.get('page') === '1')
      .flush({
        results: { content: [row('c'), row('d')], totalElements: 4, totalPages: 2, page: 1 },
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1,234.57 MAD');
    expect(fixture.nativeElement.textContent).toContain('4 variants in your catalog');
    expect(fixture.nativeElement.textContent).toContain('2 stale or uncertain');
    expect(fixture.nativeElement.textContent).not.toContain('85%');
    expect(fixture.nativeElement.textContent).not.toContain('owner');
    expect(fixture.nativeElement.textContent).toContain('No reliable price changes suggested');
    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: any) => button.textContent.includes('How calculated?'))
      .click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('dialog').textContent).toContain('1234.5678 MAD');
  });
});
