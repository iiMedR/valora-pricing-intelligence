import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [ZardButtonComponent, ZardInputComponent, FormsModule, DatePipe, KeyValuePipe],
  template: `
    <section class="sync-panel" aria-labelledby="sync-title">
      <p class="eyebrow">READ-ONLY SHOPIFY IMPORT</p>
      <h2 id="sync-title">Data synchronization</h2>
      @if (error()) {
        <p role="alert" class="error">{{ error() }}</p>
      }
      @if (result(); as sync) {
        @if (sync.demo) {
          <p>Synthetic demo: imports are disabled. Existing demo data remains unchanged.</p>
        } @else {
          <p>
            {{
              sync.connected
                ? 'Connected store: ' + sync.shop
                : 'Connect Shopify before importing data.'
            }}
          </p>
          <p>
            Last successful import through (UTC):
            {{
              sync.lastSuccessfulSync
                ? (sync.lastSuccessfulSync | date: 'yyyy-MM-dd HH:mm' : 'UTC')
                : 'No completed import'
            }}
          </p>
          <p class="muted">
            {{
              sync.liveValidation === 'LIVE_SHOPIFY_NOT_VERIFIED'
                ? 'Live store sync has not been verified with a real Shopify store.'
                : 'Live store verification status is unavailable.'
            }}
          </p>
          <p class="muted">
            Required read scopes: {{ sync.requiredScopes.join(', ') }}. Import progress and
            readiness are assessed separately.
          </p>
          <div class="import-controls">
            <label>Historical start (UTC)<input z-input type="date" [(ngModel)]="from" /></label>
            <label
              >Historical end, exclusive (UTC)<input z-input type="date" [(ngModel)]="to"
            /></label>
            <button
              z-button
              class="primary"
              (click)="start('INITIAL')"
              [disabled]="busy() || active() || !sync.connected || !from || !to"
            >
              Import historical data
            </button>
            <button
              z-button
              zType="outline"
              (click)="start('INCREMENTAL')"
              [disabled]="busy() || active() || !sync.connected || !sync.lastSuccessfulSync"
            >
              Sync latest changes
            </button>
          </div>
          <p class="muted">
            Choose up to 31 days within the recent 59 days. Each attempt permits 100 pages; a
            partial job can resume from its saved page. Latest changes use a 48-hour overlap and
            scan current catalog/inventory.
          </p>
          @if (sync.latest; as job) {
            <div class="job" role="status" aria-live="polite">
              <h3>Latest import: {{ job.state }}</h3>
              <p>{{ job.kind }} · attempt {{ job.attempts }}</p>
              <p>
                {{ job.from | date: 'yyyy-MM-dd HH:mm' : 'UTC' }} →
                {{ job.to | date: 'yyyy-MM-dd HH:mm' : 'UTC' }} UTC
              </p>
              @for (point of sync.checkpoints; track point.resource) {
                <p>
                  {{ point.resource }}: {{ point.complete ? 'Complete' : 'Pending / page saved' }}
                </p>
              }
              <dl>
                @for (entry of job.counts | keyvalue; track entry.key) {
                  <dt>{{ entry.key }}</dt>
                  <dd>{{ entry.value }}</dd>
                }
              </dl>
              @if (job.errorCode) {
                <p class="error">
                  Import stopped: {{ job.errorCode }}. Resolve the cause before resuming; committed
                  pages are retained.
                </p>
              }
              @if (job.state === 'PARTIAL' || job.state === 'FAILED') {
                <button
                  z-button
                  zType="outline"
                  (click)="resume(job.id)"
                  [disabled]="busy() || !sync.connected"
                >
                  Resume failed import
                </button>
              }
              @if (job.warnings.length) {
                <h4>Coverage and warnings</h4>
                <ul>
                  @for (warning of job.warnings; track warning) {
                    <li>{{ warning.replaceAll('_', ' ').toLowerCase() }}</li>
                  }
                </ul>
              }
            </div>
          }
          <p>
            Costs may be unavailable. Current prices, costs and stock are point observations, not
            historical series. Older orders require extra Shopify approval. Ambiguous financial
            changes stop for reconciliation; nothing is written to Shopify.
          </p>
          <button z-button zType="outline" (click)="history()" [disabled]="busy()">
            View import history
          </button>
          @if (jobs(); as records) {
            <ul>
              @for (record of records; track record.id) {
                <li>
                  {{ record.kind }} · {{ record.state }} ·
                  {{ record.from | date: 'yyyy-MM-dd' : 'UTC' }}
                </li>
              } @empty {
                <li>No import jobs.</li>
              }
            </ul>
          }
        }
      } @else {
        <p role="status">Loading synchronization status…</p>
      }
      <button z-button zType="outline" (click)="load()" [disabled]="busy()">
        Refresh import status
      </button>
    </section>
  `,
  styles: [
    `
      .sync-panel {
        max-width: 760px;
        padding: 26px;
        margin: 28px 0;
        background: white;
        border: 1px solid #d4dfd7;
        border-radius: 10px;
      }
      p,
      li,
      dt,
      dd,
      label {
        font-size: 13px;
        line-height: 1.8;
        overflow-wrap: anywhere;
      }
      .import-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        align-items: end;
        margin: 22px 0;
      }
      label {
        display: grid;
        gap: 7px;
        max-width: 100%;
      }
      input {
        max-width: 100%;
        box-sizing: border-box;
      }
      .job {
        padding: 18px;
        background: #f4f7f4;
        margin: 18px 0;
      }
      dt {
        font-weight: 600;
      }
      dd {
        margin: 0 0 7px;
      }
      h2 {
        font-size: 24px;
      }
      @media (max-width: 600px) {
        .sync-panel {
          padding: 18px 12px;
        }
        .import-controls {
          display: grid;
        }
        .job {
          padding: 12px;
        }
      }
    `,
  ],
})
export class SyncPanel {
  private readonly http = inject(HttpClient);
  readonly result = signal<SyncStatus | null>(null);
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
          this.error.set('');
        },
        error: (e) => this.error.set(apiError(e)),
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
