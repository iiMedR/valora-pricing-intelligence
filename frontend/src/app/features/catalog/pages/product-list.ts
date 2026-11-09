import { ProductEntry } from '../components/product-entry';
import { SearchField } from '../../../shared/merchant/foundation';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { EditorState } from '../../../core/editor-state';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, forkJoin, Subscription } from 'rxjs';
import { CatalogApi, apiError } from '../services/catalog-api.service';
import { Category, Page, Product, ProductWrite } from '../models/catalog.models';
import { ProductForm } from '../components/product-form';
import { SessionService } from '../../../core/session.service';
@Component({
  imports: [
    ProductEntry,
    SearchField,
    ZardButtonComponent,
    ZardInputComponent,
    ReactiveFormsModule,
    ProductForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-list.css',
  template: ` <div class="page-heading">
      <div>
        <h1 class="page-title">Products</h1>
        <p class="muted">Find products and review variant prices.</p>
      </div>
      <button
        z-button
        class="primary"
        (click)="creating.set(true)"
        [disabled]="loading() || readOnly() || creating()"
        [attr.aria-describedby]="readOnly() ? 'catalog-read-only' : null"
      >
        Create product
      </button>
    </div>
    @if (readOnly()) {
      <p class="muted" id="catalog-read-only">Demo is read-only.</p>
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
      <app-search-field
        ><input
          z-input
          formControlName="search"
          type="search"
          maxlength="160"
          placeholder="Search by name"
          aria-label="Search products"
      /></app-search-field>
      <label
        >Category<select formControlName="categoryId" aria-label="Category">
          <option value="">All categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select></label
      >
      <label
        >Status<select formControlName="status" aria-label="Status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select></label
      >
      <div class="filter-actions">
        <button z-button zType="outline" type="submit">Apply filters</button
        ><button z-button zType="ghost" type="button" (click)="reset()">Clear filters</button>
      </div>
    </form>
    <div class="catalog-controls">
      <p class="muted">Newest added first</p>
      <div role="group" aria-label="Product view">
        <button
          z-button
          zType="outline"
          type="button"
          [attr.aria-pressed]="view() === 'grid'"
          (click)="setView('grid')"
        >
          Grid</button
        ><button
          z-button
          zType="outline"
          type="button"
          [attr.aria-pressed]="view() === 'list'"
          (click)="setView('list')"
        >
          List
        </button>
      </div>
    </div>
    @if (loading()) {
      <p role="status" aria-live="polite">Loading products…</p>
    } @else if (!error() && result(); as page) {
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
        <div class="catalog-results" [class.catalog-list]="view() === 'list'" aria-label="Products">
          @for (p of page.content; track p.id) {
            <app-product-entry
              [product]="p"
              [category]="categoryName(p.categoryId)"
              [view]="view()"
              [context]="context()"
            />
          }
        </div>
      }
      <div class="pagination" aria-live="polite">
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
  private readonly changeDetector = inject(ChangeDetectorRef);
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
  readonly view = signal<'grid' | 'list'>('grid');
  private readonly route = inject(ActivatedRoute);
  private queryKey = '';
  readonly context = () => ({ ...this.filters.getRawValue(), page: this.page, view: this.view() });
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const status = params.get('status') ?? '';
      this.filters.setValue(
        {
          search: (params.get('search') ?? '').slice(0, 160),
          categoryId: params.get('categoryId') ?? '',
          status: ['ACTIVE', 'ARCHIVED'].includes(status) ? status : '',
        },
        { emitEvent: false },
      );
      const page = Number(params.get('page'));
      this.page = Number.isSafeInteger(page) && page >= 0 && page <= 100000 ? page : 0;
      this.view.set(params.get('view') === 'list' ? 'list' : 'grid');
      const key = JSON.stringify({ ...this.filters.getRawValue(), page: this.page });
      if (key !== this.queryKey) {
        this.queryKey = key;
        this.load();
      }
    });
    this.filters.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.apply(true));
    effect(() => {
      const session = this.session.value();
      if (session?.mode === 'NORMAL' && !session.authenticated) {
        this.pending?.unsubscribe();
        this.result.set(null);
        this.creating.set(false);
      }
    });
  }
  private sync(replaceUrl = false) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.context(),
      replaceUrl,
    });
  }
  setView(view: 'grid' | 'list') {
    this.view.set(view);
    this.sync(true);
  }
  reset() {
    this.filters.reset({ search: '', categoryId: '', status: '' }, { emitEvent: false });
    this.apply();
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
  apply(replaceUrl = false) {
    this.page = 0;
    const key = JSON.stringify({ ...this.filters.getRawValue(), page: this.page });
    if (replaceUrl && key === this.queryKey) return;
    this.queryKey = key;
    this.load();
    this.sync(replaceUrl);
  }
  changePage(delta: number) {
    const target = this.page + delta;
    if (target < 0 || target >= (this.result()?.totalPages ?? 0)) return;
    this.page = target;
    this.queryKey = JSON.stringify({ ...this.filters.getRawValue(), page: this.page });
    this.load();
    this.sync();
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
          this.creating.set(false);
          // Remove the completed editor before the leave guard reads its previous busy input.
          this.changeDetector.detectChanges();
          void this.router.navigate(['/products', product.id]);
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(apiError(error));
        },
      });
  }
}
