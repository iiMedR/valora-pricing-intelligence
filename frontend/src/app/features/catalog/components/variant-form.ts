import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { EditForm, ControlState } from '../../../core/editor-state';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogStatus, Variant, VariantWrite } from '../models/catalog.models';
import {
  decimalUnits,
  moneyPattern,
  positiveMoney,
  priceBounds,
  requiredText,
} from './form-validation';
@Component({
  selector: 'app-variant-form',
  imports: [ZardButtonComponent, ZardInputComponent, EditForm, ControlState, ReactiveFormsModule],
  template: ` <form
    appEditForm
    [editorBusy]="saving"
    class="editor"
    [formGroup]="form"
    (ngSubmit)="submit()"
  >
    <h2>{{ variant ? 'Edit variant' : 'Add variant' }}</h2>
    <div class="form-grid">
      <label
        >SKU<input
          z-input
          formControlName="sku"
          required
          [attr.aria-describedby]="
            form.controls.sku.touched && form.controls.sku.invalid ? 'variant-identity-error' : null
          "
          maxlength="80"
          autocomplete="off" /></label
      ><label
        >Variant name<input
          z-input
          formControlName="name"
          required
          [attr.aria-describedby]="
            form.controls.name.touched && form.controls.name.invalid
              ? 'variant-identity-error'
              : null
          "
          maxlength="120"
      /></label>
    </div>
    <div class="form-grid">
      @for (field of moneyFields; track field.key) {
        <label
          >{{ field.label }} ({{ currency }})<input
            z-input
            [formControlName]="field.key"
            type="text"
            inputmode="decimal"
            maxlength="20"
            autocomplete="off"
          />
          @if (form.controls[field.key].touched && form.controls[field.key].invalid) {
            <span class="field-error"
              >{{
                field.key === 'costPrice' ? 'Use a nonnegative decimal' : 'Use a positive decimal'
              }}, up to 15 integer digits and 4 decimal places.</span
            >
          }
        </label>
      }
    </div>
    <p class="muted">
      Enter decimals using a dot. Minimum ≤ current ≤ maximum. No automatic rounding.
    </p>
    @if (form.hasError('priceBounds')) {
      <p class="field-error" role="alert">Prices must satisfy minimum ≤ current ≤ maximum.</p>
    }
    @if (belowCost()) {
      <p class="warning">
        Current price is below cost. This is allowed; saving will retain your values.
      </p>
    }
    @if (
      (form.controls.sku.touched && form.controls.sku.invalid) ||
      (form.controls.name.touched && form.controls.name.invalid)
    ) {
      <p class="field-error" id="variant-identity-error">
        SKU and variant name are required, up to 80 and 120 characters respectively.
      </p>
    }
    <label
      >Status<select formControlName="status" aria-label="Status">
        <option value="ACTIVE">Active</option>
        <option value="ARCHIVED">Archived</option>
      </select></label
    >
    <div class="actions">
      <button z-button class="primary" type="submit" [disabled]="saving">
        {{ saving ? 'Saving…' : 'Save variant' }}</button><button
        z-button
        zType="outline"
        type="button"
        (click)="cancelled.emit()"
        [disabled]="saving"
      >
        Cancel
      </button>
    </div>
  </form>`,
})
export class VariantForm implements OnChanges {
  @Input() variant: Variant | null = null;
  @Input() currency = '';
  @Input() saving = false;
  @Output() saved = new EventEmitter<VariantWrite>();
  @Output() cancelled = new EventEmitter<void>();
  readonly moneyFields = [
    { key: 'costPrice', label: 'Cost price' },
    { key: 'currentPrice', label: 'Current price' },
    { key: 'minPrice', label: 'Minimum price' },
    { key: 'maxPrice', label: 'Maximum price' },
  ] as const;
  readonly form = new FormGroup(
    {
      sku: new FormControl('', {
        nonNullable: true,
        validators: [requiredText, Validators.maxLength(80)],
      }),
      name: new FormControl('', {
        nonNullable: true,
        validators: [requiredText, Validators.maxLength(120)],
      }),
      costPrice: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(moneyPattern)],
      }),
      currentPrice: new FormControl('', { nonNullable: true, validators: [positiveMoney] }),
      minPrice: new FormControl('', { nonNullable: true, validators: [positiveMoney] }),
      maxPrice: new FormControl('', { nonNullable: true, validators: [positiveMoney] }),
      status: new FormControl<CatalogStatus>('ACTIVE', { nonNullable: true }),
    },
    { validators: priceBounds },
  );
  ngOnChanges(changes: SimpleChanges) {
    if (!changes['variant']) return;
    this.form.reset({
      sku: this.variant?.sku ?? '',
      name: this.variant?.name ?? '',
      costPrice: this.variant?.costPrice ?? '',
      currentPrice: this.variant?.currentPrice ?? '',
      minPrice: this.variant?.minPrice ?? '',
      maxPrice: this.variant?.maxPrice ?? '',
      status: this.variant?.status ?? 'ACTIVE',
    });
  }
  belowCost() {
    const cost = decimalUnits(this.form.controls.costPrice.value);
    const price = decimalUnits(this.form.controls.currentPrice.value);
    return cost !== null && price !== null && price < cost;
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;
    const value = this.form.getRawValue();
    this.saved.emit({
      ...value,
      sku: value.sku.trim(),
      name: value.name.trim(),
      version: this.variant?.version,
    });
  }
}
