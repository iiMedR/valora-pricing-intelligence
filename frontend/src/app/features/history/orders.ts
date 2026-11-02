import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Page } from '../catalog/models/catalog.models';
import { apiError } from '../catalog/services/catalog-api.service';
import { HistoryApi, isoTime } from './history-api.service';
import { Order } from './history.models';
@Component({
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: ` <div class="page-heading">
      <div>
        <p class="eyebrow">TRANSACTION HISTORY</p>
        <h1 class="page-title">Sales orders</h1>
        <p class="muted">
          Immutable transaction snapshots. Completed merchandise sales exclude unpaid/cancelled
          orders.
        </p>
      </div>
      <a class="button-link primary" routerLink="/orders/new">Enter manual order</a>
    </div>
    @if (error()) {
      <div class="error" role="alert">{{ error() }} <button (click)="load()">Retry</button></div>
    }
    <form class="filters history-filters" [formGroup]="filters" (ngSubmit)="apply()">
      <label>From (local time)<input type="datetime-local" step="0.001" formControlName="from" /></label
      ><label
        >Until, exclusive (local time)<input type="datetime-local" step="0.001" formControlName="to"
      /></label>
      <label
        >Status<select formControlName="status">
          <option value="">All statuses</option>
          <option>COMPLETED</option>
          <option>UNPAID</option>
          <option>CANCELLED</option>
        </select></label
      >
      <label
        >Source<select formControlName="source">
          <option value="">All sources</option>
          <option>MANUAL</option>
          <option>SHOPIFY</option>
          <option>DEMO</option>
        </select></label
      ><button>Apply filters</button>
    </form>
    @if (loading()) {
      <p role="status">Loading orders…</p>
    } @else if (result(); as page) {
      @if (!page.content.length) {
        <div class="empty">
          <h2>No orders found</h2>
          <p>Enter an order or adjust the filters. No demo transactions are generated.</p>
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <caption class="sr-only">
              Sales orders
            </caption>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Placed (UTC)</th>
                <th>Status / source</th>
                <th>Lines / units</th>
                <th>Net merchandise</th>
                <th>Recognized net</th>
              </tr>
            </thead>
            <tbody>
              @for (order of page.content; track order.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/orders', order.id]">{{
                      order.externalReference || order.id
                    }}</a>
                  </td>
                  <td>{{ order.placedAt | date: 'medium' : 'UTC' }}</td>
                  <td>{{ order.status }}<br />{{ order.source }}</td>
                  <td>{{ order.itemCount }} / {{ order.totalQuantity }}</td>
                  <td>{{ order.netMerchandise }} {{ order.currencyCode }}</td>
                  <td>{{ order.recognizedNetMerchandise }} {{ order.currencyCode }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <div class="pagination">
        <span
          >{{ page.totalElements }} orders · Page {{ page.page + 1 }} of
          {{ page.totalPages || 1 }}</span
        >
        <div class="actions">
          <button (click)="changePage(-1)" [disabled]="page.page === 0">Previous</button
          ><button (click)="changePage(1)" [disabled]="page.page + 1 >= page.totalPages">
            Next
          </button>
        </div>
      </div>
    }`,
})
export class Orders {
  private readonly api = inject(HistoryApi);
  private readonly destroyRef = inject(DestroyRef);
  private pending?: Subscription;
  private page = 0;
  readonly result = signal<Page<Order> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filters = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    source: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    this.load();
  }
  load() {
    this.pending?.unsubscribe();
    this.error.set('');
    this.result.set(null);
    const values = this.filters.getRawValue();
    if (values.from && values.to && values.from >= values.to) {
      this.loading.set(false);
      this.error.set('The end of the date range must follow its start.');
      return;
    }
    this.loading.set(true);
    this.pending = this.api
      .orders({
        ...values,
        from: values.from ? isoTime(values.from) : '',
        to: values.to ? isoTime(values.to) : '',
        page: this.page,
        size: 20,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.result.set(data);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  apply() {
    this.page = 0;
    this.load();
  }
  changePage(delta: number) {
    this.page += delta;
    this.load();
  }
}
