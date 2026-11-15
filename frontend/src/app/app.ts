import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BackendStatus } from './core/backend-status';
import { EnvironmentIndicator } from './core/environment-indicator';
import { SessionNav } from './core/session-nav';
import { ConfirmDialog } from './core/confirmation';
import { BrandMark } from './shared/merchant/brand-mark';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideHouse,
  lucidePackage,
  lucideTags,
  lucideShoppingCart,
  lucideChartNoAxesCombined,
  lucideTrendingUp,
  lucideLightbulb,
  lucideClipboardCheck,
  lucideStore,
  lucideSettings,
} from '@ng-icons/lucide';
@Component({
  selector: 'app-root',
  imports: [
    BrandMark,
    BackendStatus,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    EnvironmentIndicator,
    SessionNav,
    ConfirmDialog,
    NgIcon,
  ],
  viewProviders: [
    provideIcons({
      lucideHouse,
      lucidePackage,
      lucideTags,
      lucideShoppingCart,
      lucideChartNoAxesCombined,
      lucideTrendingUp,
      lucideLightbulb,
      lucideClipboardCheck,
      lucideStore,
      lucideSettings,
    }),
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly publicPage = signal(['/', '/welcome', '/login'].includes(window.location.pathname));
  readonly pageTitle = signal('Overview');
  readonly menuOpen = signal(false);
  private navigationScroll = 0;
  private lastPath: string | null = null;
  private restoreTimer?: ReturnType<typeof setTimeout>;
  readonly main = viewChild<ElementRef<HTMLElement>>('content');
  readonly menu = viewChild<ElementRef<HTMLButtonElement>>('menu');
  readonly saas = signal(false);
  readonly modeLoaded = signal(false);
  private readonly router = inject(Router);
  setBusinessMode(mode: string) {
    this.saas.set(mode === 'SAAS_SUBSCRIPTION');
    if (this.saas() && this.router.url === '/dashboard')
      void this.router.navigateByUrl('/saas').then(() => this.modeLoaded.set(true));
    else this.modeLoaded.set(true);
  }
  get groups() {
    return this.saas()
      ? [
          {
            label: 'Subscriptions',
            links: [
              ['/saas', 'Overview', 'lucideHouse'],
              ['/saas/plans', 'Plans', 'lucidePackage'],
              ['/saas/subscriptions', 'Subscriptions', 'lucideTags'],
              ['/saas/revenue', 'Revenue & retention', 'lucideChartNoAxesCombined'],
              ['/saas/insights', 'Pricing insights', 'lucideLightbulb'],
              ['/saas/settings', 'Settings & data', 'lucideSettings'],
            ],
          },
        ]
      : this.ecommerceGroups;
  }
  readonly ecommerceGroups = [
    {
      label: '',
      links: [
        ['/dashboard', 'Overview', 'lucideHouse'],
        ['/products', 'Products', 'lucidePackage'],
        ['/orders', 'Orders', 'lucideShoppingCart'],
      ],
    },
    {
      label: 'Insights',
      links: [
        ['/analytics', 'Analytics', 'lucideChartNoAxesCombined'],
        ['/forecasting', 'Forecasts', 'lucideTrendingUp'],
        ['/optimization', 'Pricing insights', 'lucideLightbulb'],
      ],
    },
    {
      label: 'Settings',
      links: [
        ['/store-connection', 'Shopify', 'lucideStore'],
        ['/onboarding', 'Data readiness', 'lucideClipboardCheck'],
        ['/settings', 'Business settings', 'lucideSettings'],
        ['/categories', 'Categories', 'lucideTags'],
      ],
    },
  ];
  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((event) => {
        const path = (event as NavigationEnd).urlAfterRedirects.split('?')[0];
        this.publicPage.set(['/', '/welcome', '/login'].includes(path.split('#')[0]));
        if (this.saas() && path === '/dashboard') {
          void this.router.navigateByUrl('/saas');
          return;
        }
        const changedPage = this.lastPath !== path;
        this.lastPath = path;
        this.pageTitle.set(
          this.groups
            .flatMap((group) => group.links)
            .find(
              (link) => path === link[0] || (link[0] !== '/' && path.startsWith(link[0] + '/')),
            )?.[1] ?? 'Valora',
        );
        clearTimeout(this.restoreTimer);
        this.menuOpen.set(false);
        // Focus the destination landmark after routed content is inserted, without interrupting form updates.
        if (changedPage)
          setTimeout(() => this.main()?.nativeElement.focus({ preventScroll: true }));
      });
  }
  toggleMenu() {
    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }
    clearTimeout(this.restoreTimer);
    this.navigationScroll = window.scrollY;
    this.menuOpen.set(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setTimeout(() => document.querySelector<HTMLElement>('#primary-navigation button')?.focus());
  }
  @HostListener('document:keydown', ['$event']) containNavigation(event: KeyboardEvent) {
    if (!this.menuOpen() || event.key !== 'Tab' || document.querySelector('dialog[open]')) return;
    const controls = [
      ...document.querySelectorAll<HTMLElement>(
        '#primary-navigation button, #primary-navigation a[href]',
      ),
    ];
    const first = controls[0],
      last = controls[controls.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !document.getElementById('primary-navigation')?.contains(document.activeElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !document.getElementById('primary-navigation')?.contains(document.activeElement))
    ) {
      event.preventDefault();
      first?.focus();
    }
  }
  @HostListener('document:keydown.escape') closeMenu() {
    if (document.querySelector('dialog[open]')) return;
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.menu()?.nativeElement.focus({ preventScroll: true });
      this.restoreTimer = setTimeout(() =>
        window.scrollTo({ top: this.navigationScroll, left: 0, behavior: 'auto' }),
      );
    }
  }
}
