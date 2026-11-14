import { editorLeaveGuard } from './core/editor-session';
import { Routes } from '@angular/router';
import { authGuard, writeGuard } from './core/auth-integration';
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
    title: 'Valora | Understand your next pricing decision',
  },
  { path: 'welcome', redirectTo: '', pathMatch: 'full' },
  ...[
    'saas',
    'saas/plans',
    'saas/subscriptions',
    'saas/revenue',
    'saas/insights',
    'saas/settings',
  ].map((path) => ({
    path,
    canActivate: [authGuard],
    canDeactivate: [
      (component: { canLeave: () => boolean | Promise<boolean> }) => component.canLeave(),
    ],
    loadComponent: () =>
      import('./features/subscription/workspace').then((m) => m.SubscriptionWorkspace),
    title: 'Subscriptions | Valora',
  })),
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Overview | Valora',
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
    title: 'Onboarding | Valora',
  },
  {
    path: 'onboarding/variants/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/variant-readiness').then((m) => m.VariantReadiness),
    title: 'Variant Readiness | Valora',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    title: 'Sign in | Valora',
  },
  {
    path: 'store-connection/callback',
    loadComponent: () =>
      import('./features/store-connection/callback-outcome').then((m) => m.CallbackOutcome),
    title: 'Authorization outcome | Valora',
  },
  {
    path: 'store-connection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/store-connection/store-connection').then((m) => m.StoreConnection),
    title: 'Store Connection | Valora',
  },
  {
    path: 'optimization',
    canActivate: [authGuard],
    loadComponent: () => import('./features/optimization/optimization').then((m) => m.Optimization),
    title: 'Pricing insights | Valora',
  },
  {
    path: 'forecasting',
    canActivate: [authGuard],
    loadComponent: () => import('./features/forecasting/forecasting').then((m) => m.Forecasting),
    title: 'Demand Forecasting | Valora',
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics),
    title: 'Analytics | Valora',
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/orders').then((m) => m.Orders),
    title: 'Sales orders | Valora',
  },
  {
    path: 'orders/new',
    canDeactivate: [editorLeaveGuard],
    canActivate: [writeGuard],
    loadComponent: () => import('./features/history/order-form').then((m) => m.OrderForm),
    title: 'Enter order | Valora',
  },
  {
    path: 'orders/:id',
    canDeactivate: [editorLeaveGuard],
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/order-detail').then((m) => m.OrderDetail),
    title: 'Order detail | Valora',
  },
  {
    path: 'products/:productId/variants/:variantId/history',
    canDeactivate: [editorLeaveGuard],
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/variant-history').then((m) => m.VariantHistory),
    title: 'Variant history | Valora',
  },
  {
    path: 'products',
    canDeactivate: [editorLeaveGuard],
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalog/pages/product-list').then((m) => m.ProductList),
    title: 'Products | Valora',
  },
  {
    path: 'products/:id',
    canDeactivate: [editorLeaveGuard],
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/catalog/pages/product-detail').then((m) => m.ProductDetail),
    title: 'Product detail | Valora',
  },
  {
    path: 'categories',
    canDeactivate: [editorLeaveGuard],
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalog/pages/categories').then((m) => m.Categories),
    title: 'Categories | Valora',
  },
  {
    path: 'settings',
    canDeactivate: [editorLeaveGuard],
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/business-settings').then((m) => m.BusinessSettings),
    title: 'Business settings | Valora',
  },
  { path: '**', redirectTo: '' },
];
