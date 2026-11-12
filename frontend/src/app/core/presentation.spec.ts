import { explainReason } from './presentation';
describe('Merchant explanations for response diagnostics', () => {
  it('explains price-level mismatch without implying a recommended price', () => {
    expect(explainReason('PRICE_RESPONSE_SHAPE_MISMATCH')).toContain('not reliable enough');
    expect(explainReason('PRICE_RESPONSE_SHAPE_UNCHECKED')).toContain(
      'not enough repeated observations',
    );
  });
  it('explains temporal stability and missing evidence without a causal guarantee', () => {
    expect(explainReason('DISJOINT_PRICE_RESPONSE_UNSTABLE')).toContain('earlier and later');
    expect(explainReason('DISJOINT_PRICE_RESPONSE_UNCHECKED')).toContain('Both halves');
  });
});
