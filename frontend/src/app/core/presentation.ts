/** Merchant wording only. Backend codes and eligibility decisions remain authoritative. */
export function statusLabel(code: string): string {
  const labels: Record<string, string> = {
    ACTIONABLE: 'Conditional suggestion available',
    DIAGNOSTIC_ONLY: 'Recommendation withheld',
    UNRELIABLE_ELASTICITY: 'Price sensitivity is unreliable',
    INSUFFICIENT_DATA: 'Not enough evidence',
    MISSING_COST: 'Unit cost missing or stale',
    MISSING_PRICE: 'Reference price missing or stale',
    INACTIVE_VARIANT: 'Archived or inactive',
    INVALID_CONSTRAINTS: 'Price limits need review',
    UNAVAILABLE_FORECAST: 'No supported sales forecast',
    BASELINE_ONLY: 'Sales baseline only',
    READY: 'Evidence checks passed',
    WEAK_PRICE_IDENTIFICATION: 'Price sensitivity cannot be isolated reliably',
    CONDITIONAL_ASSOCIATION_ONLY: 'Observational association only',
    NOT_ESTIMABLE: 'Not enough independent evidence',
  };
  return labels[code] ?? code.replaceAll('_', ' ').toLowerCase();
}
export function explainReason(code: string): string {
  const reasons: Record<string, string> = {
    SEASONAL_OR_CALENDAR_CONFOUNDING:
      'Prices mostly changed with the calendar, so price sensitivity cannot be isolated.',
    PRICE_CALENDAR_CONFOUNDING_RISK:
      'Prices mostly changed with the calendar, so price sensitivity cannot be isolated.',
    PRICE_CALENDAR_COLLINEARITY: 'Price changes are too closely tied to calendar effects.',
    INSUFFICIENT_INDEPENDENT_PRICE_VARIATION:
      'Too little price variation remains after accounting for calendar effects.',
    TOO_FEW_CONTROLLED_SAMPLES:
      'At least 130 eligible days are needed to estimate the calendar controls.',
    ELASTICITY_NOT_TRUSTWORTHY: 'Price sensitivity could not be estimated reliably.',
    NO_CALIBRATED_INTERVAL: 'No calibrated uncertainty interval is available.',
    OBSERVATIONAL_ASSOCIATION: 'Association is not a proven causal price effect.',
    CONTINUOUS_AVAILABILITY_NOT_PROVEN:
      'Beginning-of-day stock observations do not prove all-day availability.',
    LOW_ELIGIBLE_COVERAGE: 'Too few days have usable sales, price and stock evidence.',
    CRITICAL_STOCK_COVERAGE: 'Too much inventory history is unknown or affected by stockouts.',
    ZERO_DISCREPANCY_OR_OUTLIER_SELECTION:
      'Zero sales, price discrepancies or unusual observations prevent a reliable comparison.',
    ELASTICITY_SUBWINDOW_UNSTABLE:
      'Price sensitivity changes too much when the most recent 28 days are excluded.',
    BACKTEST_EVIDENCE_INSUFFICIENT:
      'Historical forecast tests do not meet the required evidence checks.',
    NO_FRESH_TRUSTED_POSITIVE_STOCK: 'There is no recent, trusted positive stock observation.',
    RECENT_PRICE_MIX_NOT_REFERENCE_DEMAND:
      'Recent sales were recorded at different prices, so the reference forecast is not supported.',
    FORECAST_REFERENCE_PRICE_MISMATCH:
      'The forecast price does not match the effective reference price.',
    MISSING_OR_STALE_EFFECTIVE_COST: 'A dated, authoritative unit cost is missing or too old.',
    MISSING_OR_STALE_EFFECTIVE_PRICE:
      'A dated, authoritative reference price is missing or too old.',
    PRICE_DISCREPANCY_CONFOUNDING:
      'Discounted or mismatched prices were excluded; no promotion effect is inferred.',
    EXCESS_CENSORING: 'Too many days may have lost sales because stock ran out.',
    EXCESS_UNKNOWN_INVENTORY: 'Inventory availability is unknown for too much of the window.',
    ZERO_SALES_SELECTION: 'Zero-sale observations prevent a reliable log-price association.',
    NO_POSITIVE_SUPPORTED_FORECAST: 'No positive, supported observed-sales forecast is available.',
    NOT_MEASURED: 'Realized outcomes have not been measured.',
  };
  return reasons[code] ?? code.replaceAll('_', ' ').toLowerCase();
}
export function reasonSummary(codes: string[]): string {
  const specific = codes.filter(
    (code) =>
      ![
        'OBSERVATIONAL_ASSOCIATION',
        'NO_CALIBRATED_INTERVAL',
        'CONTINUOUS_AVAILABILITY_NOT_PROVEN',
      ].includes(code),
  );
  return specific.length
    ? specific.map(explainReason).join(' ')
    : 'Association only; no calibrated interval.';
}
