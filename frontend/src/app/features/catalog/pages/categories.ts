import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Confirmation } from '../../../core/confirmation';
import { EditForm, ControlState } from '../../../core/editor-state';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi, apiError } from '../services/catalog-api.service';
import { Category } from '../models/catalog.models';
import { requiredText } from '../components/form-validation';
import { SessionService } from '../../../core/session.service';
@Component({
  imports: [ZardButtonComponent, ZardInputComponent, EditForm, ControlState, ReactiveFormsModule],
  styleUrl: './categories.css',
  template: ` <p class="eyebrow">Catalog organization</p>
    <h1 class="page-title">Categories</h1>
    <p class="muted">Group products into flat categories. Categories in use cannot be deleted.</p>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }}
        <button z-button zType="outline" (click)="load()" [disabled]="saving()">Reload</button>
      </div>
    }
    @if (message()) {
      <p role="status" class="success">{{ message() }}</p>
    }
    @if (!readOnly()) {
      <form
        appEditForm
        [editorBusy]="saving()"
        class="editor"
        [formGroup]="form"
        (ngSubmit)="save()"
      >
        <h2>{{ selected() ? 'Edit category' : 'Create category' }}</h2>
        <label>Category name<input z-input formControlName="name" maxlength="100" /></label
        ><label
          >Description<textarea formControlName="description" maxlength="500" rows="2"></textarea>
        </label>
        @if (form.touched && form.invalid) {
          <p class="field-error">
            Name must contain 2–100 characters; description is limited to 500.
          </p>
        }
        <div class="actions">
          <button z-button type="submit" class="primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save category' }}
          </button>
          @if (selected()) {
            <button z-button zType="outline" type="button" (click)="clear()" [disabled]="saving()">
              Cancel edit
            </button>
          }
        </div>
      </form>
    } @else {
      <p class="notice">Synthetic demo · categories are read-only.</p>
    }
    @if (loading()) {
      <p role="status">Loading categories…</p>
    } @else if (categories().length === 0 && !error()) {
      <div class="empty">
        {{
          readOnly()
            ? 'No categories in this view.'
            : 'No categories yet. Create your first category above.'
        }}
      </div>
    } @else {
      <div class="category-list" role="list" aria-label="Catalog categories">
        @for (c of categories(); track c.id) {
          <article class="category-row" role="listitem">
            <div>
              <h2>{{ c.name }}</h2>
              <p class="muted">{{ c.description || 'No description.' }}</p>
            </div>
            @if (!readOnly()) {
              <div class="actions">
                <button
                  z-button
                  zType="outline"
                  (click)="edit(c)"
                  [disabled]="saving() || readOnly()"
                >
                  Edit<span class="sr-only"> {{ c.name }}</span></button
                ><button
                  z-button
                  zType="outline"
                  (click)="remove(c)"
                  [disabled]="saving() || readOnly()"
                >
                  Delete<span class="sr-only"> {{ c.name }}</span>
                </button>
              </div>
            }
          </article>
        }
      </div>
    }`,
})
export class Categories {
  private readonly confirmation = inject(Confirmation);
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
  private readonly api = inject(CatalogApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly categories = signal<Category[]>([]);
  readonly selected = signal<Category | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [requiredText, Validators.minLength(2), Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .categories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.categories.set(data);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.loading.set(false);
        },
      });
  }
  edit(category: Category) {
    if (this.readOnly() || this.saving()) return;
    this.selected.set(category);
    this.form.reset({ name: category.name, description: category.description ?? '' });
    this.message.set('');
    this.error.set('');
  }
  clear() {
    this.selected.set(null);
    this.form.reset();
  }
  save() {
    if (this.readOnly()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    const body = this.form.getRawValue();
    this.api
      .saveCategory(
        { ...body, name: body.name.trim(), version: this.selected()?.version },
        this.selected()?.id,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Category saved.');
          this.clear();
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(apiError(e));
        },
      });
  }
  async remove(category: Category) {
    if (this.readOnly()) return;
    if (
      !(await this.confirmation.ask(
        'Delete unused category?',
        'Delete category ' + category.name + '? This is only allowed when no products use it.',
        'Delete category',
      ))
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    this.api
      .deleteCategory(category)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Category deleted.');
          if (this.selected()?.id === category.id) this.clear();
          this.load();
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(apiError(e));
        },
      });
  }
}
