import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { authGuard, writeGuard } from './core/auth-integration';
export const routes: Routes = [
  { path: '', component: Home, title: 'Overview | SmartPricing' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    title: 'Sign in | SmartPricing',
  },
  {
    path: 'store-connection/callback',
    loadComponent: () =>
      import('./features/store-connection/callback-outcome').then((m) => m.CallbackOutcome),
    title: 'Authorization outcome | SmartPricing',
  },
  {
    path: 'store-connection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/store-connection/store-connection').then((m) => m.StoreConnection),
    title: 'Store Connection | SmartPricing',
  },
  {
    path: 'optimization',
    canActivate: [authGuard],
    loadComponent: () => import('./features/optimization/optimization').then((m) => m.Optimization),
    title: 'Pricing Recommendations | SmartPricing',
  },
  {
    path: 'forecasting',
    canActivate: [authGuard],
    loadComponent: () => import('./features/forecasting/forecasting').then((m) => m.Forecasting),
    title: 'Demand Forecasting | SmartPricing',
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics),
    title: 'Analytics | SmartPricing',
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/orders').then((m) => m.Orders),
    title: 'Sales orders | SmartPricing',
  },
  {
    path: 'orders/new',
    canActivate: [writeGuard],
    loadComponent: () => import('./features/history/order-form').then((m) => m.OrderForm),
    title: 'Enter order | SmartPricing',
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/order-detail').then((m) => m.OrderDetail),
    title: 'Order detail | SmartPricing',
  },
  {
    path: 'products/:productId/variants/:variantId/history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/variant-history').then((m) => m.VariantHistory),
    title: 'Variant history | SmartPricing',
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalog/pages/product-list').then((m) => m.ProductList),
    title: 'Products | SmartPricing',
  },
  {
    path: 'products/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/catalog/pages/product-detail').then((m) => m.ProductDetail),
    title: 'Product detail | SmartPricing',
  },
  {
    path: 'categories',
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalog/pages/categories').then((m) => m.Categories),
    title: 'Categories | SmartPricing',
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/business-settings').then((m) => m.BusinessSettings),
    title: 'Business settings | SmartPricing',
  },
  { path: '**', redirectTo: '' },
];
