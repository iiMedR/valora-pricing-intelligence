import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { EditorState } from '../../../core/editor-state';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { CatalogApi, apiError } from '../services/catalog-api.service';
import { Category, Page, Product, ProductWrite } from '../models/catalog.models';
import { ProductForm } from '../components/product-form';
import { SessionService } from '../../../core/session.service';
@Component({
  imports: [ZardButtonComponent, ZardInputComponent, RouterLink, ReactiveFormsModule, ProductForm],
  template: ` <div class="page-heading">
      <div>
        <p class="eyebrow">CATALOG</p>
        <h1 class="page-title">Products</h1>
        <p class="muted">Manage products and their sellable variants. Prices belong to variants.</p>
      </div>
      <button
        z-button
        class="primary"
        (click)="creating.set(true)"
        [disabled]="loading() || readOnly() || creating()"
      >
        Create product
      </button>
    </div>
    @if (readOnly()) {
      <p class="notice">
        Synthetic demo · product creation is disabled. Browse the existing seeded catalog.
      </p>
    }
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button z-button zType="outline" (click)="load()">Retry</button>
      </div>
    }
    @if (creating() && !readOnly()) {
      <app-product-form
        [categories]="categories()"
        [saving]="saving()"
        (saved)="save($event)"
        (cancelled)="creating.set(false)"
      />
    }
    <form class="filters" [formGroup]="filters" (ngSubmit)="apply()">
      <label
        >Search products<input
          z-input
          formControlName="search"
          type="search"
          maxlength="160"
          placeholder="Search by name"
      /></label>
      <label
        >Category<select formControlName="categoryId">
          <option value="">All categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select></label
      >
      <label
        >Status<select formControlName="status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select></label
      >
      <button z-button zType="outline" type="submit">Apply filters</button>
    </form>
    @if (loading()) {
      <p role="status">Loading products…</p>
    } @else if (result(); as page) {
      @if (page.content.length === 0) {
        <div class="empty">
          <h2>No products found</h2>
          <p>
            {{
              readOnly()
                ? 'No synthetic records match these filters. Clear your search or status filter.'
                : 'Create a product, connect a store, or change your filters.'
            }}
          </p>
        </div>
      } @else {
        <div
          class="table-wrap"
          role="region"
          tabindex="0"
          aria-label="Products table, scroll horizontally"
        >
          <table>
            <caption class="sr-only">
              Products
            </caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Manage</th>
              </tr>
            </thead>
            <tbody>
              @for (p of page.content; track p.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/products', p.id]">{{ p.name }}</a>
                  </td>
                  <td>{{ categoryName(p.categoryId) }}</td>
                  <td>
                    <span class="badge">{{ p.status }}</span>
                  </td>
                  <td>
                    <a [routerLink]="['/products', p.id]"
                      >View / edit<span class="sr-only"> {{ p.name }}</span></a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <div class="pagination">
        <span
          >{{ page.totalElements }} products · Page {{ page.page + 1 }} of
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
export class ProductList {
  private readonly editors = inject(EditorState);
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
  private readonly api = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private pending?: Subscription;
  readonly categories = signal<Category[]>([]);
  readonly result = signal<Page<Product> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly creating = signal(false);
  readonly saving = signal(false);
  readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });
  private page = 0;
  constructor() {
    this.load();
  }
  load() {
    this.pending?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.pending = forkJoin({
      categories: this.api.categories(),
      products: this.api.products({ ...this.filters.getRawValue(), page: this.page, size: 20 }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          this.categories.set(value.categories);
          this.result.set(value.products);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(apiError(error));
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
  categoryName(id: string | null) {
    return this.categories().find((c) => c.id === id)?.name ?? 'Uncategorized';
  }
  save(body: ProductWrite) {
    if (this.readOnly() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .saveProduct(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.editors.saved();
          this.saving.set(false);
          void this.router.navigate(['/products', product.id]);
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(apiError(error));
        },
      });
  }
}
