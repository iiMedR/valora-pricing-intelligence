import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { Page } from '../catalog/models/catalog.models';
import { Variant, DemandDetail, Backtest } from '../forecasting/forecast-api.service';
export type RecommendationStatus =
  | 'ACTIONABLE'
  | 'DIAGNOSTIC_ONLY'
  | 'INSUFFICIENT_DATA'
  | 'UNRELIABLE_ELASTICITY'
  | 'MISSING_COST'
  | 'MISSING_PRICE'
  | 'INACTIVE_VARIANT'
  | 'INVALID_CONSTRAINTS'
  | 'UNAVAILABLE_FORECAST';
export interface OptimizationQuery {
  startDate: string;
  endDate: string;
  horizonDays: number;
  search: string;
}
export interface Scenario {
  price: string;
  expectedUnits: string;
  estimatedContribution: string;
}
export interface Evaluation {
  variant: Variant;
  window: { startDate: string; endDate: string; timezone: string; currencyCode: string };
  horizonDays: number;
  evaluationInstant: string;
  modelVersion: string;
  status: RecommendationStatus;
  reasons: string[];
  assumptions: string[];
  inputs: {
    currentPrice: string | null;
    unitCost: string | null;
    priceEffectiveFrom: string | null;
    costEffectiveFrom: string | null;
    stockCap: number | null;
    stockObservedAt: string | null;
    stockQuality: string | null;
    catalogMin: string | null;
    catalogMax: string | null;
    lowerBound: string | null;
    upperBound: string | null;
    referenceUnits: string | null;
  };
  recommendedPrice: string | null;
  comparison: {
    current: Scenario;
    candidate: Scenario;
    estimatedUplift: string | null;
    estimatedUpliftPercent: string | null;
  } | null;
  elasticity: DemandDetail['elasticity'];
  forecast: DemandDetail['forecast'];
  backtests: Backtest['folds'];
  sensitivity: Scenario[];
}
export interface OptimizationOverview {
  window: Evaluation['window'];
  horizonDays: number;
  countScope: string;
  statusCounts: Record<RecommendationStatus, number>;
  results: Page<Evaluation>;
}
@Injectable({ providedIn: 'root' })
export class OptimizationApi {
  private readonly http = inject(HttpClient);
  overview(q: OptimizationQuery, page: number) {
    return this.http
      .get<OptimizationOverview>('/api/v1/optimization/overview', {
        params: { ...q, page, size: 10 },
      })
      .pipe(timeout(30000));
  }
  evaluation(id: string, q: OptimizationQuery) {
    return this.http
      .get<Evaluation>(`/api/v1/optimization/variants/${id}/recommendation`, {
        params: { startDate: q.startDate, endDate: q.endDate, horizonDays: q.horizonDays },
      })
      .pipe(timeout(30000));
  }
}
