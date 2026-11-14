import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { SessionService, canReadWorkspace } from '../../core/session.service';
import { apiError } from '../../features/catalog/services/catalog-api.service';
import { formatMoney } from './foundation';

export interface GuidanceResult {
  version: string;
  businessMode: 'ECOMMERCE' | 'SAAS_SUBSCRIPTION';
  resourceId: string;
  currency: string;
  period: string;
  asOf: string;
  sourceEvidence: 'KNOWN_INPUT' | 'OBSERVED';
  assumptionEvidence: 'MERCHANT_ASSUMPTION';
  resultEvidence: 'CALCULATED_SCENARIO';
  facts: Record<string, string | null>;
  current: Record<string, string | null>;
  scenario: Record<string, string | null>;
  assumptions: Record<string, string>;
  missing: string[];
  exclusions: string[];
}
@Component({
  selector: 'app-pricing-guidance',
  imports: [ZardButtonComponent, ZardInputComponent, RouterLink],
  templateUrl: './pricing-guidance.html',
  styleUrl: './pricing-guidance.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingGuidance {
  readonly productId = input('');
  readonly variantId = input('');
  readonly planId = input('');
  readonly priceId = input('');
  readonly asOf = input('');
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  readonly result = signal<GuidanceResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly money = formatMoney;
  fields: Record<string, string> = {};
  confirmed = false;
  readonly commerceExtras = [
    ['assumedUnitCost', 'Unit cost override (assumed)'],
    ['extraUnitCost', 'Extra variable cost per unit (including shipping)'],
    ['taxPercent', 'Tax included in price (%)'],
    ['targetMarginPercent', 'Target contribution margin (%)'],
  ];
  readonly sharedExtras = [
    ['fixedCosts', 'Fixed costs for this period'],
    ['discountPercent', 'Discount (%)'],
    ['feePercent', 'Payment fee (% of discounted billings)'],
    ['refunds', 'Refunds of this period’s billings'],
  ];
  isSaas() {
    return !!this.planId();
  }
  isDemo() {
    return this.session.value()?.mode === 'DEMO';
  }
  private authorized() {
    const s = this.session.value();
    return canReadWorkspace(s);
  }
  constructor() {
    effect(() => {
      this.productId();
      this.variantId();
      this.planId();
      this.priceId();
      this.asOf();
      this.session.value();
      untracked(() => this.reset());
    });
    this.destroy.onDestroy(() => {
      clearTimeout(this.timer);
      this.request?.unsubscribe();
    });
  }
  reset() {
    clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.result.set(null);
    this.error.set('');
    this.loading.set(false);
    this.fields = this.isSaas() ? {} : { periodDays: '30' };
    this.confirmed = false;
    if (
      this.authorized() &&
      (this.isSaas() ? this.priceId() : this.productId() && this.variantId())
    )
      this.load(true);
  }
  changed(key: string, value: string) {
    this.fields[key] = value;
    this.schedule();
  }
  confirm(value: boolean) {
    this.confirmed = value;
    this.schedule();
  }
  private schedule() {
    clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.error.set('');
    const old = this.result();
    if (old) this.result.set({ ...old, current: {}, scenario: {} });
    this.loading.set(true);
    this.timer = setTimeout(() => this.load(), 300);
  }
  load(initial = false) {
    if (!this.authorized()) return;
    clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.error.set('');
    this.loading.set(true);
    const params: Record<string, string> = { costsConfirmed: String(this.confirmed) };
    for (const [key, value] of Object.entries(this.fields))
      if (value.trim() !== '') params[key] = value;
    const path = this.isSaas()
      ? `/api/v1/saas/plans/${encodeURIComponent(this.planId())}/guidance`
      : `/api/v1/guidance/products/${encodeURIComponent(this.productId())}/variants/${encodeURIComponent(this.variantId())}`;
    if (this.isSaas()) {
      params['priceId'] = this.priceId();
      params['asOf'] = this.asOf();
    }
    const id = this.isSaas() ? this.planId() : this.variantId();
    this.request = this.http
      .get<GuidanceResult>(path, { params })
      .pipe(timeout(15000), takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (!this.authorized()) {
            this.result.set(null);
            this.loading.set(false);
            return;
          }
          if (
            result.resourceId !== id ||
            result.businessMode !== (this.isSaas() ? 'SAAS_SUBSCRIPTION' : 'ECOMMERCE') ||
            result.sourceEvidence !== (this.isSaas() ? 'OBSERVED' : 'KNOWN_INPUT') ||
            result.resultEvidence !== 'CALCULATED_SCENARIO' ||
            result.assumptionEvidence !== 'MERCHANT_ASSUMPTION'
          ) {
            this.error.set('The guidance did not match this selection. Reload it to try again.');
            this.result.set(null);
          } else {
            this.result.set(result);
            if (initial && !this.fields['candidatePrice'])
              this.fields['candidatePrice'] = result.facts['price'] ?? '';
          }
          this.loading.set(false);
        },
        error: (error) => {
          const old = this.result();
          if (old) this.result.set({ ...old, current: {}, scenario: {} });
          this.error.set(apiError(error));
          this.loading.set(false);
        },
      });
  }
  amount(value: string | null | undefined) {
    return this.money(value ?? null, this.result()?.currency ?? '');
  }
  percent(value: string | null | undefined) {
    return value == null ? 'Unavailable' : value + '%';
  }
}
