import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Page } from '../catalog/models/catalog.models';
import {
  HistoryKind,
  HistoryPage,
  InventoryWrite,
  Order,
  OrderDetail,
  OrderWrite,
  PeriodWrite,
  Refund,
  RefundWrite,
} from './history.models';
@Injectable({ providedIn: 'root' })
export class HistoryApi {
  private readonly http = inject(HttpClient);
  orders(query: {
    page: number;
    size: number;
    from: string;
    to: string;
    status: string;
    source: string;
  }) {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    for (const key of ['from', 'to', 'status', 'source'] as const)
      if (query[key]) params = params.set(key, query[key]);
    return this.http.get<Page<Order>>('/api/v1/sales/orders', { params });
  }
  order(id: string) {
    return this.http.get<OrderDetail>('/api/v1/sales/orders/' + id);
  }
  createOrder(body: OrderWrite) {
    return this.http.post<OrderDetail>('/api/v1/sales/orders', body);
  }
  refund(id: string, body: RefundWrite) {
    return this.http.post<Refund>('/api/v1/sales/orders/' + id + '/refunds', body);
  }
  history(variant: string, kind: HistoryKind, page = 0) {
    return this.http.get<HistoryPage>(
      '/api/v1/products/variants/' + variant + '/' + kind + '-history',
      { params: { page, size: 20 } },
    );
  }
  addHistory(variant: string, kind: HistoryKind, body: PeriodWrite | InventoryWrite) {
    return this.http.post('/api/v1/products/variants/' + variant + '/' + kind + '-history', body);
  }
}
export function localTimeNow(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
}
export function isoTime(value: string): string {
  return new Date(value).toISOString();
}
