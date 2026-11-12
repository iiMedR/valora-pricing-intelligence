import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionWorkspace } from './workspace';
import { SessionService } from '../../core/session.service';
import { Confirmation } from '../../core/confirmation';

describe('Subscription workspace', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [SubscriptionWorkspace],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    // Detail now composes a separately tested read-only guidance panel. Parent tests retain their
    // real plan-navigation scope and explicitly satisfy the child's initial source read.
    for (const req of http.match((r) => r.url.endsWith('/guidance'))) {
      expect(req.request.method).toBe('GET');
      if (!req.cancelled)
        req.flush({
          version: 'deterministic-guidance-v1',
          businessMode: 'SAAS_SUBSCRIPTION',
          resourceId: 'basic',
          currency: 'MAD',
          period: 'MONTHLY',
          asOf: '2025-01-31',
          sourceEvidence: 'OBSERVED',
          assumptionEvidence: 'MERCHANT_ASSUMPTION',
          resultEvidence: 'CALCULATED_SCENARIO',
          facts: { price: '100', monthlyPrice: '100' },
          current: {},
          scenario: {},
          assumptions: {},
          missing: [],
          exclusions: [],
        });
    }
    http.verify();
  });
  async function create(path = '/saas/settings') {
    const router = TestBed.inject(Router);
    let currentUrl = path;
    Object.defineProperty(router, 'url', { get: () => currentUrl });
    TestBed.inject(SessionService).value.set({
      mode: 'NORMAL',
      authenticated: true,
      readOnly: false,
      username: 'owner',
    });
    const f = TestBed.createComponent(SubscriptionWorkspace),
      http = TestBed.inject(HttpTestingController);
    vi.spyOn(router, 'navigateByUrl').mockImplementation(async (target) => {
      currentUrl = typeof target === 'string' ? target : router.serializeUrl(target);
      f.componentInstance.navigate(currentUrl);
      return true;
    });
    const req = http.expectOne(
      (r) => r.url === '/api/v1/saas/metrics' || r.url === '/api/v1/saas/plans',
    );
    req.flush(
      path.split('?')[0].endsWith('insights') || path.split('?')[0].endsWith('plans')
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
    for (const [name, value] of Object.entries({
      source: 'plan-source',
      plan: 'basic',
      name: 'Basic',
      price: 'p100',
      amount: '100',
    })) {
      const input = f.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    f.detectChanges();
    await f.whenStable();
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
    for (const [name, value] of Object.entries({
      source: 'bad',
      plan: 'basic',
      name: 'Basic',
      price: 'missing',
      amount: '100',
    })) {
      const input = f.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    f.detectChanges();
    await f.whenStable();
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
    f.componentInstance.review(f.componentInstance.plans()!.content[0]);
    await f.whenStable();
    (
      Array.from(f.nativeElement.querySelectorAll('#plan-detail button')).find(
        (button) => (button as HTMLButtonElement).textContent?.trim() === 'Why this result?',
      ) as HTMLButtonElement
    ).click();
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
    const rows = f.componentInstance.plans()!;
    f.componentInstance.update();
    http.expectOne((request) => request.url.endsWith('/saas/plans')).flush(rows);
    f.componentInstance.history(f.componentInstance.plans()!.content[0]);
    const r = http.expectOne((request) => request.url.endsWith('/plans/basic/history'));
    expect(r.request.params.get('start')).toBe('2025-01-02');
    expect(r.request.params.get('asOf')).toBe('2025-01-31');
    r.flush({ planId: 'basic', currency: 'MAD', trend: [] });
    await f.whenStable();
    expect(f.componentInstance.trendBusy()).toBe(false);
  });
  it('preserves search and selected-plan URL context without refetching the same page', async () => {
    const { f, http } = await create('/saas/plans');
    const rows = f.componentInstance.plans()!;
    f.componentInstance.search = 'Basic';
    f.componentInstance.update();
    http
      .expectOne((r) => r.url.endsWith('/saas/plans') && r.params.get('search') === 'Basic')
      .flush(rows);
    await f.whenStable();
    f.componentInstance.review(rows.content[0]);
    await f.whenStable();
    expect(TestBed.inject(Router).url).toContain('planId=basic');
    expect(f.nativeElement.querySelector('#plan-detail').textContent).toContain('Basic');
    http.expectNone((r) => r.url.endsWith('/saas/plans'));
    f.componentInstance.backToPlans();
    await f.whenStable();
    expect(TestBed.inject(Router).url).toContain('search=Basic');
    expect(f.componentInstance.search).toBe('Basic');
    http.expectNone((r) => r.url.endsWith('/saas/plans'));
  });
  it('lets a plan-only as-of control choose historical dates without an inaccessible start field', async () => {
    const { f, http } = await create('/saas/plans');
    const rows = f.componentInstance.plans()!;
    f.componentInstance.asOf = '2025-01-31';
    f.componentInstance.update();
    http
      .expectOne((r) => r.url.endsWith('/saas/plans') && r.params.get('asOf') === '2025-01-31')
      .flush(rows);
    await f.whenStable();
    expect(f.componentInstance.error()).toBe('');
    expect(f.componentInstance.start).toBe('2025-01-02');
  });
  it('keeps displayed prices and context on the applied selection while filters are drafts', async () => {
    const { f, http } = await create('/saas/plans');
    const rows = f.componentInstance.plans()!;
    f.componentInstance.asOf = '2024-01-01';
    f.componentInstance.search = 'private@example.com';
    expect(f.componentInstance.selectionChanged()).toBe(true);
    expect(f.componentInstance.current(rows.content[0])?.id).toBe('p100');
    expect(f.componentInstance.contextQuery().search).toBeNull();
    f.componentInstance.review(rows.content[0]);
    await f.whenStable();
    expect(TestBed.inject(Router).url).not.toContain('example');
    http.expectNone((request) => request.url.endsWith('/saas/plans'));
  });
  it('lets expired-session navigation remove pending protected content', async () => {
    const { f } = await create();
    f.componentInstance.entry.sourceId = 'private-source';
    f.componentInstance.busy.set(true);
    TestBed.inject(SessionService).clear();
    expect(f.componentInstance.canLeave()).toBe(true);
    await f.whenStable();
    expect(f.componentInstance.entry.sourceId).toBe('');
    expect(f.componentInstance.metrics()).toBeNull();
  });
  it('keeps a cancelled dirty draft and clears it only after explicit confirmation', async () => {
    const { f } = await create();
    const input = f.nativeElement.querySelector('input[name=source]') as HTMLInputElement;
    input.value = 'keep-draft';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await f.whenStable();
    let clearing = f.componentInstance.clearEntry();
    TestBed.inject(Confirmation).answer(false);
    await clearing;
    expect(f.componentInstance.entry.sourceId).toBe('keep-draft');
    clearing = f.componentInstance.clearEntry();
    TestBed.inject(Confirmation).answer(true);
    await clearing;
    await f.whenStable();
    expect(f.componentInstance.entry.sourceId).toBe('');
    expect(input.value).toBe('');
  });
  it('keeps the full returned decimal string in daily inspection', async () => {
    const { f } = await create();
    f.componentInstance.section.set('');
    f.componentInstance.metrics.set({
      start: '2025-01-01',
      asOf: '2025-01-01',
      currency: 'MAD',
      coverage: 'PARTIAL_MANUAL_HISTORY',
      activePaidSubscriptions: 1,
      mrr: '100.123456789012',
      arr: '1201.481481468144',
      revenuePerPaidSubscription: '100.123456',
      collectedNetCash: '100',
      beginningPaidSubscriptions: 0,
      endedBeginningSubscriptions: 0,
      subscriptionChurnPercent: null,
      grossRevenueChurnPercent: null,
      netRevenueChurnPercent: null,
      movement: {
        beginning: '0',
        newMrr: '100.123456789012',
        expansion: '0',
        contraction: '0',
        churned: '0',
        reactivation: '0',
        ending: '100.123456789012',
      },
      trend: [{ date: '2025-01-01', mrr: '100.123456789012' }],
    });
    await f.whenStable();
    expect(f.nativeElement.querySelector('table').textContent).toContain('100.123456789012');
    // A reactivation followed by an end can have zero beginning/ending MRR but real history.
    const result = f.componentInstance.metrics()!;
    f.componentInstance.metrics.set({
      ...result,
      mrr: '0',
      movement: {
        ...result.movement,
        beginning: '0',
        newMrr: '0',
        reactivation: '100.123456789012',
        churned: '100.123456789012',
      },
      trend: [...result.trend, { date: '2025-01-02', mrr: '0' }],
    });
    await f.whenStable();
    expect(f.nativeElement.querySelector('svg')).not.toBeNull();
    expect(f.nativeElement.textContent).not.toContain(
      'Not enough billing history to show a meaningful trend.',
    );
  });
});
