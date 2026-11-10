import { DeferBlockState, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentIndicator } from './environment-indicator';

describe('EnvironmentIndicator', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [EnvironmentIndicator],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('identifies the separate SaaS installation before a user starts a task', async () => {
    const fixture = TestBed.createComponent(EnvironmentIndicator);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'NORMAL',
      synthetic: false,
      label: 'Local workspace',
      datasetVersion: null,
      datasetState: 'NOT_APPLICABLE',
      businessMode: 'SAAS_SUBSCRIPTION',
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('SaaS workspace');
    expect(fixture.nativeElement.textContent).not.toContain('Normal workspace');
  });

  it('clearly labels seeded and uninitialized demo environments', async () => {
    const fixture = TestBed.createComponent(EnvironmentIndicator);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'DEMO',
      synthetic: true,
      label: 'Synthetic Demo Data',
      datasetVersion: 'demo-v1',
      datasetState: 'READY',
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Demo · Read-only');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    const blocks = await fixture.getDeferBlocks();
    await blocks[0].render(DeferBlockState.Complete);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('dialog').textContent).toContain(
      'Synthetic Demo Data',
    );
    expect(fixture.nativeElement.textContent).toContain('not real business sales');
    fixture.componentInstance.load();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'DEMO',
      synthetic: true,
      label: 'Synthetic Demo Data',
      datasetVersion: 'demo-v1',
      datasetState: 'NOT_INITIALIZED',
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Dataset not initialized');
  });

  it('does not label normal records as demo data', async () => {
    const fixture = TestBed.createComponent(EnvironmentIndicator);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'NORMAL',
      synthetic: false,
      label: 'Local workspace',
      datasetVersion: null,
      datasetState: 'NOT_APPLICABLE',
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
  });

  it('shows unknown environment on failure and retries without assuming normal mode', async () => {
    const fixture = TestBed.createComponent(EnvironmentIndicator);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/environment')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Environment unverified');
    fixture.nativeElement.querySelector('button').click();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/environment').flush({
      mode: 'DEMO',
      synthetic: true,
      label: 'Synthetic Demo Data',
      datasetVersion: 'demo-v1',
      datasetState: 'READY',
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Demo · Read-only');
  });
});
