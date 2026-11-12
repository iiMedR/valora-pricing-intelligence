import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PricingGuidance, GuidanceResult } from './pricing-guidance';
import { SessionService } from '../../core/session.service';
const result = (extra: Partial<GuidanceResult> = {}): GuidanceResult => ({
  version: 'deterministic-guidance-v1',
  businessMode: 'ECOMMERCE',
  resourceId: 'v',
  currency: 'MAD',
  period: '30 days',
  asOf: '2026-11-13',
  sourceEvidence: 'KNOWN_INPUT',
  assumptionEvidence: 'MERCHANT_ASSUMPTION',
  resultEvidence: 'CALCULATED_SCENARIO',
  facts: { price: '100.0000', unitCost: '40.0000', unitContribution: '60.0000' },
  current: {},
  scenario: {},
  assumptions: {},
  missing: ['Supply expected units.'],
  exclusions: ['Not a predicted demand response.'],
  ...extra,
});
describe('Pricing guidance provenance and ephemeral scenarios', () => {
  it('does not show a demo-only edit restriction in an authenticated normal workspace', async () => {
    const { f, http } = await create();
    http
      .expectOne((r) => r.url.includes('/guidance/'))
      .flush(result({ facts: { price: '100', unitCost: null, unitContribution: null } }));
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Demo records cannot be edited');
    TestBed.inject(SessionService).value.set({
      mode: 'NORMAL',
      authenticated: true,
      readOnly: false,
      username: 'owner',
    });
    await f.whenStable();
    http
      .expectOne((r) => r.url.includes('/guidance/'))
      .flush(result({ facts: { price: '100', unitCost: null, unitContribution: null } }));
    await f.whenStable();
    expect(f.nativeElement.textContent).not.toContain('Demo records cannot be edited');
    expect(f.nativeElement.textContent).toContain('Add or review unit cost');
  });
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [PricingGuidance],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));
  async function create(saas = false) {
    TestBed.inject(SessionService).value.set({
      mode: saas ? 'NORMAL' : 'DEMO',
      authenticated: saas,
      readOnly: !saas,
      username: saas ? 'owner' : null,
    });
    const f = TestBed.createComponent(PricingGuidance);
    if (saas) {
      f.componentRef.setInput('planId', 'annual');
      f.componentRef.setInput('priceId', 'annual1200');
      f.componentRef.setInput('asOf', '2025-01-31');
    } else {
      f.componentRef.setInput('productId', 'p');
      f.componentRef.setInput('variantId', 'v');
    }
    await f.whenStable();
    return { f, http: TestBed.inject(HttpTestingController) };
  }
  it('shows known inputs and no fabricated volume or optimal-price authority in read-only demo', async () => {
    const { f, http } = await create();
    const req = http.expectOne((r) => r.url.includes('/guidance/'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('currentUnits')).toBe(false);
    expect(req.request.params.get('costsConfirmed')).toBe('false');
    req.flush(result());
    await f.whenStable();
    const text = f.nativeElement.textContent;
    expect(text).toContain('Known catalog inputs');
    expect(text).toContain('Not a predicted demand response');
    expect(text).toContain('Supply expected units');
    expect(f.nativeElement.querySelector('input[type=checkbox]').checked).toBe(false);
    expect(f.nativeElement.querySelector('[aria-label="Candidate price scenario"]')).toBeNull();
    http.expectNone((r) => r.method !== 'GET');
  });
  it('passes explicit assumptions to the server and displays only returned totals', async () => {
    const { f, http } = await create();
    http.expectOne((r) => r.url.includes('/guidance/')).flush(result());
    await f.whenStable();
    f.componentInstance.changed('candidatePrice', '80');
    f.componentInstance.changed('currentUnits', '100');
    f.componentInstance.changed('scenarioUnits', '156.25');
    f.componentInstance.changed('targetMarginPercent', '40');
    f.componentInstance.confirm(true);
    f.componentInstance.load();
    const req = http.expectOne((r) => r.url.includes('/guidance/'));
    expect(req.request.params.get('scenarioUnits')).toBe('156.25');
    expect(req.request.params.get('candidatePrice')).toBe('80');
    expect(req.request.params.get('costsConfirmed')).toBe('true');
    expect(req.request.method).toBe('GET');
    req.flush(
      result({
        current: {
          price: '100',
          unitContribution: '60',
          marginPercent: '60',
          totalContribution: '6000',
        },
        scenario: {
          price: '80',
          unitContribution: '40',
          marginPercent: '50',
          totalContribution: '6250',
          targetMarginPrice: '104.1234',
        },
      }),
    );
    await f.whenStable();
    expect(
      f.nativeElement.querySelector('[aria-label="Candidate price scenario"]').textContent,
    ).toContain('6,250');
    expect(f.nativeElement.textContent).toContain('Merchant assumptions');
    expect(f.nativeElement.textContent).toContain('104.1234 MAD');
    expect(f.nativeElement.textContent).toContain('How was this calculated?');
  });
  it('keeps missing costs unknown and offers the scoped cost-history next step', async () => {
    const { f, http } = await create();
    http
      .expectOne((r) => r.url.includes('/guidance/'))
      .flush(
        result({
          facts: { price: '100', unitCost: null, unitContribution: null },
          missing: ['Recorded unit cost is missing.'],
        }),
      );
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Contribution is unavailable');
    expect(f.nativeElement.querySelector('a').getAttribute('href')).toBe(
      '/products/p/variants/v/history',
    );
    expect(f.componentInstance.fields['assumedUnitCost']).toBeUndefined();
  });
  it('shows validation failures and retries without persisting or silently discarding assumptions', async () => {
    const { f, http } = await create();
    http.expectOne((r) => r.url.includes('/guidance/')).flush(result());
    await f.whenStable();
    f.componentInstance.changed('candidatePrice', '-1');
    f.componentInstance.load();
    http
      .expectOne((r) => r.url.includes('/guidance/'))
      .flush(
        { message: 'Candidate price must be positive.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Candidate price');
    expect(f.componentInstance.fields['candidatePrice']).toBe('-1');
    expect(f.componentInstance.result()?.scenario).toEqual({});
    f.componentInstance.changed('candidatePrice', '80');
    f.componentInstance.load();
    http.expectOne((r) => r.url.includes('/guidance/')).flush(result());
    await f.whenStable();
    expect(f.componentInstance.error()).toBe('');
  });
  it('clears protected results and pending assumptions on session loss', async () => {
    const { f, http } = await create(true);
    const req = http.expectOne((r) => r.url.includes('/guidance'));
    f.componentInstance.fields['retainedSubscribers'] = '10';
    TestBed.inject(SessionService).value.set({
      mode: 'NORMAL',
      authenticated: false,
      readOnly: false,
      username: null,
    });
    await f.whenStable();
    expect(req.cancelled).toBe(true);
    expect(f.componentInstance.result()).toBeNull();
    expect(f.componentInstance.fields).toEqual({});
    expect(f.componentInstance.confirmed).toBe(false);
    expect(f.nativeElement.textContent).not.toContain('10');
  });
  it('cancels a superseded variant and rejects mismatched result identity', async () => {
    const { f, http } = await create();
    const prior = http.expectOne((r) => r.url.includes('/guidance/'));
    f.componentRef.setInput('variantId', 'next');
    await f.whenStable();
    expect(prior.cancelled).toBe(true);
    http.expectOne((r) => r.url.endsWith('/next')).flush(result());
    await f.whenStable();
    expect(f.componentInstance.result()).toBeNull();
    expect(f.componentInstance.error()).toContain('did not match');
  });
  it('keeps annual plan periods and subscription assumptions distinct from product demand', async () => {
    const { f, http } = await create(true);
    const req = http.expectOne((r) => r.url === '/api/v1/saas/plans/annual/guidance');
    expect(req.request.params.get('priceId')).toBe('annual1200');
    expect(req.request.params.get('asOf')).toBe('2025-01-31');
    expect(req.request.params.has('retainedSubscribers')).toBe(false);
    req.flush(
      result({
        businessMode: 'SAAS_SUBSCRIPTION',
        resourceId: 'annual',
        sourceEvidence: 'OBSERVED',
        period: 'YEARLY',
        facts: { price: '1200', monthlyPrice: '100' },
      }),
    );
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('per year');
    expect(f.nativeElement.textContent).toContain(
      'No validated subscription price optimization model',
    );
    expect(f.nativeElement.textContent).toContain('Servicing cost / subscriber / year');
  });
});
