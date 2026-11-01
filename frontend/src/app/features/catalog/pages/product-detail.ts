import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
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
@Component({
  imports: [RouterLink, ProductForm, VariantForm],
  template: ` <a routerLink="/products">← All products</a>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }} <button (click)="load()" [disabled]="saving()">Reload</button>
      </div>
    }
    @if (message()) {
      <p role="status" class="success">{{ message() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading product…</p>
    } @else if (detail(); as data) {
      <div class="page-heading">
        <div>
          <p class="eyebrow">PRODUCT DETAIL</p>
          <h1 class="page-title">{{ data.product.name }}</h1>
          <span class="badge">{{ data.product.status }}</span>
        </div>
        <div class="actions">
          <button (click)="editingProduct.set(true)" [disabled]="saving()">Edit product</button
          ><button
            (click)="archiveProduct()"
            [disabled]="saving() || data.product.status === 'ARCHIVED'"
          >
            Archive product
          </button>
        </div>
      </div>
      <p class="muted">{{ data.product.description || 'No description.' }}</p>
      @if (data.product.status === 'ARCHIVED') {
        <p class="notice">
          This product is archived. Its variants are retained. Add an active variant and edit the
          product to activate it.
        </p>
      }
      @if (editingProduct()) {
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
        <button class="primary" (click)="newVariant()" [disabled]="saving() || editingVariant()">
          Add variant
        </button>
      </section>
      @if (editingVariant()) {
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
        <div class="variant-list">
          @for (v of data.variants; track v.id) {
            <article class="variant-card">
              <div class="section-heading">
                <div>
                  <h3>{{ v.name }}</h3>
                  <p class="muted">
                    {{ v.sku }} · <span class="badge">{{ v.status }}</span>
                  </p>
                </div>
                <div class="actions">
                  <button (click)="editVariant(v)" [disabled]="saving()">
                    Edit<span class="sr-only"> {{ v.sku }}</span></button
                  ><button
                    (click)="archiveVariant(v)"
                    [disabled]="saving() || v.status === 'ARCHIVED'"
                  >
                    Archive<span class="sr-only"> {{ v.sku }}</span>
                  </button>
                </div>
              </div>
              <dl class="money-grid">
                <div>
                  <dt>Current price</dt>
                  <dd>{{ v.currentPrice }} {{ settings()?.currencyCode }}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>{{ v.costPrice }}</dd>
                </div>
                <div>
                  <dt>Minimum</dt>
                  <dd>{{ v.minPrice }}</dd>
                </div>
                <div>
                  <dt>Maximum</dt>
                  <dd>{{ v.maxPrice }}</dd>
                </div>
              </dl>
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
  private readonly api = inject(CatalogApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = this.route.snapshot.paramMap.get('id')!;
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
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
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
    this.selectedVariant.set(null);
    this.editingVariant.set(true);
    this.message.set('');
    this.error.set('');
  }
  editVariant(variant: Variant) {
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
    this.saving.set(true);
    this.error.set('');
    this.api
      .saveProduct(body, this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.complete('Product saved.'), error: (e) => this.failed(e) });
  }
  saveVariant(body: VariantWrite) {
    this.saving.set(true);
    this.error.set('');
    this.api
      .saveVariant(this.id, body, this.selectedVariant()?.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.complete('Variant saved.'), error: (e) => this.failed(e) });
  }
  archiveProduct() {
    const product = this.detail()?.product;
    if (!product || !window.confirm('Archive this product? Its variants will be retained.')) return;
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
  archiveVariant(variant: Variant) {
    if (
      !window.confirm(
        'Archive ' +
          variant.sku +
          '? If this is the last active variant, the product will also be archived.',
      )
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
