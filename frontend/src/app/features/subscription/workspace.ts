import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, Observable, Subscription, timeout } from 'rxjs';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { Confirmation, ModalFocus } from '../../core/confirmation';
import { SessionService } from '../../core/session.service';
import { apiError } from '../catalog/services/catalog-api.service';
import {
  subscriptionQuery,
  subscriptionSelection,
  validSubscriptionDate,
  SubscriptionSelection,
} from './subscription-state';

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
    DatePipe,
    RouterLink,
    ZardButtonComponent,
    ZardInputComponent,
    ModalFocus,
  ],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionWorkspace {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly confirmation = inject(Confirmation);
  private readonly entryForm = viewChild<NgForm>('entryForm');
  private lastRequestKey = '';
  private appliedSelection: SubscriptionSelection | null = null;
  readonly appliedAsOf = signal('');
  readonly planId = signal<string | null>(null);
  readonly selectedPlan = computed(
    () => this.plans()?.content.find((plan) => plan.id === this.planId()) ?? null,
  );
  readonly session = inject(SessionService);
  readonly section = signal('');
  readonly metrics = signal<Metrics | null>(null);
  readonly plans = signal<Page<Plan> | null>(null);
  readonly subscribers = signal<Page<Subscriber> | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly entryFailure = signal(false);
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
        this.entry = this.blankEntry();
        this.entryForm()?.form.markAsPristine();
        this.message.set('');
      }
    });
    const initial = route.snapshot.routeConfig?.path;
    const params = new URLSearchParams();
    route.snapshot.queryParamMap.keys.forEach((key) =>
      params.set(key, route.snapshot.queryParamMap.get(key)!),
    );
    this.navigate(initial ? '/' + initial + (params.size ? '?' + params : '') : this.router.url);
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
    const state = subscriptionSelection(new URL(url, 'http://local').searchParams, this.today);
    this.appliedSelection = state;
    this.appliedAsOf.set(state.asOf);
    this.start = state.start;
    this.asOf = state.asOf;
    this.search = state.search;
    this.sort = state.sort;
    this.page = state.page;
    this.planId.set(['plans', 'insights'].includes(this.section()) ? state.planId : null);
    this.preview.set(null);
    this.why.set(null);
    const key = JSON.stringify([
      this.section(),
      state.start,
      state.asOf,
      state.search,
      state.sort,
      state.page,
    ]);
    if (key !== this.lastRequestKey) {
      this.lastRequestKey = key;
      this.message.set('');
      this.load();
    }
  }
  selection(): SubscriptionSelection {
    return {
      start: this.start,
      asOf: this.asOf,
      search: this.search,
      sort: this.sort,
      page: this.page,
      planId: this.planId(),
    };
  }
  contextQuery() {
    return subscriptionQuery({ ...(this.appliedSelection ?? this.selection()), planId: null });
  }
  selectionChanged() {
    const p = this.appliedSelection;
    return (
      !!p &&
      (this.asOf !== p.asOf ||
        this.start !== p.start ||
        this.search !== p.search ||
        this.sort !== p.sort)
    );
  }
  update() {
    if (
      !['', 'revenue'].includes(this.section()) &&
      validSubscriptionDate(this.asOf, this.today) &&
      (this.start > this.asOf || (Date.parse(this.asOf) - Date.parse(this.start)) / 86400000 >= 366)
    ) {
      this.start = subscriptionSelection(
        new URLSearchParams({ asOf: this.asOf }),
        this.today,
      ).start;
    }
    if (
      !validSubscriptionDate(this.asOf, this.today) ||
      !validSubscriptionDate(this.start, this.today) ||
      this.start > this.asOf ||
      (Date.parse(this.asOf) - Date.parse(this.start)) / 86400000 >= 366
    ) {
      this.error.set('Choose a UTC date window of at most 366 days, ending today or earlier.');
      return;
    }
    if (this.search.length > 80 || /[\u0000-\u001f@]/.test(this.search)) {
      this.error.set('Search by plan name or opaque subscription ID, without personal details.');
      return;
    }
    this.page = 0;
    this.planId.set(null);
    this.writeSelection();
  }
  clearSearch() {
    this.search = '';
    this.update();
  }
  private writeSelection(selection = this.selection()) {
    const path = '/saas' + (this.section() ? '/' + this.section() : '');
    const target = this.router.createUrlTree([path], {
      queryParams: subscriptionQuery(selection),
    });
    if (this.router.serializeUrl(target) === this.router.url) {
      this.load();
      return Promise.resolve(true);
    }
    return this.router.navigateByUrl(target);
  }
  review(plan: Plan) {
    this.planId.set(plan.id);
    void this.writeSelection({ ...this.appliedSelection!, planId: plan.id }).then(() =>
      setTimeout(() => document.getElementById('plan-detail')?.focus()),
    );
  }
  backToPlans() {
    const id = this.planId();
    this.planId.set(null);
    void this.writeSelection({ ...this.appliedSelection!, planId: null }).then(() =>
      setTimeout(() => document.getElementById('plan-open-' + id)?.focus()),
    );
  }
  canLeave(): boolean | Promise<boolean> {
    if (this.session.value()?.authenticated !== true) return true;
    if (this.busy()) {
      this.message.set('An entry request is still running. Wait for its result before leaving.');
      return false;
    }
    return this.entryForm()?.dirty
      ? this.confirmation.ask(
          'Discard unsaved entry?',
          'This draft has not been recorded. Stay to keep editing or discard it and leave.',
          'Discard and leave',
        )
      : true;
  }
  private blankEntry(): Entry {
    return {
      templateVersion: 1,
      sourceId: '',
      type: this.entry?.type ?? 'PLAN',
      planId: '',
      name: '',
      priceId: '',
      amount: '',
      currency: this.metrics()?.currency ?? '',
      interval: 'MONTHLY',
      effectiveDate: this.today,
      subscriptionId: '',
      chargeId: '',
    };
  }
  async clearEntry() {
    if (this.busy()) return;
    if (
      this.entryForm()?.dirty &&
      !(await this.confirmation.ask(
        'Clear this entry?',
        'The unrecorded draft will be cleared.',
        'Clear entry',
      ))
    )
      return;
    this.entry = this.blankEntry();
    this.preview.set(null);
    this.error.set('');
    this.message.set('Entry cleared.');
    this.entryForm()?.resetForm({
      type: this.entry.type,
      source: '',
      effective: this.today,
      plan: '',
      name: '',
      interval: 'MONTHLY',
      price: '',
      sub: '',
      amount: '',
      charge: '',
    });
  }
  load(reset = false) {
    this.entryFailure.set(false);
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
    const applied = this.appliedSelection ?? this.selection();
    const params = { asOf: applied.asOf, search: applied.search, page: applied.page, size: 10 };
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
              .get<Page<Plan>>('/api/v1/saas/plans', { params: { ...params, sort: applied.sort } })
              .pipe(map((plans) => ({ ...empty, plans })))
          : this.http
              .get<Metrics>('/api/v1/saas/metrics', {
                params: { start: applied.start, asOf: applied.asOf },
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
    this.entryFailure.set(true);
    if (this.busy()) return;
    if (this.entryForm()?.invalid) {
      this.entryForm()?.form.markAllAsTouched();
      this.error.set('Complete the required fields using the formats shown below.');
      return;
    }
    if (!this.metrics()?.currency) {
      this.error.set('Reload the workspace currency before checking an entry.');
      return;
    }
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
          this.entryFailure.set(false);
          this.busy.set(false);
          if (!this.session.value()?.authenticated) {
            this.preview.set(null);
            return;
          }
          if (commit) {
            this.entryForm()?.form.markAsPristine();
            this.preview.set(null);
            this.message.set(receipt.message);
            this.load();
          } else this.preview.set({ entry, receipt });
        },
        error: (e) => {
          this.busy.set(false);
          this.preview.set(null);
          this.entryFailure.set(true);
          this.error.set(apiError(e));
          setTimeout(() => document.getElementById('subscription-feedback')?.focus());
        },
      });
  }
  next(delta: number) {
    this.page = (this.appliedSelection?.page ?? this.page) + delta;
    this.planId.set(null);
    void this.writeSelection({ ...this.appliedSelection!, page: this.page, planId: null });
  }
  @HostListener('window:beforeunload', ['$event']) warnPending(event: BeforeUnloadEvent) {
    if (this.busy() || this.entryForm()?.dirty) {
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
            Math.max(
              Date.UTC(2000, 0, 1),
              Date.parse(this.appliedAsOf() + 'T00:00:00Z') - 29 * 86400000,
            ),
          )
            .toISOString()
            .slice(0, 10),
          asOf: this.appliedAsOf(),
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
    return plan.prices.filter((p) => p.effectiveDate <= this.appliedAsOf()).at(-1);
  }
  hasTrend(m: Metrics) {
    return m.trend.some((point) => Number(point.mrr) > 0);
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
  peak(m: Metrics) {
    return Math.max(0, ...m.trend.map((point) => Number(point.mrr)));
  }
  recordLabel(type: string) {
    return (
      (
        {
          PLAN: 'Plan / new price version',
          ARCHIVE: 'Archive plan',
          START: 'Subscription started',
          CHANGE: 'Subscription plan changed',
          CANCEL: 'Schedule effective cancellation',
          END: 'Subscription ended',
          REACTIVATE: 'Subscription reactivated',
          PAID: 'Paid charge',
          REFUND: 'Refund',
        } as Record<string, string>
      )[type] ?? type
    );
  }
}
