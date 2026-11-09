import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpXsrfTokenExtractor,
} from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { sessionInterceptor, authGuard, writeGuard } from './auth-integration';
import { SessionService, safeReturnUrl } from './session.service';
describe('Session and CSRF integration', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessionInterceptor])),
        provideHttpClientTesting(),
        { provide: HttpXsrfTokenExtractor, useValue: { getToken: () => 'ephemeral-test-csrf' } },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('uses cookie CSRF before login/logout and clears session after logout', () => {
    const session = TestBed.inject(SessionService),
      http = TestBed.inject(HttpTestingController);
    session.login('owner', 'ephemeral-test-password').subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ status: 'READY' });
    const login = http.expectOne('/api/v1/auth/login');
    expect(login.request.headers.get('X-XSRF-TOKEN')).toBe('ephemeral-test-csrf');
    expect(login.request.body.username).toBe('owner');
    login.flush({ mode: 'NORMAL', authenticated: true, readOnly: false, username: 'owner' });
    expect(session.value()?.authenticated).toBe(true);
    session.logout().subscribe();
    http.expectOne('/api/v1/auth/csrf').flush({ status: 'READY' });
    const logout = http.expectOne('/api/v1/auth/logout');
    expect(logout.request.headers.get('X-XSRF-TOKEN')).toBe('ephemeral-test-csrf');
    logout.flush(null, { status: 204, statusText: 'No Content' });
    expect(session.value()?.authenticated).toBe(false);
  });
  it('does not leak a CSRF header to an absolute external URL', () => {
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient).post('https://example.test/external', {}).subscribe();
    const request = http.expectOne('https://example.test/external');
    expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    request.flush({});
  });
  it('guards normal data and preserves only safe internal return paths', async () => {
    const router = TestBed.inject(Router);
    const response = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/analytics' } as never),
    );
    const result = firstValueFrom(response as Observable<boolean | UrlTree>);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/me')
      .flush({ mode: 'NORMAL', authenticated: false, readOnly: false, username: null });
    expect(router.serializeUrl((await result) as UrlTree)).toContain(
      '/login?returnUrl=%2Fanalytics',
    );
    for (const value of [
      '//evil.test',
      'https://evil.test',
      '/products/../login',
      '/login?returnUrl=//evil',
      '/\\evil',
      '/store-connection/callback?code=private',
    ])
      expect(safeReturnUrl(value)).toBe('/');
    expect(safeReturnUrl('/products/abc-123')).toBe('/products/abc-123');
    expect(safeReturnUrl('/products?search=coffee&page=1&view=list')).toBe(
      '/products?search=coffee&page=1&view=list',
    );
    expect(safeReturnUrl('/products?search=a&search=b')).toBe('/');
    expect(safeReturnUrl('/products?page=99999999')).toBe('/');
    expect(safeReturnUrl('/optimization?variantId=secret')).toBe('/');
  });
  it('allows anonymous demo reading while refusing the manual-order write route', async () => {
    const router = TestBed.inject(Router);
    const read = firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authGuard({} as never, { url: '/products' } as never),
      ) as Observable<boolean | UrlTree>,
    );
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/me')
      .flush({ mode: 'DEMO', authenticated: false, readOnly: true, username: null });
    expect(await read).toBe(true);
    const write = firstValueFrom(
      TestBed.runInInjectionContext(() =>
        writeGuard({} as never, { url: '/orders/new' } as never),
      ) as Observable<boolean | UrlTree>,
    );
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/me')
      .flush({ mode: 'DEMO', authenticated: false, readOnly: true, username: null });
    expect(router.serializeUrl((await write) as UrlTree)).toBe('/orders');
  });
  it('handles expired sessions without retrying an unsafe request', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const session = TestBed.inject(SessionService);
    session.value.set({ mode: 'NORMAL', authenticated: true, readOnly: false, username: 'owner' });
    TestBed.inject(HttpClient)
      .get('/api/v1/products')
      .subscribe({ error: () => {} });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/products')
      .flush({ message: 'Sign in to continue.' }, { status: 401, statusText: 'Unauthorized' });
    expect(session.value()?.authenticated).toBe(false);
    expect(navigate).toHaveBeenCalled();
  });
  it('preserves only supported dated deep links and explains a forbidden write without retry', () => {
    expect(
      safeReturnUrl('/onboarding/variants/example?startDate=2025-01-01&endDate=2026-01-01'),
    ).toBe('/onboarding/variants/example?startDate=2025-01-01&endDate=2026-01-01');
    for (const path of [
      '/optimization?code=private',
      '/products?returnUrl=https://evil.test',
      '/onboarding?startDate=2025-01-01&startDate=2025-02-01',
    ])
      expect(safeReturnUrl(path)).toBe('/');
    const http = TestBed.inject(HttpTestingController);
    let errorStatus = 0;
    TestBed.inject(HttpClient)
      .post('/api/v1/business-settings', {})
      .subscribe({ error: (e) => (errorStatus = e.status) });
    http.expectOne('/api/v1/auth/csrf').flush({ status: 'READY' });
    http
      .expectOne('/api/v1/business-settings')
      .flush({ code: 'ACCESS_DENIED' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
    http.expectNone('/api/v1/business-settings');
  });
});
