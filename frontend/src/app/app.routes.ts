import { Routes } from '@angular/router';
import { Home } from './features/home/home';
export const routes: Routes = [
  { path: '', component: Home, title: 'Overview | SmartPricing' },
  {
    path: 'forecasting',
    loadComponent: () => import('./features/forecasting/forecasting').then((m) => m.Forecasting),
    title: 'Demand Forecasting | SmartPricing',
  },
  {
    path: 'analytics',
    loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics),
    title: 'Analytics | SmartPricing',
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/history/orders').then((m) => m.Orders),
    title: 'Sales orders | SmartPricing',
  },
  {
    path: 'orders/new',
    loadComponent: () => import('./features/history/order-form').then((m) => m.OrderForm),
    title: 'Enter order | SmartPricing',
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./features/history/order-detail').then((m) => m.OrderDetail),
    title: 'Order detail | SmartPricing',
  },
  {
    path: 'products/:productId/variants/:variantId/history',
    loadComponent: () => import('./features/history/variant-history').then((m) => m.VariantHistory),
    title: 'Variant history | SmartPricing',
  },
  {
    path: 'products',
    loadComponent: () => import('./features/catalog/pages/product-list').then((m) => m.ProductList),
    title: 'Products | SmartPricing',
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/catalog/pages/product-detail').then((m) => m.ProductDetail),
    title: 'Product detail | SmartPricing',
  },
  {
    path: 'categories',
    loadComponent: () => import('./features/catalog/pages/categories').then((m) => m.Categories),
    title: 'Categories | SmartPricing',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/business-settings').then((m) => m.BusinessSettings),
    title: 'Business settings | SmartPricing',
  },
  { path: '**', redirectTo: '' },
];
