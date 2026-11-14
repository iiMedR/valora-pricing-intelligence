import { formatMoney } from '../../shared/merchant/foundation';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { SessionService } from '../../core/session.service';
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
  styleUrl: './orders.css',
  imports: [ZardButtonComponent, ZardInputComponent, DatePipe, ReactiveFormsModule, RouterLink],
  template: ` <div class="page-heading">
      <div>
        <h1 class="page-title">Sales orders</h1>
        <p class="muted">
          Completed sales exclude unpaid and cancelled orders. Filter in local time; dates below are
          UTC.
        </p>
      </div>
      @if (!readOnly()) {
        <a class="button-link primary" routerLink="/orders/new">Enter manual order</a>
      }
    </div>
    @if (readOnly()) {
      <p class="notice">Synthetic demo · orders and refunds are read-only.</p>
    }
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button z-button zType="outline" (click)="load()">Retry</button>
      </div>
    }
    <form class="filters history-filters" [formGroup]="filters" (ngSubmit)="apply()">
      <label
        >From (local time)<input
          z-input
          type="datetime-local"
          step="0.001"
          formControlName="from" /></label
      ><label
        >Until, exclusive (local time)<input
          z-input
          type="datetime-local"
          step="0.001"
          formControlName="to"
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
      ><button z-button zType="outline">Apply filters</button>
    </form>
    @if (loading()) {
      <p role="status">Loading orders…</p>
    } @else if (result(); as page) {
      @if (!page.content.length) {
        <div class="empty">
          <h2>No orders found</h2>
          <p>
            No records match this window. Adjust the filters, or use the separate synthetic demo to
            inspect sample orders.
          </p>
        </div>
      } @else {
        <div
          class="table-wrap"
          role="region"
          tabindex="0"
          aria-label="Sales orders table, scroll horizontally"
        >
          <table>
            <caption class="sr-only">
              Sales orders
            </caption>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Placed (UTC)</th>
                <th>Status / source</th>
                <th class="numeric">Lines / units</th>
                <th class="numeric">Net merchandise</th>
                <th class="numeric">Recognized net</th>
              </tr>
            </thead>
            <tbody>
              @for (order of page.content; track order.id) {
                <tr>
                  <td>
                    <a
                      [routerLink]="['/orders', order.id]"
                      [attr.aria-label]="
                        shortReference(order) +
                        '. Full reference: ' +
                        (order.externalReference || order.id)
                      "
                      [title]="order.externalReference || order.id"
                      >{{ shortReference(order) }}</a
                    >
                    <details class="full-reference">
                      <summary>Full reference</summary>
                      <span>{{ order.externalReference || order.id }}</span>
                    </details>
                  </td>
                  <td>
                    {{ order.placedAt | date: 'mediumDate' : 'UTC'
                    }}<small>{{ order.placedAt | date: 'mediumTime' : 'UTC' }}</small>
                  </td>
                  <td>
                    <span class="order-status">{{ order.status }}</span><small>{{
                      order.source
                    }}</small>
                  </td>
                  <td class="numeric">{{ order.itemCount }} / {{ order.totalQuantity }}</td>
                  <td class="numeric">{{ money(order.netMerchandise, order.currencyCode) }}</td>
                  <td class="numeric">
                    {{ money(order.recognizedNetMerchandise, order.currencyCode) }}
                  </td>
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
          <button z-button zType="outline" (click)="changePage(-1)" [disabled]="page.page === 0">
            Previous</button
          ><button
            z-button
            zType="outline"
            (click)="changePage(1)"
            [disabled]="page.page + 1 >= page.totalPages"
          >
            Next
          </button>
        </div>
      </div>
    }`,
})
export class Orders {
  shortReference(order: Order): string {
    const reference = order.externalReference;
    if (reference?.startsWith('portfolio-v1/order/portfolio/')) {
      const [scenario, variant, date] = reference
        .slice('portfolio-v1/order/portfolio/'.length)
        .split('/');
      if (scenario && variant && date) {
        const label = scenario.charAt(0) + scenario.slice(1).toLowerCase().replaceAll('_', ' ');
        return label + ' · ' + variant + ' · ' + date;
      }
    }
    return reference
      ? reference.length > 40
        ? reference.slice(0, 16) + '…' + reference.slice(-20)
        : reference
      : 'Order ' + order.id.slice(0, 8) + '…' + order.id.slice(-4);
  }
  readonly money = formatMoney;
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
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
