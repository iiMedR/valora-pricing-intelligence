import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import {
  BusinessSettings,
  BusinessWrite,
  Category,
  CategoryWrite,
  Product,
  ProductWrite,
  ProductDetail,
  ProductQuery,
  Variant,
  VariantWrite,
  Page,
} from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  categories() {
    return this.http.get<Category[]>('/api/v1/categories');
  }
  saveCategory(body: CategoryWrite, id?: string) {
    return id
      ? this.http.put<Category>('/api/v1/categories/' + id, body)
      : this.http.post<Category>('/api/v1/categories', body);
  }
  deleteCategory(category: Category) {
    return this.http.delete<void>('/api/v1/categories/' + category.id, {
      params: { version: category.version },
    });
  }
  products(query: ProductQuery) {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    for (const key of ['search', 'categoryId', 'status'] as const)
      if (query[key]) params = params.set(key, query[key]);
    return this.http.get<Page<Product>>('/api/v1/products', { params });
  }
  detail(id: string) {
    return this.http.get<ProductDetail>('/api/v1/products/' + id);
  }
  saveProduct(body: ProductWrite, id?: string) {
    return id
      ? this.http.put<Product>('/api/v1/products/' + id, body)
      : this.http.post<Product>('/api/v1/products', body);
  }
  archiveProduct(product: Product) {
    return this.http.delete<Product>('/api/v1/products/' + product.id, {
      params: { version: product.version },
    });
  }
  saveVariant(productId: string, body: VariantWrite, id?: string) {
    const path = '/api/v1/products/' + productId + '/variants';
    return id ? this.http.put<Variant>(path + '/' + id, body) : this.http.post<Variant>(path, body);
  }
  archiveVariant(variant: Variant) {
    return this.http.delete<Variant>(
      '/api/v1/products/' + variant.productId + '/variants/' + variant.id,
      { params: { version: variant.version } },
    );
  }
  settings() {
    return this.http.get<BusinessSettings>('/api/v1/business-settings');
  }
  saveSettings(body: BusinessWrite) {
    return this.http.put<BusinessSettings>('/api/v1/business-settings', body);
  }
}

export function apiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'The request failed. Please retry.';
  if (error.status === 0) return 'Cannot reach the backend. Check the connection and retry.';
  const body = error.error as {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };
  if (error.status === 403)
    return body?.code === 'DEMO_READ_ONLY'
      ? 'The synthetic demo is read-only. No changes were saved.'
      : 'This action was not allowed. Check your session and permissions, then try again. Your request was not automatically retried.';
  if (error.status === 409 && body?.code === 'STALE_VERSION')
    return 'Your edits are still here. Review the latest record before saving again; reloading will ask before discarding changes.';
  const fields = body?.fieldErrors
    ? Object.entries(body.fieldErrors)
        .map(([key, value]) => key + ': ' + value)
        .join(' · ')
    : '';
  return (
    (body?.message || 'The server could not complete the request (HTTP ' + error.status + ').') +
    (fields ? ' ' + fields : '')
  );
}
