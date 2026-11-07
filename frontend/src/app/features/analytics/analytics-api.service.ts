import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
import { Page } from '../catalog/models/catalog.models';

export interface Metrics {
  grossSales: string;
  refundAmount: string;
  netSales: string;
  unitsSold: number;
  unitsRefunded: number;
  orders: number;
  grossAverageOrderValue: string | null;
  salesLines: number;
  knownCostLines: number;
  refundEvents: number;
  knownCostRefundEvents: number;
  knownCostSales: string;
  knownCostRefunds: string;
  knownCostNetSales: string;
  historicalSoldCost: string;
  knownContributionBeforeReturnRecovery: string | null;
  knownContributionMarginPercent: string | null;
  salesCostCoveragePercent: string | null;
  costCoverageState: string;
}
export interface ReportingRange {
  startDate: string;
  endDate: string;
  timezone: string;
  currencyCode: string;
}
export interface Overview {
  range: ReportingRange;
  metrics: Metrics;
}
export interface Trends {
  range: ReportingRange;
  granularity: string;
  content: { date: string; metrics: Metrics }[];
}
export interface Performance {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string | null;
  status: string;
  productStatus: string;
  metrics: Metrics;
}
export interface PerformancePage {
  range: ReportingRange;
  results: Page<Performance>;
}
export interface Stock {
  productId: string;
  variantId: string;
  productName: string;
  name: string;
  sku: string;
  status: string;
  productStatus: string;
  quantityAvailable: number | null;
  observedAt: string | null;
  stockState: string;
  stale: boolean;
}
export interface Inventory {
  range: ReportingRange;
  asOf: string;
  staleAfterHours: number;
  summary: {
    variants: number;
    stockouts: number;
    unknown: number;
    uncertain: number;
    stale: number;
  };
  results: Page<Stock>;
}
export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  granularity: string;
  search: string;
  sort: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsApi {
  private readonly http = inject(HttpClient);
  private get<T>(path: string, params: Record<string, string | number>) {
    return this.http.get<T>('/api/v1/analytics/' + path, { params }).pipe(timeout(15000));
  }
  overview(q: AnalyticsQuery) {
    return this.get<Overview>('overview', { startDate: q.startDate, endDate: q.endDate });
  }
  trends(q: AnalyticsQuery) {
    return this.get<Trends>('trends', {
      startDate: q.startDate,
      endDate: q.endDate,
      granularity: q.granularity,
    });
  }
  products(q: AnalyticsQuery, page: number, productId?: string) {
    return this.get<PerformancePage>(productId ? `products/${productId}/variants` : 'products', {
      startDate: q.startDate,
      endDate: q.endDate,
      search: q.search,
      sort: q.sort,
      page,
      size: 10,
    });
  }
  inventory(q: AnalyticsQuery, page: number) {
    return this.get<Inventory>('inventory', {
      startDate: q.startDate,
      endDate: q.endDate,
      page,
      size: 10,
    });
  }
}

// Format the transmitted decimal string exactly. Only chart coordinates use Number.
export function decimalText(value: string | null): string {
  if (value === null) return 'Unavailable';
  const [whole, fraction = '0000'] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + fraction.padEnd(4, '0');
}
export function utcPreset(days: number, now = new Date()): { startDate: string; endDate: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

// The permanent demo is a historical 2025 workspace; normal mode keeps its real UTC range.
export function initialWindow(days: number, demo: boolean) {
  return demo ? { startDate: '2025-01-01', endDate: '2026-01-01' } : utcPreset(days);
}
