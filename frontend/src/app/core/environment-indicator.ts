import { EnvironmentDetails } from './environment-details';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';

export interface ApplicationEnvironment {
  mode: 'NORMAL' | 'DEMO';
  synthetic: boolean;
  label: string;
  datasetVersion: string | null;
  datasetState: string;
}

@Component({
  selector: 'app-environment-indicator',
  imports: [EnvironmentDetails],
  template: `
    @if (environment(); as mode) {
      <button
        type="button"
        class="workspace-mode-toggle"
        aria-haspopup="dialog"
        (click)="detailsOpen.set(true)"
      >
        {{ mode.synthetic ? 'Demo · Read-only' : 'Normal workspace' }}
      </button>
      @if (detailsOpen()) {
        @defer {
          <app-environment-details [environment]="mode" (closed)="detailsOpen.set(false)" />
        } @placeholder {
          <span role="status">Opening workspace details…</span>
        } @error {
          <span role="alert">Workspace details could not load. Reload this page to try again.</span>
        }
      }
    }
    @if (error()) {
      <div class="environment-warning" role="alert">
        Environment unverified. Check the backend connection before interpreting records.
        <button type="button" (click)="load()" [disabled]="loading()">Retry environment</button>
      </div>
    } @else if (loading() && !environment()) {
      <p class="environment-check" role="status">Checking application environment…</p>
    }
  `,
})
export class EnvironmentIndicator {
  readonly detailsOpen = signal(false);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly environment = signal<ApplicationEnvironment | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set(false);
    this.http
      .get<ApplicationEnvironment>('/api/v1/environment')
      .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          if (
            !value ||
            (value.mode !== 'DEMO' && value.mode !== 'NORMAL') ||
            value.synthetic !== (value.mode === 'DEMO')
          ) {
            this.error.set(true);
          } else {
            this.environment.set(value);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
