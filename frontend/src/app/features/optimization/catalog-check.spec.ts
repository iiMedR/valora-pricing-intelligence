import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogCheck } from './catalog-check';
import { Evaluation, OptimizationQuery } from './optimization-api.service';

describe('Cancellable catalog check', () => {
  const query: OptimizationQuery = {
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    search: '',
    horizonDays: 30,
  };
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [CatalogCheck, provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    TestBed.inject(CatalogCheck).cancel();
    TestBed.inject(HttpTestingController).verify();
  });
  const service = () => TestBed.inject(CatalogCheck);
  const http = () => TestBed.inject(HttpTestingController);
  function request(page: number) {
    return http().expectOne(
      (r) => r.url.endsWith('/optimization/overview') && r.params.get('page') === String(page),
    );
  }
  function response(page: number, total = 23) {
    const rows = Array.from(
      { length: Math.max(0, Math.min(10, total - page * 10)) },
      (_, i) =>
        ({
          variant: { variantId: 'v' + (page * 10 + i) },
          status: 'DIAGNOSTIC_ONLY',
        }) as Evaluation,
    );
    return {
      results: {
        content: rows,
        page,
        totalElements: total,
        totalPages: Math.ceil(total / 10),
        size: 10,
      },
    };
  }
  it('checks sequential GET batches and only completes after every variant', () => {
    service().start(query);
    const first = request(0);
    expect(first.request.params.get('size')).toBe('10');
    expect(first.request.params.get('horizonDays')).toBe('30');
    http().expectNone((r) => r.params.get('page') === '1');
    first.flush(response(0));
    expect(service().checked()).toBe(10);
    expect(service().state()).toBe('running');
    request(1).flush(response(1));
    expect(service().checked()).toBe(20);
    expect(service().state()).toBe('running');
    request(2).flush(response(2));
    expect(service().checked()).toBe(23);
    expect(service().total()).toBe(23);
    expect(service().state()).toBe('complete');
  });
  it('retains completed results on error and retries the failed page', () => {
    service().start(query);
    request(0).flush(response(0));
    request(1).flush({ message: 'Temporary failure' }, { status: 503, statusText: 'Unavailable' });
    expect(service().state()).toBe('error');
    expect(service().checked()).toBe(10);
    service().retry();
    http().expectNone((r) => r.params.get('page') === '0');
    request(1).flush(response(1));
    request(2).flush(response(2));
    expect(service().state()).toBe('complete');
  });
  it('cancels the in-flight batch, retains partial results and resumes deliberately', () => {
    service().start(query);
    request(0).flush(response(0));
    const second = request(1);
    service().cancel();
    expect(second.cancelled).toBe(true);
    expect(service().state()).toBe('cancelled');
    expect(service().checked()).toBe(10);
    service().retry();
    request(1).flush(response(1));
    request(2).flush(response(2));
    expect(service().state()).toBe('complete');
  });
  it('clears old selections and cancels requests on reset', () => {
    service().start(query);
    const old = request(0);
    service().reset();
    expect(old.cancelled).toBe(true);
    expect(service().checked()).toBe(0);
    expect(service().state()).toBe('idle');
    service().retry();
    http().expectNone((r) => r.url.endsWith('/overview'));
  });
  it('does not claim completion if live pagination changes', () => {
    service().start(query);
    request(0).flush(response(0));
    request(1).flush(response(1, 24));
    expect(service().state()).toBe('error');
    expect(service().checked()).toBe(10);
    service().retry();
    const fresh = request(0);
    expect(service().checked()).toBe(0);
    fresh.flush(response(0, 0));
    expect(service().state()).toBe('complete');
  });
  it('rejects duplicate variants rather than double-counting completion', () => {
    service().start(query);
    request(0).flush(response(0));
    const duplicate = response(1);
    duplicate.results.content[0] = duplicate.results.content[1];
    request(1).flush(duplicate);
    expect(service().state()).toBe('error');
    expect(service().checked()).toBe(10);
  });
  it('pauses after ten batches and requires an explicit continuation beyond100variants', () => {
    service().start(query);
    for (let page = 0; page < 10; page++) request(page).flush(response(page, 123));
    expect(service().checked()).toBe(100);
    expect(service().state()).toBe('cancelled');
    expect(service().limitReached()).toBe(true);
    http().expectNone((r) => r.params.get('page') === '10');
    service().retry();
    for (let page = 10; page < 13; page++) request(page).flush(response(page, 123));
    expect(service().state()).toBe('complete');
    expect(service().checked()).toBe(123);
  });
});
