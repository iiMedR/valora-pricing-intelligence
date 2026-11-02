import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { CatalogApi, apiError } from '../catalog/services/catalog-api.service';
import { Product, Variant } from '../catalog/models/catalog.models';
import { moneyPattern } from '../catalog/components/form-validation';
import { HistoryApi, isoTime, localTimeNow } from './history-api.service';
import { OrderStatus } from './history.models';
function lineForm() {
  return new FormGroup({
    productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    variantId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    quantity: new FormControl(1, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(1000000),
        Validators.pattern(/^\d+$/),
      ],
    }),
    unitPrice: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(moneyPattern)],
    }),
    discountAmount: new FormControl('0', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(moneyPattern)],
    }),
    listUnitPrice: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(moneyPattern)],
    }),
    unitCost: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(moneyPattern)],
    }),
  });
}
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: ` <a routerLink="/orders">← Sales orders</a>
    <p class="eyebrow top-space">MANUAL ENTRY</p>
    <h1 class="page-title">Enter an order</h1>
    <p class="notice">
      Local development API: authentication is not implemented. Enter actual historical amounts;
      current catalog prices and costs are not substituted.
    </p>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button type="button" (click)="load()">Retry loading choices</button>
      </div>
    }
    @if (loading()) {
      <p role="status">Loading catalog choices…</p>
    } @else {
      <div class="filters">
        <label>Find products<input #search type="search" placeholder="Product name" /></label
        ><button type="button" (click)="findProducts(search.value)">Find products</button
        ><button type="button" (click)="productPage(-1)" [disabled]="lookupPage === 0">
          Previous choices</button
        ><button type="button" (click)="productPage(1)" [disabled]="!moreProducts()">
          Next choices
        </button>
      </div>
      @if (!products().length) {
        <p class="notice">
          No matching products. Create a product and variant in the catalog first.
        </p>
      }
      <form class="editor wide-editor" [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid">
          <label
            >Order reference / retry key<input
              formControlName="externalReference"
              maxlength="160" /></label
          ><label
            >Placed at (local time)<input
              type="datetime-local"
              step="0.001"
              formControlName="placedAt" /></label
          ><label
            >Status<select formControlName="status">
              <option>COMPLETED</option>
              <option>UNPAID</option>
              <option>CANCELLED</option>
            </select></label
          >
          <p class="muted">Currency: {{ currency() }} · Source: MANUAL</p>
        </div>
        <div formArrayName="lines">
          @for (line of form.controls.lines.controls; track line; let i = $index) {
            <fieldset [formGroupName]="i">
              <legend>Line {{ i + 1 }}</legend>
              <div class="form-grid">
                <label
                  >Product<select formControlName="productId" (change)="chooseProduct(i)">
                    <option value="">Select product</option>
                    @for (p of products(); track p.id) {
                      <option [value]="p.id">{{ p.name }} · {{ p.status }}</option>
                    }
                  </select></label
                >
                <label
                  >Variant / SKU<select formControlName="variantId">
                    <option value="">Select variant</option>
                    @for (v of variantChoices()[i] || []; track v.id) {
                      <option [value]="v.id">{{ v.sku }} · {{ v.name }} · {{ v.status }}</option>
                    }
                  </select></label
                >
                <label
                  >Quantity<input
                    type="number"
                    min="1"
                    max="1000000"
                    step="1"
                    formControlName="quantity" /></label
                ><label
                  >Unit transaction price<input inputmode="decimal" formControlName="unitPrice"
                /></label>
                <label
                  >Allocated line discount (total)<input
                    inputmode="decimal"
                    formControlName="discountAmount" /></label
                ><label
                  >Listed unit price, if known<input
                    inputmode="decimal"
                    formControlName="listUnitPrice"
                    placeholder="Unknown" /></label
                ><label
                  >Historical unit cost, if known<input
                    inputmode="decimal"
                    formControlName="unitCost"
                    placeholder="Unknown / effective history"
                /></label>
              </div>
              <p class="muted">
                Unit transaction price × quantity minus allocated line discount. Blank cost uses
                verified effective cost history if available, otherwise stays unknown.
              </p>
              <button
                type="button"
                (click)="removeLine(i)"
                [disabled]="saving() || form.controls.lines.length === 1"
              >
                Remove line {{ i + 1 }}
              </button>
            </fieldset>
          }
        </div>
        <button
          type="button"
          (click)="addLine()"
          [disabled]="saving() || form.controls.lines.length >= 100"
        >
          Add line
        </button>
        <div class="form-grid top-space">
          <label
            >Shipping amount, if known<input
              formControlName="shippingAmount"
              inputmode="decimal"
              placeholder="Unknown" /></label
          ><label
            >Tax amount, if known<input
              formControlName="taxAmount"
              inputmode="decimal"
              placeholder="Unknown"
          /></label>
        </div>
        @if (submitted() && form.invalid) {
          <p class="field-error" role="alert">
            Complete the reference, date, variant, positive integer quantities and nonnegative
            decimal amounts (up to four decimal places).
          </p>
        }
        <div class="actions">
          <button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save order' }}</button><a routerLink="/orders">Cancel</a>
        </div>
      </form>
    }`,
})
export class OrderForm {
  private readonly catalog = inject(CatalogApi);
  private readonly api = inject(HistoryApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<Product[]>([]);
  readonly variantChoices = signal<Record<number, Variant[]>>({});
  readonly currency = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly moreProducts = signal(false);
  lookupPage = 0;
  private search = '';
  readonly form = new FormGroup({
    externalReference: new FormControl(crypto.randomUUID(), {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    placedAt: new FormControl(localTimeNow(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<OrderStatus>('COMPLETED', { nonNullable: true }),
    shippingAmount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(moneyPattern)],
    }),
    taxAmount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(moneyPattern)],
    }),
    lines: new FormArray([lineForm()]),
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      products: this.catalog.products({
        page: this.lookupPage,
        size: 20,
        search: this.search,
        categoryId: '',
        status: '',
      }),
      settings: this.catalog.settings(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.products.set(data.products.content);
          this.moreProducts.set(data.products.page + 1 < data.products.totalPages);
          this.currency.set(data.settings.currencyCode);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.error.set(apiError(e));
        },
      });
  }
  findProducts(search: string) {
    this.search = search;
    this.lookupPage = 0;
    this.load();
  }
  productPage(delta: number) {
    this.lookupPage += delta;
    this.load();
  }
  chooseProduct(index: number) {
    const line = this.form.controls.lines.at(index);
    const selected = line.controls.productId.value;
    line.controls.variantId.setValue('');
    this.variantChoices.update((v) => ({ ...v, [index]: [] }));
    if (!selected) return;
    this.catalog
      .detail(selected)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (
            this.form.controls.lines.at(index) === line &&
            line.controls.productId.value === selected
          )
            this.variantChoices.update((v) => ({ ...v, [index]: data.variants }));
        },
        error: (e) => this.error.set(apiError(e)),
      });
  }
  addLine() {
    this.form.controls.lines.push(lineForm());
  }
  removeLine(index: number) {
    this.form.controls.lines.removeAt(index);
    const old = this.variantChoices();
    const next: Record<number, Variant[]> = {};
    Object.keys(old).forEach((key) => {
      const i = Number(key);
      if (i !== index) next[i > index ? i - 1 : i] = old[i];
    });
    this.variantChoices.set(next);
  }
  submit() {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.api
      .createOrder({
        source: 'MANUAL',
        externalReference: value.externalReference,
        placedAt: isoTime(value.placedAt),
        sourceUpdatedAt: null,
        status: value.status,
        currencyCode: this.currency(),
        shippingAmount: value.shippingAmount || null,
        taxAmount: value.taxAmount || null,
        lines: value.lines.map((line, i) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          listUnitPrice: line.listUnitPrice || null,
          unitCost: line.unitCost || null,
          sourceLineReference: String(i + 1),
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.saving.set(false);
          void this.router.navigate(['/orders', data.order.id]);
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(apiError(e));
        },
      });
  }
}
