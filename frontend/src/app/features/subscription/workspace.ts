import { Component, DestroyRef, HostListener, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, Observable, Subscription, timeout } from 'rxjs';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { ModalFocus } from '../../core/confirmation';
import { SessionService } from '../../core/session.service';
import { apiError } from '../catalog/services/catalog-api.service';

export interface Price {
  id: string;
  amount: string;
  currency: string;
  interval: string;
  effectiveDate: string;
}
export interface Plan {
  id: string;
  name: string;
  archived: boolean;
  prices: Price[];
  activeSubscriptions: number;
  mrr: string;
}
export interface Subscriber {
  id: string;
  plan: string;
  interval: string;
  status: string;
  since: string;
  scheduledEnd: string | null;
  currency: string;
  mrr: string | null;
}
interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
}
export interface Metrics {
  start: string;
  asOf: string;
  currency: string;
  coverage: string;
  activePaidSubscriptions: number;
  mrr: string;
  arr: string;
  revenuePerPaidSubscription: string | null;
  collectedNetCash: string;
  beginningPaidSubscriptions: number;
  endedBeginningSubscriptions: number;
  subscriptionChurnPercent: string | null;
  grossRevenueChurnPercent: string | null;
  netRevenueChurnPercent: string | null;
  movement: Record<string, string>;
  trend: { date: string; mrr: string }[];
}
export interface Entry {
  templateVersion: number;
  sourceId: string;
  type: string;
  planId: string | null;
  name: string | null;
  priceId: string | null;
  amount: string | null;
  currency: string | null;
  interval: string | null;
  effectiveDate: string;
  subscriptionId: string | null;
  chargeId: string | null;
}
interface Receipt {
  status: string;
  sourceId: string;
  message: string;
}

@Component({
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    ZardButtonComponent,
    ZardInputComponent,
    ModalFocus,
  ],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class SubscriptionWorkspace {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly session = inject(SessionService);
  readonly section = signal('');
  readonly metrics = signal<Metrics | null>(null);
  readonly plans = signal<Page<Plan> | null>(null);
  readonly subscribers = signal<Page<Subscriber> | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly preview = signal<{ entry: Entry; receipt: Receipt } | null>(null);
  readonly why = signal<Plan | null>(null);
  readonly planTrend = signal<{
    planId: string;
    currency: string;
    trend: { date: string; activePaidSubscriptions: number; mrr: string }[];
  } | null>(null);
  readonly trendBusy = signal(false);
  readonly today = new Date().toISOString().slice(0, 10);
  start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  asOf = this.today;
  search = '';
  sort = 'name';
  page = 0;
  private request?: Subscription;
  private trendRequest?: Subscription;
  private entryTrigger: HTMLElement | null = null;
  entry: Entry = {
    templateVersion: 1,
    sourceId: '',
    type: 'PLAN',
    planId: '',
    name: '',
    priceId: '',
    amount: '',
    currency: 'MAD',
    interval: 'MONTHLY',
    effectiveDate: this.today,
    subscriptionId: '',
    chargeId: '',
  };
  readonly types = [
    'PLAN',
    'ARCHIVE',
    'START',
    'CHANGE',
    'CANCEL',
    'END',
    'REACTIVATE',
    'PAID',
    'REFUND',
  ];
  constructor() {
    const route = inject(ActivatedRoute);
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.navigate(event.urlAfterRedirects));
    effect(() => {
      const s = this.session.value();
      if (s && !s.authenticated) {
        this.request?.unsubscribe();
        this.trendRequest?.unsubscribe();
        this.planTrend.set(null);
        this.metrics.set(null);
        this.plans.set(null);
        this.subscribers.set(null);
        this.preview.set(null);
        this.why.set(null);
      }
    });
    this.navigate(
      route.snapshot.routeConfig?.path ? '/' + route.snapshot.routeConfig.path : this.router.url,
    );
    this.destroy.onDestroy(() => {
      this.request?.unsubscribe();
      this.trendRequest?.unsubscribe();
    });
    effect((cleanup) => {
      if (this.preview() || this.why()) {
        const old = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        cleanup(() => {
          document.body.style.overflow = old;
        });
      }
    });
  }
  navigate(url = this.router.url) {
    this.section.set(url.split('?')[0].split('/')[2] ?? '');
    this.page = 0;
    this.search = '';
    this.preview.set(null);
    this.why.set(null);
    this.load();
  }
  load(reset = false) {
    this.trendRequest?.unsubscribe();
    this.planTrend.set(null);
    this.trendBusy.set(false);
    if (reset) this.page = 0;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.metrics.set(null);
    this.plans.set(null);
    this.subscribers.set(null);
    this.why.set(null);
    const params = { asOf: this.asOf, search: this.search, page: this.page, size: 10 };
    const empty = {
      metrics: null as Metrics | null,
      plans: null as Page<Plan> | null,
      subscribers: null as Page<Subscriber> | null,
    };
    const task: Observable<typeof empty> =
      this.section() === 'subscriptions'
        ? this.http
            .get<Page<Subscriber>>('/api/v1/saas/subscriptions', { params })
            .pipe(map((subscribers) => ({ ...empty, subscribers })))
        : this.section() === 'plans' || this.section() === 'insights'
          ? this.http
              .get<Page<Plan>>('/api/v1/saas/plans', { params: { ...params, sort: this.sort } })
              .pipe(map((plans) => ({ ...empty, plans })))
          : this.http
              .get<Metrics>('/api/v1/saas/metrics', {
                params: { start: this.start, asOf: this.asOf },
              })
              .pipe(map((metrics) => ({ ...empty, metrics })));
    this.request = task.pipe(timeout(15000), takeUntilDestroyed(this.destroy)).subscribe({
      next: (result) => {
        if (result.metrics) {
          this.metrics.set(result.metrics);
          this.entry.currency = result.metrics.currency;
        }
        this.plans.set(result.plans);
        this.subscribers.set(result.subscribers);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiError(e));
        this.loading.set(false);
      },
    });
  }
  changeType() {
    const type = this.entry.type;
    this.entry = {
      ...this.entry,
      type,
      sourceId: '',
      planId: '',
      name: '',
      priceId: '',
      amount: '',
      subscriptionId: '',
      chargeId: '',
    };
    this.preview.set(null);
  }
  submit() {
    if (this.busy()) return;
    this.entryTrigger = document.activeElement as HTMLElement;
    const e = this.entry;
    const entry: Entry = {
      templateVersion: 1,
      sourceId: e.sourceId.trim(),
      type: e.type,
      effectiveDate: e.effectiveDate,
      planId: ['PLAN', 'ARCHIVE'].includes(e.type) ? (e.planId?.trim() ?? null) : null,
      name: e.type === 'PLAN' ? (e.name?.trim() ?? null) : null,
      priceId: ['PLAN', 'START', 'CHANGE', 'CANCEL', 'END', 'REACTIVATE'].includes(e.type)
        ? (e.priceId?.trim() ?? null)
        : null,
      amount: ['PLAN', 'PAID', 'REFUND'].includes(e.type) ? e.amount : null,
      currency: ['PLAN', 'PAID', 'REFUND'].includes(e.type) ? e.currency : null,
      interval: e.type === 'PLAN' ? e.interval : null,
      subscriptionId: ['PLAN', 'ARCHIVE'].includes(e.type)
        ? null
        : (e.subscriptionId?.trim() ?? null),
      chargeId: e.type === 'REFUND' ? (e.chargeId?.trim() ?? null) : null,
    };
    this.send(entry, false);
  }
  commit() {
    const p = this.preview();
    if (p && !this.busy()) this.send(p.entry, true);
  }
  closePreview() {
    if (this.busy()) return;
    this.preview.set(null);
    setTimeout(() => {
      if (this.entryTrigger?.isConnected) this.entryTrigger.focus();
    });
  }
  private send(entry: Entry, commit: boolean) {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http
      .post<Receipt>(`/api/v1/saas/entry/${commit ? 'commit' : 'preview'}`, entry)
      .pipe(timeout(15000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (receipt) => {
          this.busy.set(false);
          if (!this.session.value()?.authenticated) {
            this.preview.set(null);
            return;
          }
          if (commit) {
            this.preview.set(null);
            this.message.set(receipt.message);
            this.load();
          } else this.preview.set({ entry, receipt });
        },
        error: (e) => {
          this.busy.set(false);
          this.preview.set(null);
          this.error.set(apiError(e));
        },
      });
  }
  next(delta: number) {
    this.page += delta;
    this.load();
  }
  @HostListener('window:beforeunload', ['$event']) warnPending(event: BeforeUnloadEvent) {
    if (this.busy()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  history(plan: Plan) {
    this.trendRequest?.unsubscribe();
    this.trendBusy.set(true);
    this.planTrend.set(null);
    this.error.set('');
    this.trendRequest = this.http
      .get<{
        planId: string;
        currency: string;
        trend: { date: string; activePaidSubscriptions: number; mrr: string }[];
      }>(`/api/v1/saas/plans/${encodeURIComponent(plan.id)}/history`, {
        params: {
          start: new Date(
            Math.max(Date.UTC(2000, 0, 1), Date.parse(this.asOf + 'T00:00:00Z') - 29 * 86400000),
          )
            .toISOString()
            .slice(0, 10),
          asOf: this.asOf,
        },
      })
      .pipe(timeout(15000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (v) => {
          this.planTrend.set(v);
          this.trendBusy.set(false);
        },
        error: (e) => {
          this.error.set(apiError(e));
          this.trendBusy.set(false);
        },
      });
  }
  current(plan: Plan) {
    return plan.prices.filter((p) => p.effectiveDate <= this.asOf).at(-1);
  }
  hasTrend(m: Metrics) {
    return (
      Number(m.mrr) > 0 || Number(m.movement['beginning']) > 0 || Number(m.movement['newMrr']) > 0
    );
  }
  points(m: Metrics) {
    const max = Math.max(1, ...m.trend.map((p) => Number(p.mrr)));
    return m.trend
      .map(
        (p, i) =>
          `${40 + (i * 680) / Math.max(1, m.trend.length - 1)},${170 - (Number(p.mrr) * 140) / max}`,
      )
      .join(' ');
  }
  state(value: string) {
    return (
      (
        {
          ACTIVE_PAID: 'Active · paid evidence',
          NO_PAID_EVIDENCE: 'No paid evidence',
          ENDED: 'Ended',
        } as Record<string, string>
      )[value] ?? 'Not evaluated'
    );
  }
}
