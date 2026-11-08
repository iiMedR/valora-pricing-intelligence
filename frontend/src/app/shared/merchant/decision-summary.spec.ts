import { convertToParamMap } from '@angular/router';
import { decisionNumber, comparisonDates, sensitivityText } from './decision-summary';
import { insightWindow } from './insight-window';
import { DemandDetail } from '../../features/forecasting/forecast-api.service';

describe('Merchant decision explanations', () => {
  const elasticity: DemandDetail['elasticity'] = {
    status: 'READY',
    method: 'TEST',
    estimate: -2,
    logRmse: 0.1,
    samples: 365,
    reasons: [],
    identification: {
      status: 'CONDITIONAL_ASSOCIATION_ONLY',
      calendarPriceR2: 0.1,
      residualLogPriceSd: 0.2,
      uncertaintyStatus: 'UNCERTAINTY_UNAVAILABLE',
      promotionControl: 'PROMOTION_LABELS_UNAVAILABLE',
    },
  };
  it('retains significant financial digits and keeps unknown amounts unavailable', () => {
    expect(decisionNumber('100.0000')).toBe('100');
    expect(decisionNumber('1234.5678')).toBe('1,234.5678');
    expect(decisionNumber('0.0100')).toBe('0.01');
    expect(decisionNumber(null)).toBe('Unavailable');
  });
  it('explains a supported negative association per 1% without a causal claim', () => {
    expect(sensitivityText(elasticity)).toBe(
      'In the analyzed history, a 1% higher price was associated with approximately 2% fewer units sold.',
    );
    expect(sensitivityText({ ...elasticity, estimate: null })).toBeNull();
    expect(sensitivityText({ ...elasticity, estimate: 2 })).toBeNull();
    expect(sensitivityText({ ...elasticity, estimate: -0.0001 })).toContain('0.0001% fewer');
    expect(
      sensitivityText({
        ...elasticity,
        identification: { ...elasticity.identification!, status: 'WEAK_PRICE_IDENTIFICATION' },
      }),
    ).toBeNull();
    expect(sensitivityText({ ...elasticity, identification: undefined })).toBeNull();
  });
  it('uses the selected historical forecast period rather than today', () => {
    expect(comparisonDates('2026-01-01', 30)).toBe('2026-01-01 to 2026-01-30 · UTC');
  });
  it('defaults to30 days while retaining valid deep-link choices', () => {
    const initial = { startDate: '2025-01-01', endDate: '2026-01-01' };
    expect(insightWindow(initial, convertToParamMap({})).horizonDays).toBe(30);
    expect(
      insightWindow(initial, convertToParamMap({ horizonDays: '14', startDate: '2025-06-01' })),
    ).toEqual({ ...initial, startDate: '2025-06-01', horizonDays: 14 });
    expect(
      insightWindow(initial, convertToParamMap({ horizonDays: '99', startDate: '2025-02-30' })),
    ).toEqual({ ...initial, horizonDays: 30 });
  });
});
