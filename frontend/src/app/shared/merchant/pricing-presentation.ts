import type { Evaluation } from '../../features/optimization/optimization-api.service';
import { reasonSummary } from '../../core/presentation';
export type PricingGroup =
  'actionable' | 'uncertain' | 'history' | 'evidence' | 'unavailable' | 'inactive';
export function actionable(e: Evaluation): e is Evaluation & {
  comparison: NonNullable<Evaluation['comparison']>;
  recommendedPrice: string;
} {
  const c = e.comparison;
  const decimal = (value: unknown) => typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value);
  return (
    e.status === 'ACTIONABLE' &&
    decimal(e.recommendedPrice) &&
    !!c &&
    !!c.current &&
    !!c.candidate &&
    [c.current, c.candidate].every(
      (row) =>
        decimal(row.price) && decimal(row.expectedUnits) && decimal(row.estimatedContribution),
    )
  );
}
export function pricingGroup(e: Evaluation): PricingGroup {
  if (e.status === 'ACTIONABLE') return actionable(e) ? 'actionable' : 'unavailable';
  if (['DIAGNOSTIC_ONLY', 'UNRELIABLE_ELASTICITY'].includes(e.status)) return 'uncertain';
  if (e.status === 'INSUFFICIENT_DATA') return 'history';
  if (e.status === 'UNAVAILABLE_FORECAST') return 'unavailable';
  if (e.status === 'INACTIVE_VARIANT') return 'inactive';
  return ['MISSING_COST', 'MISSING_PRICE', 'INVALID_CONSTRAINTS'].includes(e.status)
    ? 'evidence'
    : 'unavailable';
}
export function pricingLabel(e: Evaluation): string {
  return {
    actionable: 'Actionable',
    uncertain: 'Confounded or uncertain',
    history: 'Insufficient history',
    evidence: 'Needs evidence',
    unavailable: 'Unavailable',
    inactive: 'Inactive',
  }[pricingGroup(e)];
}
export function pricingReason(e: Evaluation): string {
  if (e.status === 'ACTIONABLE' && !actionable(e))
    return 'The returned comparison is incomplete. Review this variant again.';
  if (actionable(e))
    return 'Compare the estimated contribution before deciding; this is not a guaranteed price effect.';
  if (e.status === 'INACTIVE_VARIANT')
    return 'This variant is inactive; review its catalog status.';
  return reasonSummary(e.reasons).split('. ')[0].replace(/\.$/, '') + '.';
}
