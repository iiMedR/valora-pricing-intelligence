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
import { EnvironmentIndicator } from './core/environment-indicator';
import { SessionNav } from './core/session-nav';
import { ConfirmDialog } from './core/confirmation';
@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    EnvironmentIndicator,
    SessionNav,
    ConfirmDialog,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly menuOpen = signal(false);
  private navigationScroll = 0;
  private restoreTimer?: ReturnType<typeof setTimeout>;
  readonly main = viewChild<ElementRef<HTMLElement>>('content');
  readonly menu = viewChild<ElementRef<HTMLButtonElement>>('menu');
  readonly groups = [
    {
      label: 'Get started',
      links: [
        ['/', 'Overview'],
        ['/store-connection', 'Store connection'],
        ['/onboarding', 'Onboarding'],
      ],
    },
    {
      label: 'Manage records',
      links: [
        ['/products', 'Products'],
        ['/categories', 'Categories'],
        ['/orders', 'Orders & refunds'],
      ],
    },
    {
      label: 'Review performance',
      links: [
        ['/analytics', 'Analytics'],
        ['/forecasting', 'Demand forecasting'],
        ['/optimization', 'Pricing recommendations'],
      ],
    },
    { label: 'Your business', links: [['/settings', 'Business settings']] },
  ];
  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        clearTimeout(this.restoreTimer);
        this.menuOpen.set(false);
        // Focus the destination landmark after routed content is inserted, without interrupting form updates.
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
