import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { SessionService } from '../../core/session.service';
import { EditForm, ControlState } from '../../core/editor-state';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HistoryApi, isoTime, localTimeNow } from './history-api.service';
import { OrderDetail as Detail, RefundKind } from './history.models';
import { apiError } from '../catalog/services/catalog-api.service';
import { moneyPattern } from '../catalog/components/form-validation';
@Component({
  imports: [
    ZardButtonComponent,
    ZardInputComponent,
    EditForm,
    ControlState,
    RouterLink,
    ReactiveFormsModule,
  ],
  template: ` <a routerLink="/orders">← Sales orders</a>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }}
        <button z-button zType="outline" (click)="load()" [disabled]="saving()">Reload</button>
      </div>
    }
    @if (message()) {
      <p class="success" role="status">{{ message() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading order…</p>
    } @else if (detail(); as data) {
      <p class="eyebrow top-space">IMMUTABLE SALES SNAPSHOT</p>
      <h1 class="page-title">Order {{ data.order.externalReference || data.order.id }}</h1>
      <p>{{ data.order.status }} · {{ data.order.source }} · {{ data.order.currencyCode }}</p>
      <p class="muted">
        Placed: {{ data.order.placedAt }} (UTC) · Source updated:
        {{ data.order.sourceUpdatedAt || 'Unknown' }}
      </p>
      <dl class="money-grid">
        <div>
          <dt>Merchandise subtotal</dt>
          <dd>{{ data.order.subtotal }}</dd>
        </div>
        <div>
          <dt>Allocated discounts</dt>
          <dd>{{ data.order.discountAmount }}</dd>
        </div>
        <div>
          <dt>Merchandise refunds</dt>
          <dd>{{ data.order.merchandiseRefunds }}</dd>
        </div>
        <div>
          <dt>Recognized net merchandise</dt>
          <dd>{{ data.order.recognizedNetMerchandise }}</dd>
        </div>
        <div>
          <dt>Shipping / shipping refunds</dt>
          <dd>{{ data.order.shippingAmount ?? 'Unknown' }} / {{ data.order.shippingRefunds }}</dd>
        </div>
        <div>
          <dt>Tax / tax refunds</dt>
          <dd>{{ data.order.taxAmount ?? 'Unknown' }} / {{ data.order.taxRefunds }}</dd>
        </div>
        <div>
          <dt>Total charged before refunds</dt>
          <dd>{{ data.order.totalCharged ?? 'Unknown (shipping/tax incomplete)' }}</dd>
        </div>
      </dl>
      <p class="notice">
        Only COMPLETED orders contribute recognized net merchandise. Shipping and tax are separate.
        Historical prices/costs below never change when the catalog is edited.
      </p>
      <h2>Order lines</h2>
      @for (line of data.lines; track line.id) {
        <article class="variant-card">
          <h3>{{ line.sku }} · {{ line.name }}</h3>
          <p>Quantity: {{ line.quantity }} · {{ line.currencyCode }}</p>
          <dl class="money-grid">
            <div>
              <dt>Transaction unit price</dt>
              <dd>{{ line.unitPrice }}</dd>
            </div>
            <div>
              <dt>Allocated discount</dt>
              <dd>{{ line.discountAmount }}</dd>
            </div>
            <div>
              <dt>Net line amount</dt>
              <dd>{{ line.lineNet }}</dd>
            </div>
            <div>
              <dt>Listed unit price</dt>
              <dd>{{ line.listUnitPrice ?? 'Unknown' }}</dd>
            </div>
            <div>
              <dt>Historical unit cost</dt>
              <dd>{{ line.unitCost ?? 'Unknown' }}</dd>
            </div>
            <div>
              <dt>Cost provenance</dt>
              <dd>{{ line.costProvenance }}</dd>
            </div>
          </dl>
        </article>
      }
      @if (readOnly()) {
        <p class="notice">Synthetic demo · refunds and transaction history are read-only.</p>
      }
      <section class="section-heading">
        <h2>Refunds and returns</h2>
        <button
          z-button
          zType="outline"
          (click)="editing.set(true)"
          [disabled]="readOnly() || editing() || saving() || data.order.status !== 'COMPLETED'"
        >
          Record refund
        </button>
      </section>
      @if (data.order.status !== 'COMPLETED') {
        <p class="muted">Refunds are available only for completed orders.</p>
      }
      @if (editing() && !readOnly()) {
        <form
          appEditForm
          [editorBusy]="saving()"
          class="editor"
          [formGroup]="form"
          (ngSubmit)="submit()"
        >
          <h2>Record refund / return</h2>
          <label
            >Refund kind<select formControlName="kind" (change)="changeKind()">
              <option value="LINE_RETURN">Line return (quantity and money)</option>
              <option value="FINANCIAL_ADJUSTMENT">Financial-only line adjustment</option>
              <option value="SHIPPING">Shipping adjustment</option>
              <option value="TAX">Tax adjustment</option>
            </select></label
          >
          @if (
            form.controls.kind.value === 'LINE_RETURN' ||
            form.controls.kind.value === 'FINANCIAL_ADJUSTMENT'
          ) {
            <label
              >Order line<select formControlName="itemId">
                <option value="">Select line</option>
                @for (line of data.lines; track line.id) {
                  <option [value]="line.id">{{ line.sku }} · purchased {{ line.quantity }}</option>
                }
              </select></label
            >
          }
          <div class="form-grid">
            <label
              >Returned quantity<input
                type="number"
                min="0"
                step="1"
                formControlName="quantity"
                [readonly]="form.controls.kind.value !== 'LINE_RETURN'" /></label
            ><label
              >Refund amount ({{ data.order.currencyCode }})<input
                z-input
                inputmode="decimal"
                formControlName="amount" /></label
            ><label
              >Refunded at (local time)<input
                z-input
                type="datetime-local"
                step="0.001"
                formControlName="refundedAt" /></label
            ><label
              >Source reference / retry key<input
                z-input
                formControlName="externalReference"
                maxlength="160"
            /></label>
          </div>
          <label>Reason<textarea formControlName="reason" maxlength="500"></textarea></label>
          <p class="muted">
            Quantity returns and financial-only adjustments are distinct. The server checks
            cumulative quantity and amount limits. This records history; it does not send money to a
            payment provider.
          </p>
          @if (submitted() && form.invalid) {
            <p class="field-error" role="alert">
              Complete the timestamp, reference, valid integer quantity, and nonnegative decimal
              amount.
            </p>
          }
          <div class="actions">
            <button z-button class="primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save refund' }}</button><button
              z-button
              zType="outline"
              type="button"
              (click)="editing.set(false)"
              [disabled]="saving()"
            >
              Cancel
            </button>
          </div>
        </form>
      }
      @if (!data.refunds.length) {
        <div class="empty">No refunds recorded.</div>
      } @else {
        <div
          class="table-wrap"
          role="region"
          tabindex="0"
          aria-label="Order refunds table, scroll horizontally"
        >
          <table>
            <caption class="sr-only">
              Refunds
            </caption>
            <thead>
              <tr>
                <th>Refunded at (UTC)</th>
                <th>Kind</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Source / reason</th>
              </tr>
            </thead>
            <tbody>
              @for (refund of data.refunds; track refund.id) {
                <tr>
                  <td>{{ refund.refundedAt }}</td>
                  <td>{{ refund.kind }}</td>
                  <td>{{ refund.quantity }}</td>
                  <td>{{ refund.amount }} {{ refund.currencyCode }}</td>
                  <td>{{ refund.source }} · {{ refund.reason || 'No reason supplied' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }`,
})
export class OrderDetail {
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
  private readonly api = inject(HistoryApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  readonly detail = signal<Detail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly submitted = signal(false);
  readonly form = new FormGroup({
    kind: new FormControl<RefundKind>('LINE_RETURN', { nonNullable: true }),
    itemId: new FormControl('', { nonNullable: true }),
    quantity: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    }),
    amount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(moneyPattern)],
    }),
    refundedAt: new FormControl(localTimeNow(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    externalReference: new FormControl(crypto.randomUUID(), {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .order(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.detail.set(data);
          this.loading.set(false);
        },
        error: (e) => {
          this.detail.set(null);
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  changeKind() {
    if (this.form.controls.kind.value !== 'LINE_RETURN') this.form.controls.quantity.setValue(0);
    else this.form.controls.quantity.setValue(1);
  }
  submit() {
    if (this.readOnly()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || !this.detail()) return;
    const value = this.form.getRawValue();
    const merchandise = value.kind === 'LINE_RETURN' || value.kind === 'FINANCIAL_ADJUSTMENT';
    if (merchandise && !value.itemId) {
      this.error.set('Select an order line.');
      return;
    }
    if (value.kind === 'LINE_RETURN' && value.quantity < 1) {
      this.error.set('A quantity return needs at least one unit.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api
      .refund(this.id, {
        ...value,
        source: 'MANUAL',
        itemId: merchandise ? value.itemId : null,
        refundedAt: isoTime(value.refundedAt),
        currencyCode: this.detail()!.order.currencyCode,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
          this.message.set('Refund recorded. Financial snapshots were retained.');
          this.form.controls.externalReference.setValue(crypto.randomUUID());
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(apiError(e));
        },
      });
  }
}
