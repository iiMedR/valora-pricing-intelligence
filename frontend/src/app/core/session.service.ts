import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, shareReplay, tap, timeout } from 'rxjs';
export interface Session {
  mode: 'NORMAL' | 'DEMO';
  authenticated: boolean;
  readOnly: boolean;
  username: string | null;
}
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  readonly value = signal<Session | null>(null);
  private pending?: Observable<Session>;
  ensure() {
    if (this.pending) return this.pending;
    this.pending = this.http.get<Session>('/api/v1/auth/me').pipe(
      timeout(10000),
      tap((v) => {
        if (
          !v ||
          !['NORMAL', 'DEMO'].includes(v.mode) ||
          typeof v.authenticated !== 'boolean' ||
          (v.mode === 'DEMO' && (v.authenticated || !v.readOnly))
        )
          throw Error('Invalid session response');
        this.value.set(v);
      }),
      finalize(() => (this.pending = undefined)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.pending;
  }
  csrf() {
    return this.http.get('/api/v1/auth/csrf').pipe(timeout(10000));
  }
  login(username: string, password: string) {
    return this.http.post<Session>('/api/v1/auth/login', { username, password }).pipe(
      timeout(15000),
      tap((v) => this.value.set(v)),
    );
  }
  logout() {
    return this.http.post<void>('/api/v1/auth/logout', {}).pipe(
      timeout(15000),
      tap(() => this.clear()),
    );
  }
  clear() {
    this.value.set({ mode: 'NORMAL', authenticated: false, readOnly: false, username: null });
  }
}
export function safeReturnUrl(value: string | null): string {
  if (!value || /[\\#\u0000-\u0020]/.test(value)) return '/';
  const [path, query] = value.split('?');
  if (
    !/^\/(?:saas(?:\/(?:plans|subscriptions|revenue|insights|settings))?|onboarding(?:\/variants\/[a-zA-Z0-9-]+)?|products(?:\/[a-zA-Z0-9/-]+)?|categories|settings|orders(?:\/[a-zA-Z0-9/-]+)?|analytics|forecasting|optimization|store-connection)$/.test(
      path,
    )
  )
    return '/';
  if (!query) return path;
  const parameters = new URLSearchParams(query);
  for (const [key, val] of parameters) {
    if (parameters.getAll(key).length !== 1) return '/';
    if (path === '/saas' || path.startsWith('/saas/')) {
      const date =
        /^\d{4}-\d{2}-\d{2}$/.test(val) &&
        val >= '2000-01-01' &&
        val <= new Date().toISOString().slice(0, 10) &&
        Number.isFinite(Date.parse(val)) &&
        new Date(val).toISOString().slice(0, 10) === val;
      if (
        (['start', 'asOf'].includes(key) && date) ||
        (key === 'search' && val.length <= 80 && !/[\u0000-\u001f@]/.test(val)) ||
        (key === 'sort' && ['name', 'price'].includes(val)) ||
        (key === 'page' && /^\d{1,5}$/.test(val) && Number(val) <= 10000) ||
        (key === 'planId' && /^[A-Za-z0-9_-]{1,64}$/.test(val))
      )
        continue;
      return '/';
    }
    const catalog = path.startsWith('/products');
    const evidence = ['/analytics', '/forecasting', '/optimization'].includes(path);
    const uuid = (text: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);
    if (
      evidence &&
      ((key === 'pricingView' && ['all', 'actionable', 'evidence'].includes(val)) ||
        (key === 'pricingStatus' &&
          [
            'all',
            'actionable',
            'uncertain',
            'history',
            'evidence',
            'unavailable',
            'inactive',
          ].includes(val)))
    )
      continue;
    if (
      (catalog || evidence) &&
      ((['search', 'catalogSearch'].includes(key) &&
        val.length <= (catalog || key === 'catalogSearch' ? 160 : 100) &&
        !/[\u0000-\u001f]/.test(val)) ||
        (['variant', 'variantId', 'productId'].includes(key) && uuid(val)) ||
        (['categoryId', 'catalogCategory'].includes(key) && (val === '' || uuid(val))) ||
        (['status', 'catalogStatus'].includes(key) && ['', 'ACTIVE', 'ARCHIVED'].includes(val)) ||
        (['view', 'catalogView'].includes(key) && ['grid', 'list'].includes(val)) ||
        (['page', 'catalogPage'].includes(key) && /^\d{1,6}$/.test(val) && Number(val) <= 100000))
    )
      continue;
    if (
      !(['startDate', 'endDate'].includes(key) && /^\d{4}-\d{2}-\d{2}$/.test(val)) &&
      !(key === 'horizonDays' && ['7', '14', '30'].includes(val))
    )
      return '/';
    if (parameters.getAll(key).length !== 1) return '/';
  }
  return path + '?' + parameters.toString();
}
