import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Landing } from './landing';
describe('Valora public landing', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('offers a local demo in normal mode without requiring login and labels the example honestly', async () => {
    const f = TestBed.createComponent(Landing);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'NORMAL',
      synthetic: false,
      label: 'Normal',
      datasetVersion: null,
      datasetState: 'NOT_APPLICABLE',
    });
    await f.whenStable();
    expect(f.nativeElement.querySelector('h1').textContent).toBe(
      'Make your next pricing decision a clearer one.',
    );
    expect(f.nativeElement.querySelector('.primary-action').getAttribute('href')).toBe(
      'http://localhost:4207/login',
    );
    expect(f.nativeElement.querySelector('.sign-in').getAttribute('href')).toBe('/login');
    expect(f.nativeElement.querySelector('nav a').getAttribute('href')).toBe('/#how-it-works');
    expect(f.nativeElement.textContent).toContain('Historical demo comparison: 1–30 January 2026.');
    expect(f.nativeElement.textContent).toContain('not causally validated');
    expect(f.nativeElement.querySelectorAll('app-brand-mark')).toHaveLength(2);
    TestBed.inject(HttpTestingController).expectNone('/api/v1/auth/me');
  });
  it('uses same-installation products in verified demo mode', async () => {
    const f = TestBed.createComponent(Landing);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'DEMO',
      synthetic: true,
      label: 'Demo',
      datasetVersion: 'portfolio-v1',
      datasetState: 'READY',
    });
    await f.whenStable();
    expect(f.nativeElement.querySelector('.primary-action').getAttribute('href')).toBe('/login');
    expect(f.nativeElement.querySelector('.sign-in').getAttribute('href')).toBe('/login');
  });
  it('keeps public content and working sign-in visible when metadata is unavailable', async () => {
    const f = TestBed.createComponent(Landing);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/environment')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await f.whenStable();
    expect(f.nativeElement.querySelector('h1')).toBeTruthy();
    expect(f.nativeElement.querySelector('.sign-in').getAttribute('href')).toBe('/login');
    expect(f.nativeElement.querySelector('.primary-action').getAttribute('href')).toBe(
      'http://localhost:4207/login',
    );
  });
});
