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
});
