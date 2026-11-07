import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';

interface History {
  content: {
    id: string;
    evaluatedAt: string;
    modelVersion: string;
    outcomeStatus: string;
    result: { status: string; window: { startDate: string; endDate: string } };
  }[];
  totalElements: number;
}
@Component({
  selector: 'app-evaluation-history',
  template: `
    <h3>Saved evaluation history</h3>
    <p>
      Opening diagnostics does not save an evaluation. Saved conclusions are not measured business
      outcomes.
    </p>
    <button (click)="load(0)" [disabled]="loading()">
      {{ loading() ? 'Loading history…' : 'Load saved evaluations' }}
    </button>
    @if (error()) {
      <p role="alert">History unavailable. Use Load saved evaluations to retry.</p>
    }
    @if (history(); as h) {
      @for (row of h.content; track row.id) {
        <p>
          {{ row.evaluatedAt }} · {{ row.modelVersion }} · {{ row.result.status }} ·
          {{ row.outcomeStatus }}<br />
          {{ row.result.window.startDate }}–{{ row.result.window.endDate }} (exclusive UTC)
        </p>
      } @empty {
        <p>No saved evaluations. Realized outcomes have not been measured.</p>
      }
      <button (click)="load(page - 1)" [disabled]="loading() || page === 0">
        Previous evaluations
      </button>
      <button (click)="load(page + 1)" [disabled]="loading() || (page + 1) * 5 >= h.totalElements">
        Next evaluations
      </button>
    }
  `,
})
export class EvaluationHistory {
  readonly variantId = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  readonly history = signal<History | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  page = 0;
  load(page: number) {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(false);
    this.history.set(null);
    this.page = page;
    this.http
      .get<History>(`/api/v1/optimization/variants/${this.variantId()}/evaluations`, {
        params: { page, size: 5 },
      })
      .pipe(timeout(30000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (h) => {
          this.history.set(h);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}
