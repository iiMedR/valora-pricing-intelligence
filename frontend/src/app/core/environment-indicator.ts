import { ExplainMore } from '../shared/merchant/foundation';
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
  imports: [ExplainMore],
  template: `
    @if (environment(); as mode) {
      <app-explain-more
        [label]="mode.synthetic ? 'Demo · Read-only' : 'Normal workspace'"
        title="Your workspace"
      >
        @if (mode.synthetic) {
          <p>
            <strong>Synthetic Demo Data</strong> · Anonymous, read-only browsing. Generated records,
            not real business sales.
          </p>
          <p>Historical sample sales: 1 January–31 December 2025.</p>
          <p>
            {{ mode.datasetVersion }} ·
            {{ mode.datasetState === 'READY' ? 'Dataset initialized' : 'Dataset not initialized' }}
          </p>
          <a href="http://localhost:4200">Open normal workspace</a>
        } @else {
          <p>Your business records. Looking for seeded examples?</p>
          <a href="http://localhost:4201/products">Open the read-only synthetic demo</a>
        }
      </app-explain-more>
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
