import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EnvironmentService, ApplicationEnvironment } from './environment.service';
import { SessionService } from './session.service';
import { PortfolioStory, PortfolioExamples } from '../shared/merchant/portfolio-examples';
import { PriceComparison } from '../shared/merchant/decision-summary';
import type { Evaluation } from '../features/optimization/optimization-api.service';

const environment: ApplicationEnvironment = {
  mode: 'DEMO',
  synthetic: true,
  label: 'Synthetic portfolio',
  datasetVersion: 'portfolio-v1',
  datasetState: 'READY',
  businessMode: 'ECOMMERCE',
};
const demo = { mode: 'DEMO' as const, authenticated: false, readOnly: true, username: null };
describe('Portfolio-only presentation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it.each([
    { ...environment, mode: 'NORMAL' as const, synthetic: false },
    { ...environment, datasetVersion: 'demo-v1' },
    { ...environment, datasetVersion: null },
    { ...environment, businessMode: 'SAAS_SUBSCRIPTION' as const },
    { ...environment, businessMode: undefined },
    { ...environment, datasetState: 'NOT_INITIALIZED' },
  ])(
    'does not disclose portfolio stories outside a verified portfolio installation: %j',
    async (value) => {
      TestBed.inject(EnvironmentService).value.set(value);
      TestBed.inject(SessionService).value.set(demo);
      const f = TestBed.createComponent(PortfolioStory);
      f.componentRef.setInput('sku', 'PORT-PROMOTION-1');
      await f.whenStable();
      expect(f.nativeElement.textContent.trim()).toBe('');
    },
  );
  it('discloses hidden marketing and clears it on session loss or unverified metadata', async () => {
    const e = TestBed.inject(EnvironmentService),
      s = TestBed.inject(SessionService);
    e.value.set(environment);
    s.value.set(demo);
    const f = TestBed.createComponent(PortfolioStory);
    f.componentRef.setInput('sku', 'PORT-PROMOTION-1');
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Known synthetic failure');
    expect(f.nativeElement.textContent).toContain('Approval is not evidence of correctness');
    s.clear();
    await f.whenStable();
    expect(f.nativeElement.textContent.trim()).toBe('');
    s.value.set(demo);
    e.value.set(null);
    await f.whenStable();
    expect(f.nativeElement.textContent.trim()).toBe('');
  });
  it('links examples to exact catalog names without a new lookup endpoint', async () => {
    TestBed.inject(EnvironmentService).value.set(environment);
    TestBed.inject(SessionService).value.set(demo);
    const f = TestBed.createComponent(PortfolioExamples);
    await f.whenStable();
    const links = [...f.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    const marketing = links.find((a) => a.textContent!.includes('Hidden marketing'))!;
    expect(marketing.getAttribute('href')).toContain('search=Ceramic%20Mug');
    expect(marketing.textContent).toContain('Known synthetic failure');
    expect(links).toHaveLength(10);
  });
  it('keeps an approved comparison experimental, preserving API amounts and the known wrong-cost warning', async () => {
    TestBed.inject(EnvironmentService).value.set(environment);
    TestBed.inject(SessionService).value.set(demo);
    const f = TestBed.createComponent(PriceComparison);
    const result = {
      status: 'ACTIONABLE',
      variant: {
        sku: 'PORT-COST_CHANGE_UNKNOWN-2',
        productName: 'Example',
        name: 'Standard',
        variantId: 'id',
      },
      window: { currencyCode: 'MAD', endDate: '2026-01-01' },
      horizonDays: 30,
      inputs: { currentPrice: '100' },
      recommendedPrice: '90',
      comparison: {
        current: { price: '100', expectedUnits: '100', estimatedContribution: '6000' },
        candidate: { price: '90', expectedUnits: '120', estimatedContribution: '6123.4567' },
        estimatedUplift: '123.4567',
        estimatedUpliftPercent: '2.0576',
      },
      elasticity: { status: 'UNAVAILABLE', estimate: null, reasons: [] },
    } as unknown as Evaluation;
    f.componentRef.setInput('evaluation', result);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Experimental model suggestion');
    expect(f.nativeElement.textContent).toContain('Not causally validated');
    expect(f.nativeElement.textContent).toContain('Known synthetic failure');
    expect(f.nativeElement.textContent).toContain('6,123.4567');
    expect(result.status).toBe('ACTIONABLE');
    expect(result.recommendedPrice).toBe('90');
  });
  it('drops verified environment metadata during retry and after an API error', () => {
    const e = TestBed.inject(EnvironmentService),
      http = TestBed.inject(HttpTestingController);
    e.load();
    http.expectOne('/api/v1/environment').flush(environment);
    expect(e.value()).toEqual(environment);
    e.load();
    expect(e.value()).toBeNull();
    http.expectOne('/api/v1/environment').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(e.value()).toBeNull();
    expect(e.error()).toBe(true);
  });
});
