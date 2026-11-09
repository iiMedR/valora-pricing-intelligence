import { ProductThumbnail } from '../../../shared/merchant/product-thumbnail';
import { VariantSummary } from '../components/variant-summary';
import { StatusPill, formatMoney } from '../../../shared/merchant/foundation';
import { ZardButtonComponent } from '@/shared/components/button';
import { EditorState } from '../../../core/editor-state';
import { Confirmation } from '../../../core/confirmation';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { CatalogApi, apiError } from '../services/catalog-api.service';
import {
  BusinessSettings,
  Category,
  ProductDetail as Detail,
  ProductWrite,
  Variant,
  VariantWrite,
} from '../models/catalog.models';
import { ProductForm } from '../components/product-form';
import { VariantForm } from '../components/variant-form';
import { SessionService } from '../../../core/session.service';
@Component({
  imports: [
    ProductThumbnail,
    VariantSummary,
    StatusPill,
    ZardButtonComponent,
    RouterLink,
    ProductForm,
    VariantForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-detail.css',
  template: ` <a routerLink="/products" [queryParams]="backContext()">← Back to results</a>
    @if (!detail()) {
      <h1 class="page-title">Product</h1>
    }
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }}
        <button z-button zType="outline" (click)="reload()" [disabled]="saving()">Reload</button>
      </div>
    }
    @if (message()) {
      <p role="status" class="success">{{ message() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading product…</p>
    } @else if (detail(); as data) {
      <div class="page-heading product-heading">
        <div>
          <app-product-thumbnail class="detail-thumbnail" [name]="data.product.name" />
          <h1 class="page-title">{{ data.product.name }}</h1>
          <p class="muted">
            {{ categoryName() }} · {{ data.variants.length }}
            {{ data.variants.length === 1 ? 'variant' : 'variants' }}
          </p>
          <app-status-pill [label]="data.product.status === 'ACTIVE' ? 'Active' : 'Archived'" />
        </div>
        <div class="actions">
          <button
            z-button
            zType="outline"
            (click)="editingProduct.set(true)"
            [disabled]="saving() || readOnly() || editingProduct() || editingVariant()"
          >
            Edit product</button
          ><button
            z-button
            zType="outline"
            (click)="archiveProduct()"
            [disabled]="
              saving() ||
              readOnly() ||
              editingProduct() ||
              editingVariant() ||
              data.product.status === 'ARCHIVED'
            "
          >
            Archive product
          </button>
        </div>
      </div>
      @if (data.product.description) {
        <details class="product-information">
          <summary>Product information</summary>
          <p>{{ data.product.description }}</p>
          <p>Product ID: {{ data.product.id }}</p>
        </details>
      }
      @if (data.product.status === 'ARCHIVED') {
        <p class="notice">
          This product is archived. Its variants are retained. Add an active variant and edit the
          product to activate it.
        </p>
      }
      @if (readOnly()) {
        <p class="muted" id="detail-read-only">Demo is read-only.</p>
      }
      @if (editingProduct() && !readOnly()) {
        <app-product-form
          [product]="data.product"
          [categories]="categories()"
          [saving]="saving()"
          (saved)="saveProduct($event)"
          (cancelled)="editingProduct.set(false)"
        />
      }
      <section class="section-heading">
        <h2>
          Variants <span class="muted">· {{ settings()?.currencyCode }}</span>
        </h2>
        <button
          z-button
          class="primary"
          (click)="newVariant()"
          [disabled]="saving() || readOnly() || editingProduct() || editingVariant()"
        >
          Add variant
        </button>
      </section>
      @if (editingVariant() && !readOnly()) {
        <app-variant-form
          [variant]="selectedVariant()"
          [currency]="settings()?.currencyCode || ''"
          [saving]="saving()"
          (saved)="saveVariant($event)"
          (cancelled)="editingVariant.set(false)"
        />
      }
      @if (data.variants.length === 0) {
        <div class="empty">
          <h2>No variants yet</h2>
          <p>Add the first sellable SKU with its cost, price, and limits.</p>
        </div>
      } @else {
        <label class="variant-selector"
          >Selected variant<select
            aria-label="Selected variant"
            [value]="focusedVariant()?.id"
            (change)="chooseVariant($any($event.target).value)"
            [disabled]="saving() || editingProduct() || editingVariant()"
          >
            @if (!focusedVariant()) {
              <option value="">Choose a variant</option>
            }
            @for (v of data.variants; track v.id) {
              <option [value]="v.id">
                {{ v.name }} · {{ v.sku }}{{ v.status === 'ARCHIVED' ? ' · Archived' : '' }}
              </option>
            }
          </select></label
        >
        @if (variantId() && !focusedVariant()) {
          <p role="alert">Variant not found in this product. Choose a variant to continue.</p>
        }
        <div class="variant-list">
          @if (focusedVariant(); as v) {
            <article class="variant-card">
              <div class="section-heading">
                <div>
                  <h3>{{ v.name }}</h3>
                  <a [routerLink]="['/products', data.product.id, 'variants', v.id, 'history']"
                    >Price, cost &amp; inventory history</a
                  >
                  <p class="muted">
                    {{ v.sku }} ·
                    <app-status-pill [label]="v.status === 'ACTIVE' ? 'Active' : 'Archived'" />
                  </p>
                </div>
                <div class="actions">
                  <button
                    z-button
                    zType="outline"
                    (click)="editVariant(v)"
                    [disabled]="saving() || readOnly() || editingProduct() || editingVariant()"
                  >
                    Edit<span class="sr-only"> {{ v.sku }}</span></button
                  ><button
                    z-button
                    zType="outline"
                    (click)="archiveVariant(v)"
                    [disabled]="
                      saving() ||
                      readOnly() ||
                      editingProduct() ||
                      editingVariant() ||
                      v.status === 'ARCHIVED'
                    "
                  >
                    Archive<span class="sr-only"> {{ v.sku }}</span>
                  </button>
                </div>
              </div>
              <dl class="money-grid">
                <div>
                  <dt>Current price</dt>
                  <dd>{{ money(v.currentPrice, settings()?.currencyCode || '') }}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>{{ money(v.costPrice, settings()?.currencyCode || '') }}</dd>
                </div>
              </dl>
              <details>
                <summary>Price limits and exact amounts</summary>
                <dl class="money-grid">
                  <div>
                    <dt>Minimum</dt>
                    <dd>{{ money(v.minPrice, settings()?.currencyCode || '') }}</dd>
                  </div>
                  <div>
                    <dt>Maximum</dt>
                    <dd>{{ money(v.maxPrice, settings()?.currencyCode || '') }}</dd>
                  </div>
                </dl>
                <p>
                  Price {{ v.currentPrice }} · cost {{ v.costPrice ?? 'Unavailable' }} · limits
                  {{ v.minPrice }} to {{ v.maxPrice }} {{ settings()?.currencyCode }}
                </p>
              </details>
              <p class="muted">Stock availability: review dated inventory history.</p>
              <app-variant-summary [variant]="v" [context]="evidenceContext()" />
              @if (v.belowCost) {
                <p class="warning">Current price is below cost. This is allowed.</p>
              }
            </article>
          }
        </div>
      }
    }`,
})
export class ProductDetail {
  private readonly confirmation = inject(Confirmation);
  private readonly editors = inject(EditorState);
  async reload() {
    if (await this.editors.canLeave()) this.load();
  }
  private readonly session = inject(SessionService);
  readonly readOnly = () => this.session.value()?.readOnly === true;
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private id = '';
  private readonly router = inject(Router);
  private pending?: Subscription;
  readonly variantId = signal('');
  readonly focusedVariant = computed(() =>
    this.variantId()
      ? (this.detail()?.variants.find((v) => v.id === this.variantId()) ?? null)
      : (this.detail()?.variants[0] ?? null),
  );
  readonly money = formatMoney;
  readonly categoryName = () =>
    this.categories().find((c) => c.id === this.detail()?.product.categoryId)?.name ??
    'Uncategorized';
  readonly backContext = () => {
    const q = this.route.snapshot.queryParamMap;
    return {
      search: q.get('search') ?? '',
      categoryId: q.get('categoryId') ?? '',
      status: q.get('status') ?? '',
      page: q.get('page') ?? 0,
      view: q.get('view') ?? 'grid',
    };
  };
  readonly evidenceContext = () => {
    const c = this.backContext();
    return {
      catalogSearch: c.search,
      catalogCategory: c.categoryId,
      catalogStatus: c.status,
      catalogPage: c.page,
      catalogView: c.view,
    };
  };
  async chooseVariant(id: string) {
    if (this.saving() || this.editingProduct() || this.editingVariant()) return;
    if (!this.detail()?.variants.some((v) => v.id === id)) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: id },
      queryParamsHandling: 'merge',
    });
  }

  readonly detail = signal<Detail | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly settings = signal<BusinessSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly editingProduct = signal(false);
  readonly editingVariant = signal(false);
  readonly selectedVariant = signal<Variant | null>(null);
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id')!;
      if (id !== this.id) {
        this.id = id;
        this.editingProduct.set(false);
        this.editingVariant.set(false);
        this.selectedVariant.set(null);
        this.load();
      }
    });
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.variantId.set(params.get('variant') ?? ''));
    effect(() => {
      const session = this.session.value();
      if (session?.mode === 'NORMAL' && !session.authenticated) {
        this.pending?.unsubscribe();
        this.detail.set(null);
        this.editingProduct.set(false);
        this.editingVariant.set(false);
      }
    });
  }
  load() {
    this.pending?.unsubscribe();
    this.detail.set(null);
    this.loading.set(true);
    this.error.set('');
    this.pending = forkJoin({
      detail: this.api.detail(this.id),
      categories: this.api.categories(),
      settings: this.api.settings(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.detail.set(data.detail);
          this.categories.set(data.categories);
          this.settings.set(data.settings);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(apiError(error));
          this.loading.set(false);
          this.detail.set(null);
        },
      });
  }
  newVariant() {
    if (this.readOnly() || this.saving() || this.editingProduct() || this.editingVariant()) return;
    this.selectedVariant.set(null);
    this.editingVariant.set(true);
    this.message.set('');
    this.error.set('');
  }
  editVariant(variant: Variant) {
    if (this.readOnly() || this.saving() || this.editingProduct() || this.editingVariant()) return;
    this.selectedVariant.set(variant);
    this.editingVariant.set(true);
    this.error.set('');
  }
  private complete(message: string) {
    this.saving.set(false);
    this.message.set(message);
    this.editingProduct.set(false);
    this.editingVariant.set(false);
    this.load();
  }
  private failed(error: unknown) {
    this.saving.set(false);
    this.error.set(apiError(error));
  }
  saveProduct(body: ProductWrite) {
    if (this.readOnly()) return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .saveProduct(body, this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.complete('Product saved.'), error: (e) => this.failed(e) });
  }
  saveVariant(body: VariantWrite) {
    if (this.readOnly()) return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .saveVariant(this.id, body, this.selectedVariant()?.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.complete('Variant saved.'), error: (e) => this.failed(e) });
  }
  async archiveProduct() {
    if (this.readOnly()) return;
    const product = this.detail()?.product;
    if (
      !product ||
      !(await this.confirmation.ask(
        'Archive product?',
        'Its variants, orders and dated history will be retained. Archiving does not delete records.',
        'Archive product',
      ))
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .archiveProduct(product)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.complete('Product archived. All records were retained.'),
        error: (e) => this.failed(e),
      });
  }
  async archiveVariant(variant: Variant) {
    if (this.readOnly()) return;
    if (
      !(await this.confirmation.ask(
        'Archive variant?',
        'Archive ' +
          variant.sku +
          '? All history is retained. If this is the last active variant, the product will also be archived.',
        'Archive variant',
      ))
    )
      return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .archiveVariant(variant)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.complete('Variant archived. The record was retained.'),
        error: (e) => this.failed(e),
      });
  }
}
