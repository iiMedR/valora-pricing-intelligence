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
  return value &&
    /^\/(?:onboarding(?:\/variants\/[a-zA-Z0-9-]+)?|products(?:\/[a-zA-Z0-9/-]+)?|categories|settings|orders(?:\/[a-zA-Z0-9/-]+)?|analytics|forecasting|optimization|store-connection)$/.test(
      value,
    )
    ? value
    : '/';
}
