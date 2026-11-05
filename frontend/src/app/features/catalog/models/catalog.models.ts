export type CatalogStatus = 'ACTIVE' | 'ARCHIVED';
export interface Versioned {
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Category extends Versioned {
  id: string;
  name: string;
  description: string | null;
}
export interface CategoryWrite {
  name: string;
  description: string;
  version?: number;
}
export interface Product extends Versioned {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  status: CatalogStatus;
}
export interface ProductWrite {
  name: string;
  description: string;
  categoryId: string | null;
  status: CatalogStatus;
  version?: number;
}
export interface Variant extends Versioned {
  id: string;
  productId: string;
  sku: string;
  name: string;
  costPrice: string | null;
  currentPrice: string;
  minPrice: string;
  maxPrice: string;
  status: CatalogStatus;
  belowCost: boolean;
}
export interface VariantWrite {
  sku: string;
  name: string;
  costPrice: string;
  currentPrice: string;
  minPrice: string;
  maxPrice: string;
  status: CatalogStatus;
  version?: number;
}
export interface ProductDetail {
  product: Product;
  variants: Variant[];
}
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
export interface BusinessSettings extends Versioned {
  id: number;
  displayName: string;
  currencyCode: string;
}
export interface BusinessWrite {
  displayName: string;
  currencyCode: string;
  version: number;
}
export interface ProductQuery {
  page: number;
  size: number;
  search: string;
  categoryId: string;
  status: string;
}
