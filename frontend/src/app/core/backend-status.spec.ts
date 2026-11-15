import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BackendStatus } from './backend-status';
describe('Sidebar backend connection', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [BackendStatus],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('shows loading followed by a real successful response', async () => {
    const fixture = TestBed.createComponent(BackendStatus);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Checking…');
    TestBed.inject(HttpTestingController).expectOne('/api/v1/health').flush({ status: 'UP' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Ready');
  });
  it('shows failure and supports retry', async () => {
    const fixture = TestBed.createComponent(BackendStatus);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/health').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Backend: Unavailable');
    fixture.nativeElement.querySelector('button').click();
    http.expectOne('/api/v1/health').flush({ status: 'UP' });
    await fixture.whenStable();
    expect(fixture.componentInstance.status()).toBe('connected');
  });
  it('rejects unexpected status', async () => {
    const fixture = TestBed.createComponent(BackendStatus);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/health').flush({ status: 'DOWN' });
    await fixture.whenStable();
    expect(fixture.componentInstance.status()).toBe('unavailable');
  });
});
