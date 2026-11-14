import { describe, expect, it } from 'vitest';
import { subscriptionSelection, subscriptionQuery } from './subscription-state';
import { safeReturnUrl } from '../../core/session.service';
describe('Subscription URL selection', () => {
  it('keeps historical dates, search, sort, page and selected opaque plan', () => {
    const selection = subscriptionSelection(
      new URLSearchParams(
        'asOf=2025-01-31&start=2025-01-02&search=Basic&sort=price&page=2&planId=basic_v1',
      ),
      '2026-11-13',
    );
    expect(selection).toEqual({
      asOf: '2025-01-31',
      start: '2025-01-02',
      search: 'Basic',
      sort: 'price',
      page: 2,
      planId: 'basic_v1',
    });
    expect(subscriptionQuery(selection).planId).toBe('basic_v1');
    expect(safeReturnUrl('/saas/plans?asOf=2025-01-31&search=Basic&planId=basic_v1')).toContain(
      'planId=basic_v1',
    );
  });
  it('bounds invalid dates, identifiers, search and pagination without unsafe return paths', () => {
    const state = subscriptionSelection(
      new URLSearchParams(
        'asOf=2025-02-31&search=name@example.com&sort=unknown&page=999999&planId=../private',
      ),
      '2026-11-13',
    );
    expect(state).toEqual({
      asOf: '2026-11-13',
      start: '2026-10-15',
      search: '',
      sort: 'name',
      page: 0,
      planId: null,
    });
    for (const url of [
      '/saas/plans?planId=../secret',
      '/saas?search=name@example.com',
      '/saas?asOf=2025-02-31',
      '/saas?search=a&search=b',
      '/saas?token=private',
      'https://elsewhere.test/saas',
    ])
      expect(safeReturnUrl(url)).toBe('/dashboard');
  });
  it('uses a bounded window relative to a historical as-of date', () => {
    const state = subscriptionSelection(
      new URLSearchParams('asOf=2025-01-31&start=2026-01-01'),
      '2026-11-13',
    );
    expect(state.start).toBe('2025-01-02');
  });
});
