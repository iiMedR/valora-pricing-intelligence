import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, timeout } from 'rxjs';
export interface ApplicationEnvironment {
  mode: 'NORMAL' | 'DEMO';
  synthetic: boolean;
  label: string;
  datasetVersion: string | null;
  datasetState: string;
  businessMode?: 'ECOMMERCE' | 'SAAS_SUBSCRIPTION';
}
/** One verified environment response shared by the workspace indicator and demo presentation. */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private pending?: Subscription;
  readonly value = signal<ApplicationEnvironment | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  load(onLoaded: (value: ApplicationEnvironment) => void = () => {}) {
    this.pending?.unsubscribe();
    this.value.set(null);
    this.loading.set(true);
    this.error.set(false);
    this.pending = this.http
      .get<ApplicationEnvironment>('/api/v1/environment')
      .pipe(timeout(5000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (value) => {
          if (
            !value ||
            !['DEMO', 'NORMAL'].includes(value.mode) ||
            value.synthetic !== (value.mode === 'DEMO')
          ) {
            this.error.set(true);
          } else {
            this.value.set(value);
            onLoaded(value);
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
