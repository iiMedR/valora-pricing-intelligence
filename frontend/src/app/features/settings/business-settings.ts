import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi, apiError } from '../catalog/services/catalog-api.service';
import { BusinessSettings as Settings } from '../catalog/models/catalog.models';
import { requiredText } from '../catalog/components/form-validation';
import { SessionService } from '../../core/session.service';
@Component({
  imports: [ReactiveFormsModule],
  template: ` <p class="eyebrow">YOUR BUSINESS</p>
    <h1 class="page-title">Business settings</h1>
    <p class="muted">Set the display name and currency for this installation.</p>
    <p class="notice">
      Currency cannot change once any variant exists, including archived variants. Changing it would
      reinterpret every monetary value.
    </p>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button (click)="load()" [disabled]="saving()">Reload settings</button>
      </div>
    }
    @if (message()) {
      <p role="status" class="success">{{ message() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading settings…</p>
    } @else if (settings()) {
      @if (readOnly()) {
        <section class="editor">
          <h2>Read-only synthetic settings</h2>
          <p>{{ settings()?.displayName }} · {{ settings()?.currencyCode }}</p>
          <p>No merchant settings can be edited in the demo.</p>
        </section>
      } @else {
        <form class="editor" [formGroup]="form" (ngSubmit)="save()">
          <label
            >Business display name<input formControlName="displayName" maxlength="120"
          /></label>
          <label
            >Currency code<input
              formControlName="currencyCode"
              maxlength="3"
              pattern="[A-Z]{3}"
              placeholder="MAD"
              aria-describedby="currency-help"
          /></label>
          <p id="currency-help" class="muted">
            Uppercase ISO 4217 code, such as MAD, EUR, or USD. The server checks that it is a
            recognized code.
          </p>
          @if (form.touched && form.invalid) {
            <p class="field-error">
              Use a display name with 2–120 characters and a three-letter uppercase currency code.
            </p>
          }
          <button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save settings' }}
          </button>
        </form>
      }
    }`,
})
export class BusinessSettings {
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
  private readonly api = inject(CatalogApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly settings = signal<Settings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.minLength(2), Validators.maxLength(120)],
    }),
    currencyCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)],
    }),
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .settings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.settings.set(data);
          this.form.reset({ displayName: data.displayName, currencyCode: data.currencyCode });
          this.loading.set(false);
        },
        error: (e) => {
          this.settings.set(null);
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  save() {
    if (this.readOnly()) return;
    this.form.markAllAsTouched();
    const current = this.settings();
    if (!current || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    const value = this.form.getRawValue();
    this.api
      .saveSettings({ ...value, displayName: value.displayName.trim(), version: current.version })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.settings.set(data);
          this.saving.set(false);
          this.message.set('Business settings saved.');
          this.form.markAsPristine();
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(apiError(e));
        },
      });
  }
}
