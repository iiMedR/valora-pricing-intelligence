import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component, DestroyRef, inject, signal, output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCloudDownload,
  lucideRefreshCw,
  lucideArrowRight,
  lucideLockKeyhole,
  lucideDownload,
} from '@ng-icons/lucide';
import { interval, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiError } from '../catalog/services/catalog-api.service';

export interface SyncJob {
  id: string;
  kind: string;
  state: string;
  from: string;
  to: string;
  counts: Record<string, number>;
  warnings: string[];
  errorCode: string | null;
  attempts: number;
}
export interface SyncStatus {
  demo: boolean;
  connected: boolean;
  shop: string | null;
  lastSuccessfulSync: string | null;
  latest: SyncJob | null;
  checkpoints: { resource: string; complete: boolean }[];
  requiredScopes: string[];
  liveValidation: string;
}
@Component({
  selector: 'app-sync-panel',
  imports: [
    ZardButtonComponent,
    ZardInputComponent,
    FormsModule,
    DatePipe,
    KeyValuePipe,
    RouterLink,
    NgIcon,
  ],
  templateUrl: './sync-panel.html',
  styleUrl: './sync-panel.css',
  providers: [
    provideIcons({
      lucideCloudDownload,
      lucideRefreshCw,
      lucideArrowRight,
      lucideLockKeyhole,
      lucideDownload,
    }),
  ],
})
export class SyncPanel {
  private readonly http = inject(HttpClient);
  readonly result = signal<SyncStatus | null>(null);
  readonly statusChange = output<SyncStatus | null>();
  readonly jobs = signal<SyncJob[] | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  to = new Date().toISOString().slice(0, 10);
  constructor() {
    const destroy = inject(DestroyRef);
    this.load();
    interval(2000)
      .pipe(takeUntilDestroyed(destroy))
      .subscribe(() => {
        if (this.active() && !this.busy()) this.load(false);
      });
  }
  active() {
    return ['PENDING', 'RUNNING'].includes(this.result()?.latest?.state ?? '');
  }
  load(showBusy = true) {
    if (showBusy) this.busy.set(true);
    this.http
      .get<SyncStatus>('/api/v1/shopify/sync/status')
      .pipe(
        timeout(15000),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (s) => {
          this.result.set(s);
          this.statusChange.emit(s);
          this.error.set('');
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.statusChange.emit(null);
        },
      });
  }
  start(kind: string) {
    if (this.busy() || this.active() || !this.result()?.connected || this.result()?.demo) return;
    this.submit(
      kind === 'INITIAL'
        ? { kind, from: this.from + 'T00:00:00Z', to: this.to + 'T00:00:00Z', maxPages: 100 }
        : { kind, maxPages: 100 },
    );
  }
  resume(id: string) {
    if (this.busy() || this.active() || !this.result()?.connected || this.result()?.demo) return;
    this.submit({ resumeJobId: id });
  }
  private submit(body: object) {
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<SyncJob>('/api/v1/shopify/sync', body)
      .pipe(
        timeout(15000),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({ next: () => this.load(), error: (e) => this.error.set(apiError(e)) });
  }
  history() {
    this.http
      .get<SyncJob[]>('/api/v1/shopify/sync/jobs?page=0&size=20')
      .pipe(timeout(15000))
      .subscribe({
        next: (rows) => this.jobs.set(rows),
        error: (e) => this.error.set(apiError(e)),
      });
  }
}
