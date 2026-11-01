import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HealthService } from '../../core/health.service';
@Component({selector: 'app-home', templateUrl: './home.html'})
export class Home {
  private readonly health = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal<'loading' | 'connected' | 'unavailable'>('loading');
  constructor() { this.refresh(); }
  refresh() {
    this.status.set('loading');
    this.health.check().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.status.set(response?.status === 'UP' ? 'connected' : 'unavailable'),
      error: () => this.status.set('unavailable')
    });
  }
}

