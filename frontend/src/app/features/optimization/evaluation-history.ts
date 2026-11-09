import { ZardButtonComponent } from '@/shared/components/button';
import { SessionService } from '../../core/session.service';
import { statusLabel } from '../../core/presentation';
import { apiError } from '../catalog/services/catalog-api.service';
import { Evaluation } from './optimization-api.service';
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
  imports: [ZardButtonComponent],
  selector: 'app-evaluation-history',
  template: `
    <h3>Saved evaluation history</h3>
    <p>
      Opening diagnostics does not save an evaluation. Saved conclusions are not measured business
      outcomes.
    </p>
    @if (canSave()) {
      <p>
        Re-evaluate the selected dates and horizon, then save that fresh conclusion. This saves
        metadata only; it never changes a price.
      </p>
      <button z-button class="primary" (click)="save()" [disabled]="saving() || loading()">
        {{ saving() ? 'Saving evaluation…' : 'Save fresh evaluation' }}
      </button>
    }
    @if (saveError()) {
      <p class="error" role="alert">
        {{ saveError() }} Retry the save to check again; identical inputs are deduplicated.
      </p>
    }
    @if (message()) {
      <p class="success" role="status">{{ message() }}</p>
    }
    <button z-button zType="outline" (click)="load(0)" [disabled]="loading() || saving()">
      {{ loading() ? 'Loading history…' : 'Load saved evaluations' }}
    </button>
    @if (error()) {
      <p role="alert">History unavailable. Use Load saved evaluations to retry.</p>
    }
    @if (history(); as h) {
      @for (row of h.content; track row.id) {
        <p>
          <strong>Historical saved snapshot</strong><br />{{ row.evaluatedAt }} ·
          {{ row.modelVersion }} · {{ statusLabel(row.result.status) }} ·
          {{
            row.outcomeStatus === 'NOT_MEASURED'
              ? 'Realized outcomes not measured'
              : statusLabel(row.outcomeStatus)
          }}<br />
          {{ row.result.window.startDate }}–{{ row.result.window.endDate }} (exclusive UTC)
        </p>
      } @empty {
        <p>No saved evaluations. Realized outcomes have not been measured.</p>
      }
      <button
        z-button
        zType="outline"
        (click)="load(page - 1)"
        [disabled]="loading() || page === 0"
      >
        Previous evaluations
      </button>
      <button
        z-button
        zType="outline"
        (click)="load(page + 1)"
        [disabled]="loading() || (page + 1) * 5 >= h.totalElements"
      >
        Next evaluations
      </button>
    }
  `,
})
export class EvaluationHistory {
  readonly evaluation = input<Evaluation | null>(null);
  private readonly session = inject(SessionService);
  readonly statusLabel = statusLabel;
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly message = signal('');
  canSave() {
    const s = this.session.value();
    return s?.mode === 'NORMAL' && s.authenticated && !s.readOnly && this.evaluation() !== null;
  }
  save() {
    const e = this.evaluation();
    if (!this.canSave() || !e || this.saving() || this.loading()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.message.set('');
    this.http
      .post<{ result: Evaluation }>(
        `/api/v1/optimization/variants/${this.variantId()}/evaluations`,
        {},
        {
          params: {
            startDate: e.window.startDate,
            endDate: e.window.endDate,
            horizonDays: e.horizonDays,
          },
        },
      )
      .pipe(timeout(30000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (snapshot) => {
          this.saving.set(false);
          this.message.set(
            'Fresh evaluation saved: ' +
              statusLabel(snapshot.result.status) +
              '. Realized outcomes are not measured.',
          );
          this.load(0);
        },
        error: (error) => {
          this.saving.set(false);
          this.saveError.set(apiError(error));
        },
      });
  }
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
