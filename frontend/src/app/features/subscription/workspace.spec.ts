import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionWorkspace } from './workspace';
import { SessionService } from '../../core/session.service';

describe('Subscription workspace', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SubscriptionWorkspace],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function create(path = '/saas/settings') {
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'url', { get: () => path });
    TestBed.inject(SessionService).value.set({
      mode: 'NORMAL',
      authenticated: true,
      readOnly: false,
      username: 'owner',
    });
    const f = TestBed.createComponent(SubscriptionWorkspace),
      http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(
      (r) => r.url === '/api/v1/saas/metrics' || r.url === '/api/v1/saas/plans',
    );
    req.flush(
      path.endsWith('insights')
        ? {
            content: [
              {
                id: 'basic',
                name: 'Basic',
                archived: false,
                prices: [
                  {
                    id: 'p100',
                    amount: 100,
                    currency: 'MAD',
                    interval: 'MONTHLY',
                    effectiveDate: '2025-01-01',
                  },
                ],
                activeSubscriptions: 2,
                mrr: 200,
              },
            ],
            totalElements: 1,
            page: 0,
            size: 10,
          }
        : { currency: 'MAD' },
    );
    await f.whenStable();
    return { f, http };
  }
  it('previews an immutable snapshot and only commits after the explicit action', async () => {
    const { f, http } = await create();
    Object.assign(f.componentInstance.entry, {
      sourceId: 'plan-source',
      planId: 'basic',
      name: 'Basic',
      priceId: 'p100',
      amount: '100',
    });
    f.componentInstance.submit();
    const preview = http.expectOne('/api/v1/saas/entry/preview');
    expect(preview.request.body.amount).toBe('100');
    preview.flush({ status: 'VALID', sourceId: 'plan-source', message: 'Validated' });
    await f.whenStable();
    expect(f.nativeElement.querySelector('dialog').textContent).toContain('100 MAD MONTHLY');
    http.expectNone('/api/v1/saas/entry/commit');
    f.componentInstance.entry.amount = '500';
    f.componentInstance.commit();
    f.componentInstance.commit();
    const commit = http.expectOne('/api/v1/saas/entry/commit');
    expect(commit.request.body.amount).toBe('100');
    commit.flush({ status: 'RECORDED', message: 'Recorded once' });
    http.expectOne((r) => r.url === '/api/v1/saas/metrics').flush({ currency: 'MAD' });
    await f.whenStable();
    expect(f.nativeElement.querySelector('dialog')).toBeNull();
  });
  it('retains editable input after validation failure and never records automatically', async () => {
    const { f, http } = await create();
    f.componentInstance.entry.sourceId = 'bad';
    f.componentInstance.submit();
    http
      .expectOne('/api/v1/saas/entry/preview')
      .flush({ message: 'Price version not found' }, { status: 400, statusText: 'Bad request' });
    await f.whenStable();
    expect(f.componentInstance.entry.sourceId).toBe('bad');
    expect(f.nativeElement.textContent).toContain('Price version not found');
    http.expectNone('/api/v1/saas/entry/commit');
  });
  it('shows needs evidence without manufacturing price recommendations', async () => {
    const { f } = await create('/saas/insights');
    expect(f.nativeElement.textContent).toContain('Needs evidence');
    (f.nativeElement.querySelector('article button') as HTMLButtonElement).click();
    await f.whenStable();
    const dialog = f.nativeElement.querySelector('dialog');
    expect(dialog.textContent).toContain('No validated SaaS');
    expect(dialog.querySelector('svg')).toBeNull();
  });
  it('clears protected results and preview on session loss', async () => {
    const { f } = await create('/saas/insights');
    TestBed.inject(SessionService).clear();
    await f.whenStable();
    expect(f.componentInstance.plans()).toBeNull();
    expect(f.componentInstance.preview()).toBeNull();
  });
  it('requests a bounded historical plan trend relative to its chosen as-of date', async () => {
    const { f, http } = await create('/saas/insights');
    f.componentInstance.asOf = '2025-01-31';
    f.componentInstance.history(f.componentInstance.plans()!.content[0]);
    const r = http.expectOne((request) => request.url.endsWith('/plans/basic/history'));
    expect(r.request.params.get('start')).toBe('2025-01-02');
    expect(r.request.params.get('asOf')).toBe('2025-01-31');
    r.flush({ planId: 'basic', currency: 'MAD', trend: [] });
    await f.whenStable();
    expect(f.componentInstance.trendBusy()).toBe(false);
  });
});
