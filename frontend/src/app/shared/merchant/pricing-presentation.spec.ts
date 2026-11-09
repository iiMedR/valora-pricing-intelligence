import { actionable, pricingGroup, pricingLabel, pricingReason } from './pricing-presentation';
import type { Evaluation } from '../../features/optimization/optimization-api.service';
describe('Merchant pricing status', () => {
  it('distinguishes every returned status without inventing eligible comparisons', () => {
    const base = {
      status: 'ACTIONABLE',
      recommendedPrice: '90.0000',
      comparison: {
        current: { price: '100', expectedUnits: '100', estimatedContribution: '6000' },
        candidate: { price: '90', expectedUnits: '120', estimatedContribution: '6000' },
        estimatedUplift: null,
        estimatedUpliftPercent: null,
      },
      reasons: [],
    } as unknown as Evaluation;
    expect(actionable(base)).toBe(true);
    expect(pricingLabel(base)).toBe('Actionable');
    for (const [status, group] of [
      ['DIAGNOSTIC_ONLY', 'uncertain'],
      ['UNRELIABLE_ELASTICITY', 'uncertain'],
      ['INSUFFICIENT_DATA', 'history'],
      ['MISSING_COST', 'evidence'],
      ['MISSING_PRICE', 'evidence'],
      ['INVALID_CONSTRAINTS', 'evidence'],
      ['INACTIVE_VARIANT', 'inactive'],
      ['UNAVAILABLE_FORECAST', 'unavailable'],
    ] as const) {
      const row = { ...base, status };
      expect(actionable(row)).toBe(false);
      expect(pricingGroup(row)).toBe(group);
    }
    expect(pricingGroup({ ...base, comparison: null })).toBe('unavailable');
    expect(pricingReason({ ...base, comparison: null })).toContain('incomplete');
  });
  it('uses one plain sentence for confounding and never translates an unreliable coefficient into advice', () => {
    const row = {
      status: 'DIAGNOSTIC_ONLY',
      reasons: ['PRICE_CALENDAR_CONFOUNDING_RISK', 'NO_CALIBRATED_INTERVAL'],
    } as Evaluation;
    expect(pricingReason(row)).toBe(
      'Prices mostly changed with the calendar, so price sensitivity cannot be isolated.',
    );
    expect(pricingReason(row)).not.toContain('%');
  });
});
