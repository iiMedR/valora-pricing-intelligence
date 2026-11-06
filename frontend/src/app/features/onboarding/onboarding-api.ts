import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { SyncStatus } from '../store-connection/sync-panel';
export interface Finding {
  status: string;
  code: string;
  message: string;
  provenance: string | null;
}
export interface Window {
  startDate: string;
  endDate: string;
  modelAsOf: string;
  assessedAt: string;
  currencyCode: string;
}
export interface Assessment {
  variant: {
    variantId: string;
    productId: string;
    productName: string;
    name: string;
    sku: string;
    status: string;
    productStatus: string;
  };
  inputs: {
    currentPrice: string | null;
    currentCost: string | null;
    minimum: string | null;
    maximum: string | null;
    stock: number | null;
    stockObservedAt: string | null;
    costSource: string | null;
    costRecordedAt: string | null;
    mappingSource: string;
    providerSku: string | null;
    localEditConflict: boolean;
  };
  coverage: {
    orders: number;
    lines: number;
    knownCostLines: number;
    salesDays: number;
    firstSale: string | null;
    lastSale: string | null;
    merchandiseRefunds: number;
  };
  dimensions: Record<string, Finding>;
  analytics: Finding;
  forecasting: Finding;
  optimization: Finding;
  forecastStatus: string;
  optimizationStatus: string;
  forecastReasons: string[];
  optimizationReasons: string[];
  demandDiagnostics: {
    status: string;
    days: number;
    eligibleDays: number;
    unknownDays: number;
    censoredDays: number;
    distinctPrices: number;
    reasons: string[];
  };
  catalogHref: string;
  historyHref: string;
}
export interface Summary {
  window: Window;
  synthetic: boolean;
  scope: string;
  workflowState: string;
  workflowExplanation: string;
  connectionStatus: string;
  synchronization: SyncStatus;
  counts: Record<string, number>;
  checklist: { code: string; priority: number; message: string; href: string }[];
  liveValidation: string;
  limitations: string[];
}
export interface Variants {
  window: Window;
  synthetic: boolean;
  scope: string;
  filter: string;
  results: {
    content: Assessment[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}
export interface Detail {
  window: Window;
  synthetic: boolean;
  scope: string;
  assessment: Assessment;
}
@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly http = inject(HttpClient);
  private params(from: string, to: string) {
    let params = new HttpParams();
    if (from) params = params.set('startDate', from);
    if (to) params = params.set('endDate', to);
    return params;
  }
  summary(from = '', to = '') {
    return this.http
      .get<Summary>('/api/v1/onboarding/summary', { params: this.params(from, to) })
      .pipe(timeout(30000));
  }
  variants(page: number, size: number, search: string, status: string, from = '', to = '') {
    return this.http
      .get<Variants>('/api/v1/onboarding/readiness/variants', {
        params: this.params(from, to)
          .set('page', page)
          .set('size', size)
          .set('search', search)
          .set('status', status),
      })
      .pipe(timeout(30000));
  }
  detail(id: string, from = '', to = '') {
    return this.http
      .get<Detail>('/api/v1/onboarding/readiness/variants/' + encodeURIComponent(id), {
        params: this.params(from, to),
      })
      .pipe(timeout(30000));
  }
}
