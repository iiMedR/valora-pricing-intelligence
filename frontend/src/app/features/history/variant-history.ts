import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Confirmation } from '../../core/confirmation';
import { EditForm, ControlState } from '../../core/editor-state';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { Variant } from '../catalog/models/catalog.models';
import { CatalogApi, apiError } from '../catalog/services/catalog-api.service';
import { moneyPattern, decimalUnits } from '../catalog/components/form-validation';
import { HistoryApi, isoTime, localTimeNow } from './history-api.service';
import { HistoryKind, HistoryPage, Inventory, Period, Quality } from './history.models';
import { SessionService } from '../../core/session.service';
@Component({
  imports: [
    ZardButtonComponent,
    ZardInputComponent,
    EditForm,
    ControlState,
    RouterLink,
    ReactiveFormsModule,
  ],
  template: ` <a [routerLink]="['/products', productId]">← Product detail</a>
    <p class="eyebrow top-space">VARIANT HISTORY</p>
    <h1 class="page-title">{{ variant()?.sku || 'Variant' }} history</h1>
    <p class="muted">
      Listed prices are observations, not realized transaction prices. Missing history stays
      unknown. Times below are UTC.
    </p>
    <div class="actions history-tabs">
      @for (kind of kinds; track kind) {
        <button
          z-button
          zType="outline"
          [class.primary]="tab() === kind"
          [attr.aria-pressed]="tab() === kind"
          (click)="select(kind)"
          [disabled]="saving()"
        >
          {{ kind === 'price' ? 'Listed prices' : kind === 'cost' ? 'Unit costs' : 'Inventory' }}
        </button>
      }
    </div>
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
      <p role="status">Loading history…</p>
    } @else if (result(); as page) {
      @if (!page.content.length) {
        <div class="empty">
          <h2>{{ tab() === 'inventory' ? 'Inventory unknown' : 'No historical observations' }}</h2>
          <p>
            {{
              tab() === 'inventory'
                ? 'No observations are recorded. Missing data does not mean zero stock.'
                : 'Current catalog values do not establish past listed prices or historical unit costs.'
            }}
          </p>
        </div>
      } @else {
        <div
          class="table-wrap"
          role="region"
          tabindex="0"
          aria-label="Variant observations table, scroll horizontally"
        >
          <table>
            <caption class="sr-only">
              {{
                tab()
              }}
              history
            </caption>
            <thead>
              <tr>
                <th>From / observed (UTC)</th>
                <th>Value</th>
                <th>Until, exclusive (UTC)</th>
                <th>Quality / source</th>
              </tr>
            </thead>
            <tbody>
              @for (row of page.content; track row.id) {
                <tr>
                  <td>{{ rowTime(row) }}</td>
                  <td>{{ rowValue(row) }}</td>
                  <td>{{ rowUntil(row) }}</td>
                  <td>{{ row.quality }} · {{ row.source }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <div class="pagination">
        <span
          >{{ page.totalElements }} entries · Page {{ page.page + 1 }} of
          {{ page.totalPages || 1 }}</span
        >
        <div class="actions">
          <button
            z-button
            zType="outline"
            (click)="changePage(-1)"
            [disabled]="page.page === 0 || saving()"
          >
            Previous</button
          ><button
            z-button
            zType="outline"
            (click)="changePage(1)"
            [disabled]="page.page + 1 >= page.totalPages || saving()"
          >
            Next
          </button>
        </div>
      </div>
      @if (!readOnly()) {
        <form
          appEditForm
          [editorBusy]="saving()"
          class="editor"
          [formGroup]="form"
          (ngSubmit)="submit()"
        >
          <h2>
            Add
            {{
              tab() === 'inventory'
                ? 'inventory observation'
                : tab() === 'cost'
                  ? 'unit cost period / observation'
                  : 'listed price period / observation'
            }}
          </h2>
          @if (tab() === 'inventory') {
            <label
              >Quantity available<input type="number" min="0" step="1" formControlName="quantity"
            /></label>
          } @else {
            <label
              >Amount ({{ currency() }})<input z-input inputmode="decimal" formControlName="amount"
            /></label>
          }
          <label
            >{{ tab() === 'inventory' ? 'Observed at' : 'Valid from' }} (local time)<input
              z-input
              type="datetime-local"
              step="0.001"
              formControlName="from"
          /></label>
          @if (tab() !== 'inventory') {
            <label
              >Valid until, exclusive (optional, local time)<input
                z-input
                type="datetime-local"
                step="0.001"
                formControlName="to"
            /></label>
          }
          <label
            >Quality<select formControlName="quality">
              <option value="VERIFIED_CHANGE">Verified change event</option>
              <option value="SNAPSHOT">Snapshot / point observation</option>
              <option value="INFERRED">Inferred / uncertain observation</option>
            </select></label
          >
          <label
            >Source reference / retry key<input
              z-input
              formControlName="externalReference"
              maxlength="160"
          /></label>
          <p class="notice">
            {{
              tab() === 'inventory'
                ? 'Zero at a trusted observation means known stockout at that instant, not a proven stockout period. Inferred quantities are uncertain.'
                : 'Verified periods use [from,until). A verified open period closes the previous one and changes the current catalog value atomically. Snapshots/inferred entries are points only and never change current values.'
            }}
          </p>
          @if (submitted() && form.invalid) {
            <p role="alert" class="field-error">
              Enter a valid timestamp, source reference, and
              {{
                tab() === 'inventory'
                  ? 'nonnegative integer quantity'
                  : 'nonnegative decimal amount with up to four decimal places'
              }}.
            </p>
          }
          <button z-button class="primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save observation' }}
          </button>
        </form>
      } @else {
        <p class="notice">Synthetic demo · observations are read-only.</p>
      }
    }`,
})
export class VariantHistory {
  private readonly confirmation = inject(Confirmation);
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
  private pending?: Subscription;
  private readonly api = inject(HistoryApi);
  private readonly catalog = inject(CatalogApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly productId = this.route.snapshot.paramMap.get('productId')!;
  readonly variantId = this.route.snapshot.paramMap.get('variantId')!;
  readonly kinds: HistoryKind[] = ['price', 'cost', 'inventory'];
  readonly tab = signal<HistoryKind>('price');
  readonly result = signal<HistoryPage | null>(null);
  readonly variant = signal<Variant | null>(null);
  readonly currency = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  private page = 0;
  readonly form = new FormGroup({
    amount: new FormControl('', { nonNullable: true }),
    quantity: new FormControl(0, { nonNullable: true }),
    from: new FormControl(localTimeNow(), { nonNullable: true, validators: [Validators.required] }),
    to: new FormControl('', { nonNullable: true }),
    quality: new FormControl<Quality>('SNAPSHOT', { nonNullable: true }),
    externalReference: new FormControl(crypto.randomUUID(), {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
  });
  constructor() {
    this.configure();
    this.load();
  }
  configure() {
    this.form.controls.amount.setValidators(
      this.tab() === 'inventory' ? [] : [Validators.required, Validators.pattern(moneyPattern)],
    );
    this.form.controls.quantity.setValidators(
      this.tab() === 'inventory'
        ? [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]
        : [],
    );
    this.form.controls.amount.updateValueAndValidity();
    this.form.controls.quantity.updateValueAndValidity();
  }
  select(kind: HistoryKind) {
    if (kind !== this.tab() && !this.readOnly() && this.form.dirty) {
      void this.confirmation
        .ask(
          'Discard unsaved observation?',
          'Changing the observation type clears this unfinished entry. No historical records will be changed.',
          'Discard entry',
        )
        .then((accepted) => {
          if (accepted) {
            this.form.reset();
            this.selectKind(kind);
          }
        });
      return;
    }
    this.selectKind(kind);
  }
  private selectKind(kind: HistoryKind) {
    this.tab.set(kind);
    this.page = 0;
    this.message.set('');
    this.form.controls.externalReference.setValue(crypto.randomUUID());
    this.configure();
    this.load();
  }
  load() {
    this.pending?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.pending = forkJoin({
      page: this.api.history(this.variantId, this.tab(), this.page),
      product: this.catalog.detail(this.productId),
      settings: this.catalog.settings(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const variant = data.product.variants.find((v) => v.id === this.variantId);
          if (!variant) {
            this.error.set('Variant not found in this product.');
            this.loading.set(false);
            return;
          }
          this.variant.set(variant);
          this.currency.set(data.settings.currencyCode);
          this.result.set(data.page);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  changePage(delta: number) {
    this.page += delta;
    this.load();
  }
  rowTime(row: Period | Inventory) {
    return 'observedAt' in row ? row.observedAt : row.validFrom;
  }
  rowValue(row: Period | Inventory) {
    return 'quantityAvailable' in row
      ? row.quantityAvailable + ' · ' + row.stockState
      : row.amount + ' ' + row.currencyCode;
  }
  rowUntil(row: Period | Inventory) {
    return 'observedAt' in row
      ? 'Point observation'
      : row.quality === 'VERIFIED_CHANGE'
        ? row.validTo || 'Open effective period'
        : 'Point observation';
  }
  submit() {
    if (this.readOnly()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || !this.variant()) return;
    const value = this.form.getRawValue();
    if (this.tab() === 'price' && (decimalUnits(value.amount) ?? 0n) <= 0n) {
      this.error.set('Listed price must be positive.');
      return;
    }
    if (this.tab() !== 'inventory' && value.to && value.to <= value.from) {
      this.error.set('Valid until must follow valid from.');
      return;
    }
    if (this.tab() !== 'inventory' && value.quality !== 'VERIFIED_CHANGE' && value.to) {
      this.error.set(
        'Snapshots and inferred entries are point observations; leave valid until blank.',
      );
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const base = {
      source: 'MANUAL' as const,
      quality: value.quality,
      externalReference: value.externalReference,
    };
    const body =
      this.tab() === 'inventory'
        ? { ...base, observedAt: isoTime(value.from), quantityAvailable: value.quantity }
        : {
            ...base,
            amount: value.amount,
            currencyCode: this.currency(),
            validFrom: isoTime(value.from),
            validTo: value.to ? isoTime(value.to) : null,
            variantVersion: this.variant()!.version,
          };
    this.api
      .addHistory(this.variantId, this.tab(), body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Observation recorded.');
          this.form.markAsPristine();
          this.form.controls.externalReference.setValue(crypto.randomUUID());
          this.page = 0;
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(apiError(e));
        },
      });
  }
}
