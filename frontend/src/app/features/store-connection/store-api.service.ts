import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';
export interface StoreStatus {
  status: string;
  configured: boolean;
  shop: string | null;
  scopes: string[];
  connectedAt: string | null;
  disconnectedAt: string | null;
  accessExpiresAt: string | null;
  refreshExpiresAt: string | null;
  lastError: string | null;
  synchronization: string;
}
@Injectable({ providedIn: 'root' })
export class StoreApi {
  private readonly http = inject(HttpClient);
  status() {
    return this.http.get<StoreStatus>('/api/v1/integrations/shopify/status').pipe(timeout(10000));
  }
  connect(shop: string) {
    return this.http
      .post<{ authorizationUrl: string }>('/api/v1/integrations/shopify/connect', { shop })
      .pipe(timeout(15000));
  }
  disconnect() {
    return this.http
      .post<StoreStatus>('/api/v1/integrations/shopify/disconnect', {})
      .pipe(timeout(20000));
  }
}
export const SHOPIFY_NAVIGATE = new InjectionToken<(url: string) => void>(
  'Shopify authorization navigation',
  { providedIn: 'root', factory: () => (url) => window.location.assign(url) },
);
export function validAuthorizationUrl(value: string, shop: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === shop &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      url.pathname === '/admin/oauth/authorize'
    );
  } catch {
    return false;
  }
}
