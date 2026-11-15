import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HealthService } from './health.service';
@Component({
  selector: 'app-backend-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <button
    type="button"
    (click)="refresh()"
    [disabled]="status() === 'loading'"
    aria-label="Check backend connection"
    title="Check connection again"
  >
    <span
      class="status-dot"
      [class.ready]="status() === 'connected'"
      [class.failed]="status() === 'unavailable'"
      aria-hidden="true"
    ></span>
    <span role="status" aria-live="polite" aria-atomic="true"
      >Backend:
      {{
        status() === 'loading' ? 'Checking…' : status() === 'connected' ? 'Ready' : 'Unavailable'
      }}</span
    >
  </button>`,
  styles: [
    `
      :host {
        display: block;
        margin-top: auto;
        padding-top: 12px;
        flex-shrink: 0;
      }
      button {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 40px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--muted);
        color: var(--muted-foreground);
        font-size: 12px;
        text-align: left;
        font-weight: 400;
      }
      button:hover:not(:disabled) {
        border-color: var(--interactive);
      }
      button:disabled {
        opacity: 1;
        cursor: wait;
      }
      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #b45309;
        flex: none;
      }
      .ready {
        background: #10a37f;
      }
      .failed {
        background: #dc2626;
      }
    `,
  ],
})
export class BackendStatus {
  private readonly health = inject(HealthService);
  private readonly destroy = inject(DestroyRef);
  readonly status = signal<'loading' | 'connected' | 'unavailable'>('loading');
  constructor() {
    this.refresh();
  }
  refresh() {
    if (this.status() === 'loading' && this.checking) return;
    this.checking = true;
    this.status.set('loading');
    this.health
      .check()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.checking = false;
          this.status.set(r?.status === 'UP' ? 'connected' : 'unavailable');
        },
        error: () => {
          this.checking = false;
          this.status.set('unavailable');
        },
      });
  }
  private checking = false;
}
