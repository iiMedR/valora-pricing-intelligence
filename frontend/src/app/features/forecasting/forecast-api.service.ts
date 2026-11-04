import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { Page } from '../catalog/models/catalog.models';
export interface ForecastQuery {
  startDate: string;
  endDate: string;
  search: string;
  horizonDays: number;
}
export interface Variant {
  variantId: string;
  productId: string;
  productName: string;
  name: string;
  sku: string;
  status: string;
  productStatus: string;
}
export interface Readiness {
  status: string;
  days: number;
  eligibleDays: number;
  unknownDays: number;
  censoredDays: number;
  zeroDays: number;
  missingPriceDays: number;
  discrepancyDays: number;
  outlierDays: number;
  distinctPrices: number;
  minPrice: string | null;
  maxPrice: string | null;
  reasons: string[];
}
export interface ForecastDay {
  date: string;
  units: number;
  returnedUnits: number;
  listedPrice: string | null;
  effectivePrice: string | null;
  priceSource: string;
  availability: string;
  observedStock: number | null;
  censored: boolean;
  exclusions: string[];
}
export interface ForecastPoint {
  date: string;
  expectedUnits: string;
  lower: number | null;
  upper: number | null;
}
export interface DemandDetail {
  variant: Variant;
  window: { startDate: string; endDate: string; timezone: string; currencyCode: string };
  readiness: Readiness;
  elasticity: {
    status: string;
    method: string;
    estimate: number | null;
    logRmse: number | null;
    samples: number;
    reasons: string[];
  };
  forecast: {
    status: string;
    method: string;
    target: string;
    assumedPrice: string | null;
    totalUnits: string | null;
    daily: ForecastPoint[];
    reasons: string[];
  };
  history: ForecastDay[];
}
export interface Overview {
  results: Page<{ variant: Variant; readiness: Readiness }>;
}
export interface ErrorMetrics {
  mae: number | null;
  wapePercent: number | null;
  bias: number | null;
  predictedUnits: string;
}
export interface Backtest {
  folds: {
    cutoff: string;
    endDate: string;
    status: string;
    trainingDays: number;
    evaluatedDays: number;
    censoredDays: number;
    unknownDays: number;
    actualUnits: number;
    model: ErrorMetrics | null;
    naive: ErrorMetrics | null;
    reasons: string[];
  }[];
}
@Injectable({ providedIn: 'root' })
export class ForecastApi {
  private readonly http = inject(HttpClient);
  overview(q: ForecastQuery, page: number) {
    return this.http
      .get<Overview>('/api/v1/forecasting/overview', {
        params: { startDate: q.startDate, endDate: q.endDate, search: q.search, page, size: 10 },
      })
      .pipe(timeout(20000));
  }
  demand(id: string, q: ForecastQuery) {
    return this.http
      .get<DemandDetail>(`/api/v1/forecasting/variants/${id}/demand`, {
        params: { startDate: q.startDate, endDate: q.endDate, horizonDays: q.horizonDays },
      })
      .pipe(timeout(20000));
  }
  backtest(id: string, q: ForecastQuery) {
    return this.http
      .get<Backtest>(`/api/v1/forecasting/variants/${id}/backtest`, {
        params: { startDate: q.startDate, endDate: q.endDate, horizonDays: q.horizonDays },
      })
      .pipe(timeout(20000));
  }
}
