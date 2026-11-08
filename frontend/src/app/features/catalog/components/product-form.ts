import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { EditForm, ControlState } from '../../../core/editor-state';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CatalogStatus, Product, ProductWrite } from '../models/catalog.models';
import { requiredText } from './form-validation';
@Component({
  selector: 'app-product-form',
  imports: [ZardButtonComponent, ZardInputComponent, EditForm, ControlState, ReactiveFormsModule],
  template: ` <form
    appEditForm
    [editorBusy]="saving"
    [formGroup]="form"
    (ngSubmit)="submit()"
    class="editor"
  >
    <h2>{{ product ? 'Edit product' : 'Create product' }}</h2>
    <label
      >Product name<input
        z-input
        formControlName="name"
        required
        [attr.aria-describedby]="
          form.controls.name.touched && form.controls.name.invalid ? 'product-name-error' : null
        "
        maxlength="160"
        autocomplete="off"
    /></label>
    @if (form.controls.name.touched && form.controls.name.invalid) {
      <p class="field-error" id="product-name-error">Enter a product name with 2–160 characters.</p>
    }
    <label
      >Description<textarea formControlName="description" maxlength="2000" rows="3"></textarea>
    </label>
    <label
      >Category<select formControlName="categoryId">
        <option value="">Uncategorized</option>
        @for (category of categories; track category.id) {
          <option [value]="category.id">{{ category.name }}</option>
        }
      </select></label
    >
    @if (product) {
      <label
        >Status<select formControlName="status">
          <option value="ARCHIVED">Archived</option>
          <option value="ACTIVE">Active</option>
        </select></label
      >
      <p class="muted">An active product needs at least one active variant.</p>
    } @else {
      <p class="muted">
        Products start archived. Add an active variant, then activate the product.
      </p>
    }
    <div class="actions">
      <button z-button class="primary" type="submit" [disabled]="saving">
        {{ saving ? 'Saving…' : 'Save product' }}</button><button
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
export class ProductForm implements OnChanges {
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];
  @Input() saving = false;
  @Output() saved = new EventEmitter<ProductWrite>();
  @Output() cancelled = new EventEmitter<void>();
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.minLength(2), Validators.maxLength(160)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
    categoryId: new FormControl('', { nonNullable: true }),
    status: new FormControl<CatalogStatus>('ARCHIVED', { nonNullable: true }),
  });
  ngOnChanges(changes: SimpleChanges) {
    if (!changes['product']) return;
    this.form.reset({
      name: this.product?.name ?? '',
      description: this.product?.description ?? '',
      categoryId: this.product?.categoryId ?? '',
      status: this.product?.status ?? 'ARCHIVED',
    });
  }
  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;
    const value = this.form.getRawValue();
    this.saved.emit({
      ...value,
      name: value.name.trim(),
      categoryId: value.categoryId || null,
      version: this.product?.version,
    });
  }
}
