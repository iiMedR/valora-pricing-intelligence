import { SessionService } from '../../core/session.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EvaluationHistory } from './evaluation-history';

describe('Explicit evaluation history', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [EvaluationHistory],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('loads bounded history only on demand and labels outcomes unmeasured', async () => {
    const f = TestBed.createComponent(EvaluationHistory);
    f.componentRef.setInput('variantId', 'v1');
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectNone(() => true);
    f.componentInstance.load(0);
    const r = http.expectOne((r) => r.url.endsWith('/v1/evaluations'));
    expect(r.request.method).toBe('GET');
    expect(r.request.params.get('size')).toBe('5');
    r.flush({ content: [], totalElements: 0 });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Realized outcomes have not been measured');
    expect(f.nativeElement.querySelectorAll('button')[2].disabled).toBe(true);
  });
  it('allows retry after failure without retaining stale snapshots', async () => {
    const f = TestBed.createComponent(EvaluationHistory);
    f.componentRef.setInput('variantId', 'v1');
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    f.componentInstance.load(0);
    http
      .expectOne((r) => r.url.endsWith('/evaluations'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    f.componentInstance.load(0);
    http
      .expectOne((r) => r.url.endsWith('/evaluations'))
      .flush({
        content: [
          {
            id: 'one',
            evaluatedAt: '2026-11-12',
            modelVersion: 'weekday-season-trend-qr-v2',
            outcomeStatus: 'NOT_MEASURED',
            result: {
              status: 'DIAGNOSTIC_ONLY',
              window: { startDate: '2025-01-01', endDate: '2026-01-01' },
            },
          },
        ],
        totalElements: 1,
      });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('DIAGNOSTIC_ONLY');
    expect(f.nativeElement.textContent).toContain('NOT_MEASURED');
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
  it('saves a fresh normal evaluation explicitly once, then loads real returned history', async () => {
    TestBed.inject(SessionService).value.set({
      mode: 'NORMAL',
      authenticated: true,
      readOnly: false,
      username: 'owner',
    });
    const f = TestBed.createComponent(EvaluationHistory);
    f.componentRef.setInput('variantId', 'v1');
    f.componentRef.setInput('evaluation', {
      window: { startDate: '2025-01-01', endDate: '2026-01-01' },
      horizonDays: 7,
    });
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    f.componentInstance.save();
    f.componentInstance.save();
    const request = http.expectOne((r) => r.url.endsWith('/evaluations'));
    expect(request.request.method).toBe('POST');
    expect(request.request.params.get('startDate')).toBe('2025-01-01');
    request.flush({ result: { status: 'DIAGNOSTIC_ONLY' } });
    http
      .expectOne((r) => r.url.endsWith('/evaluations') && r.method === 'GET')
      .flush({ content: [], totalElements: 0 });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain(
      'Fresh evaluation saved: Recommendation withheld',
    );
    expect(f.nativeElement.textContent).toContain('Realized outcomes are not measured');
  });
  it('never saves in demo and retains an explicit forbidden-save error in normal mode', async () => {
    const session = TestBed.inject(SessionService);
    session.value.set({ mode: 'DEMO', authenticated: false, readOnly: true, username: null });
    const f = TestBed.createComponent(EvaluationHistory);
    f.componentRef.setInput('variantId', 'v1');
    f.componentRef.setInput('evaluation', {
      window: { startDate: '2025-01-01', endDate: '2026-01-01' },
      horizonDays: 7,
    });
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    f.componentInstance.save();
    http.expectNone(() => true);
    expect(f.nativeElement.textContent).not.toContain('Save fresh evaluation');
    session.value.set({ mode: 'NORMAL', authenticated: true, readOnly: false, username: 'owner' });
    f.componentInstance.save();
    http
      .expectOne((r) => r.method === 'POST')
      .flush({ code: 'ACCESS_DENIED' }, { status: 403, statusText: 'Forbidden' });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('not automatically retried');
    http.expectNone((r) => r.method === 'POST');
  });
});
