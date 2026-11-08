import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Evaluation, OptimizationApi, OptimizationQuery } from './optimization-api.service';
import { apiError } from '../catalog/services/catalog-api.service';

@Injectable()
export class CatalogCheck {
  private readonly api = inject(OptimizationApi);
  private request?: Subscription;
  private generation = 0;
  private query?: OptimizationQuery;
  private nextPage = 0;
  private restartRequired = false;
  readonly state = signal<'idle' | 'running' | 'cancelled' | 'error' | 'complete'>('idle');
  readonly evaluations = signal<Evaluation[]>([]);
  readonly total = signal<number | null>(null);
  readonly error = signal('');
  readonly checked = computed(() => this.evaluations().length);
  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }
  reset() {
    this.cancel();
    this.state.set('idle');
    this.evaluations.set([]);
    this.total.set(null);
    this.error.set('');
    this.query = undefined;
    this.nextPage = 0;
    this.restartRequired = false;
  }
  start(query: OptimizationQuery) {
    this.reset();
    this.query = { ...query };
    this.state.set('running');
    this.fetch();
  }
  cancel() {
    this.generation++;
    this.request?.unsubscribe();
    if (this.state() === 'running') this.state.set('cancelled');
  }
  retry() {
    if (!this.query || !['error', 'cancelled'].includes(this.state())) return;
    if (this.restartRequired) {
      this.start(this.query);
      return;
    }
    this.error.set('');
    this.state.set('running');
    this.fetch();
  }
  private fetch() {
    if (!this.query || this.state() !== 'running') return;
    const generation = this.generation;
    this.request = this.api.overview(this.query, this.nextPage).subscribe({
      next: (response) => {
        if (generation !== this.generation) return;
        const previous = this.evaluations(),
          ids = new Set(previous.map((row) => row.variant.variantId));
        const rows = response.results.content;
        if (
          (this.total() !== null && this.total() !== response.results.totalElements) ||
          response.results.page !== this.nextPage ||
          rows.some((row) => ids.has(row.variant.variantId)) ||
          new Set(rows.map((row) => row.variant.variantId)).size !== rows.length
        ) {
          this.restartRequired = true;
          this.state.set('error');
          this.error.set(
            'The catalog changed during this check. Check it again for a consistent result.',
          );
          return;
        }
        this.total.set(response.results.totalElements);
        this.evaluations.set([...previous, ...rows]);
        this.nextPage++;
        if (this.checked() === this.total()) {
          this.state.set('complete');
          return;
        }
        if (
          !rows.length ||
          this.nextPage >= response.results.totalPages ||
          this.checked() > response.results.totalElements
        ) {
          this.restartRequired = true;
          this.state.set('error');
          this.error.set('The catalog changed or returned an incomplete page. Check it again.');
          return;
        }
        this.fetch();
      },
      error: (error) => {
        if (generation !== this.generation) return;
        this.error.set(apiError(error));
        this.state.set('error');
      },
    });
  }
}
