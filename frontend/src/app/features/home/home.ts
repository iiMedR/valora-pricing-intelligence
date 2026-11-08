import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HealthService } from '../../core/health.service';
import { SessionService } from '../../core/session.service';
import {
  AnalyticsApi,
  Overview,
  Trends,
  decimalText,
  initialWindow,
} from '../analytics/analytics-api.service';
import { OnboardingApi, Summary } from '../onboarding/onboarding-api';
import { forkJoin, Subscription } from 'rxjs';
import {
  ChartPanel,
  DataFreshness,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MetricCard,
  PageHeader,
  ReadinessChecklist,
  StatusNotice,
} from '../../shared/merchant/primitives';
import { SalesChart } from '../../shared/merchant/sales-chart';
import { ZardButtonComponent } from '../../shared/components/button';
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    ChartPanel,
    DataFreshness,
    EmptyState,
    ErrorState,
    LoadingSkeleton,
    MetricCard,
    PageHeader,
    ReadinessChecklist,
    StatusNotice,
    SalesChart,
    ZardButtonComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly session = inject(SessionService);
  private readonly analytics = inject(AnalyticsApi);
  private readonly onboarding = inject(OnboardingApi);
  private request?: Subscription;
  readonly overview = signal<Overview | null>(null);
  readonly trends = signal<Trends | null>(null);
  readonly summary = signal<Summary | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly money = decimalText;
  readonly isDemo = () => this.session.value()?.mode === 'DEMO';
  readonly authorized = () => this.isDemo() || this.session.value()?.authenticated === true;
  readonly period = signal('');
  readonly checklist = () =>
    this.isDemo()
      ? [
          { label: 'Review catalog', href: '/products' },
          { label: 'Explore analytics', href: '/analytics' },
          { label: 'Review data readiness', href: '/onboarding' },
          { label: 'Inspect pricing evidence', href: '/optimization' },
        ]
      : [
          {
            label: 'Connect Shopify',
            href: '/store-connection',
            complete: this.summary()?.synchronization.connected,
          },
          {
            label: 'Sync your data',
            href: '/store-connection',
            description: this.summary()?.synchronization.lastSuccessfulSync
              ? 'Import available; review coverage'
              : 'No completed import',
          },
          { label: 'Review products & costs', href: '/products' },
          { label: 'Review data readiness', href: '/onboarding' },
        ];
  private readonly health = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal<'loading' | 'connected' | 'unavailable'>('loading');
  constructor() {
    this.refresh();
    effect((onCleanup) => {
      onCleanup(() => this.request?.unsubscribe());
      if (this.authorized()) this.load();
      else {
        this.overview.set(null);
        this.trends.set(null);
        this.summary.set(null);
      }
    });
  }
  load() {
    if (!this.authorized()) return;
    this.request?.unsubscribe();
    const window = initialWindow(30, this.isDemo());
    this.period.set(this.isDemo() ? 'Full 2025' : 'Last 30 days · UTC');
    this.loading.set(true);
    this.error.set(false);
    const query = { ...window, granularity: 'MONTH', search: '', sort: 'NET_DESC' };
    this.request = forkJoin({
      overview: this.analytics.overview(query),
      trends: this.analytics.trends(query),
      summary: this.onboarding.summary(window.startDate, window.endDate),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (!this.authorized()) return;
          this.overview.set(data.overview);
          this.trends.set(data.trends);
          this.summary.set(data.summary);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
  refresh() {
    this.status.set('loading');
    this.health
      .check()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) =>
          this.status.set(response?.status === 'UP' ? 'connected' : 'unavailable'),
        error: () => this.status.set('unavailable'),
      });
  }
}
