import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
@Component({ template: '<h1>Product record</h1><button type="button">Keep focus</button>' })
class RecordPage {}
describe('Merchant application shell', () => {
  // JSDOM has no layout/scroll implementation; Chrome QA checks actual viewport behavior.
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: 'products/:id', component: RecordPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }),
  );
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });
  async function create(demo = false) {
    const f = TestBed.createComponent(App),
      http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/auth/me').flush({
      mode: demo ? 'DEMO' : 'NORMAL',
      authenticated: false,
      readOnly: demo,
      username: null,
    });
    http.expectOne('/api/v1/environment').flush({
      mode: demo ? 'DEMO' : 'NORMAL',
      synthetic: demo,
      label: 'Workspace',
      datasetVersion: demo ? 'demo-v1' : null,
      datasetState: demo ? 'READY' : 'NOT_APPLICABLE',
    });
    await f.whenStable();
    return f;
  }
  it('groups actual routes and distinguishes normal data from the seeded demo', async () => {
    const f = await create();
    const nav = f.nativeElement.querySelector('nav');
    expect(nav.textContent).toContain('Overview');
    expect(nav.textContent).toContain('Data readiness');
    expect(nav.textContent).toContain('Orders');
    expect(nav.querySelectorAll('a').length).toBe(10);
    expect(f.nativeElement.textContent).toContain('Normal workspace');
    expect(
      f.nativeElement
        .querySelector('app-environment-indicator button')
        .getAttribute('aria-haspopup'),
    ).toBe('dialog');
  });
  it('keeps SaaS deep links and presents distinct navigation', async () => {
    const f = await create();
    const router = TestBed.inject(Router),
      navigate = vi.spyOn(router, 'navigateByUrl');
    const previous = window.location.href;
    try {
      window.history.replaceState(null, '', '/saas/settings');
      f.componentInstance.setBusinessMode('SAAS_SUBSCRIPTION');
      await f.whenStable();
      expect(navigate).not.toHaveBeenCalled();
      expect(f.nativeElement.querySelector('nav').textContent).toContain('Revenue & retention');
      expect(f.nativeElement.querySelector('nav').textContent).not.toContain('Shopify');
      expect(f.componentInstance.modeLoaded()).toBe(true);
    } finally {
      window.history.replaceState(null, '', previous);
    }
  });
  it('opens mobile disclosure with a button and restores toggle focus on Escape', async () => {
    const f = await create(true);
    const toggle = f.nativeElement.querySelector('.menu-toggle');
    toggle.click();
    await f.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(f.nativeElement.querySelector('nav').classList.contains('is-open')).toBe(true);
    const focus = vi.spyOn(toggle, 'focus');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await f.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(focus).toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('Demo · Read-only');
    expect(f.nativeElement.querySelector('.demo-banner')).toBeNull();
  });
  it('retains nested active navigation and focuses the destination landmark', async () => {
    const f = await create(true);
    f.componentInstance.menuOpen.set(true);
    await TestBed.inject(Router).navigateByUrl('/products/example');
    await f.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(f.componentInstance.menuOpen()).toBe(false);
    expect(f.nativeElement.querySelector('a[href="/products"]').getAttribute('aria-current')).toBe(
      'page',
    );
    expect(document.activeElement).toBe(f.nativeElement.querySelector('main'));
  });
  it('brings mobile navigation into view when opening from a scrolled page', async () => {
    const f = await create(true);
    const scroll = vi.mocked(window.scrollTo);
    f.componentInstance.toggleMenu();
    expect(f.componentInstance.menuOpen()).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    f.componentInstance.closeMenu();
    expect(f.componentInstance.menuOpen()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  it('preserves control focus for same-page query updates', async () => {
    const f = await create(true),
      router = TestBed.inject(Router);
    await router.navigateByUrl('/products/example');
    await f.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const button = f.nativeElement.querySelector('main button') as HTMLButtonElement;
    button.focus();
    await router.navigateByUrl('/products/example?pricingView=evidence');
    await f.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(button);
  });
});
