import { Page } from '../catalog/models/catalog.models';
export type Source = 'MANUAL' | 'SHOPIFY' | 'DEMO';
export type Quality = 'VERIFIED_CHANGE' | 'SNAPSHOT' | 'INFERRED';
export type OrderStatus = 'COMPLETED' | 'UNPAID' | 'CANCELLED';
export type RefundKind = 'LINE_RETURN' | 'FINANCIAL_ADJUSTMENT' | 'SHIPPING' | 'TAX';
export interface Order {
  id: string;
  source: Source;
  externalReference: string | null;
  placedAt: string;
  sourceUpdatedAt: string | null;
  status: OrderStatus;
  currencyCode: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string | null;
  taxAmount: string | null;
  merchandiseRefunds: string;
  shippingRefunds: string;
  taxRefunds: string;
  netMerchandise: string;
  recognizedNetMerchandise: string;
  totalCharged: string | null;
  itemCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}
export interface OrderLine {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  quantity: number;
  currencyCode: string;
  listUnitPrice: string | null;
  unitPrice: string;
  discountAmount: string;
  lineNet: string;
  unitCost: string | null;
  costProvenance: 'PROVIDED' | 'EFFECTIVE_HISTORY' | 'UNKNOWN';
  sourceLineReference: string | null;
}
export interface Refund {
  id: string;
  orderId: string;
  itemId: string | null;
  source: Source;
  externalReference: string | null;
  refundedAt: string;
  kind: RefundKind;
  quantity: number;
  amount: string;
  currencyCode: string;
  reason: string | null;
  createdAt: string;
}
export interface OrderDetail {
  order: Order;
  lines: OrderLine[];
  refunds: Refund[];
}
export interface LineWrite {
  variantId: string;
  quantity: number;
  listUnitPrice: string | null;
  unitPrice: string;
  discountAmount: string;
  unitCost: string | null;
  sourceLineReference: string | null;
}
export interface OrderWrite {
  source: Source;
  externalReference: string;
  placedAt: string;
  sourceUpdatedAt: string | null;
  status: OrderStatus;
  currencyCode: string;
  shippingAmount: string | null;
  taxAmount: string | null;
  lines: LineWrite[];
}
export interface RefundWrite {
  source: Source;
  externalReference: string;
  refundedAt: string;
  kind: RefundKind;
  itemId: string | null;
  quantity: number;
  amount: string;
  currencyCode: string;
  reason: string;
}
export interface Period {
  id: string;
  variantId: string;
  amount: string;
  currencyCode: string;
  validFrom: string;
  validTo: string | null;
  source: Source;
  quality: Quality;
  externalReference: string | null;
  createdAt: string;
}
export interface Inventory {
  id: string;
  variantId: string;
  observedAt: string;
  quantityAvailable: number;
  source: Source;
  quality: Quality;
  externalReference: string | null;
  stockState: string;
  createdAt: string;
}
export interface PeriodWrite {
  amount: string;
  currencyCode: string;
  validFrom: string;
  validTo: string | null;
  source: Source;
  quality: Quality;
  externalReference: string;
  variantVersion: number;
}
export interface InventoryWrite {
  observedAt: string;
  quantityAvailable: number;
  source: Source;
  quality: Quality;
  externalReference: string;
}
export type HistoryKind = 'price' | 'cost' | 'inventory';
export type HistoryPage = Page<Period | Inventory>;
