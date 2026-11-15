import { ZardButtonComponent } from '@/shared/components/button';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnboardingApi, Detail } from './onboarding-api';
import { apiError } from '../catalog/services/catalog-api.service';
@Component({
  imports: [ZardButtonComponent, DatePipe, KeyValuePipe, RouterLink],
  template: `<a routerLink="/onboarding">← Onboarding</a>
    <p class="eyebrow top-space">VARIANT EVIDENCE</p>
    <h1 class="page-title">Readiness detail</h1>
    @if (error()) {
      <p role="alert" class="error">
        {{ error() }}
        <button z-button zType="outline" (click)="load()">Retry variant assessment</button>
      </p>
    }
    @if (busy()) {
      <p role="status">Checking variant evidence…</p>
    }
    @if (result(); as data) {
      @let row = data.assessment;
      <h2>{{ row.variant.productName }} · {{ row.variant.sku }}</h2>
      <p>
        {{ row.inputs.mappingSource }} · {{ row.variant.status }} · {{ data.window.currencyCode }}
      </p>
      @if (data.synthetic) {
        <p class="notice">
          Synthetic demo · read-only. Historical diagnostics do not authorize a real-store action.
        </p>
      }
      <p>
        Current inputs assessed
        {{ data.window.assessedAt | date: 'yyyy-MM-dd HH:mm:ss' : 'UTC' }} UTC. Model window
        {{ data.window.startDate }} → {{ data.window.endDate }} exclusive; as of
        {{ data.window.modelAsOf | date: 'yyyy-MM-dd HH:mm' : 'UTC' }} UTC.
      </p>
      <section class="readiness-card">
        <h2>Separate readiness decisions</h2>
        <p>Ready for analytics: {{ row.analytics.status }}: {{ row.analytics.message }}</p>
        <p>Forecast evaluable: {{ row.forecasting.status }} · {{ row.forecastStatus }}</p>
        <p>
          Eligible for optimization:
          {{ row.optimizationStatus === 'ACTIONABLE' ? 'Existing gates pass' : 'Abstains' }} ·
          {{ row.optimizationStatus }}
        </p>
        <p>
          No price is applied. Observational association is not causal elasticity; no calibrated
          uncertainty interval is claimed.
        </p>
      </section>
      <section class="readiness-card">
        <h2>Business inputs and provenance</h2>
        <p>
          Current quote: {{ row.inputs.currentPrice ?? 'Unknown' }} · Variable unit cost:
          {{ row.inputs.currentCost ?? 'Unknown' }} · Bounds:
          {{ row.inputs.minimum ?? 'Unknown' }} – {{ row.inputs.maximum ?? 'Unknown' }}
        </p>
        <p>
          Cost source: {{ row.inputs.costSource || 'Unknown / catalog only' }} · Recorded:
          {{
            row.inputs.costRecordedAt
              ? (row.inputs.costRecordedAt | date: 'yyyy-MM-dd HH:mm' : 'UTC')
              : 'Unknown'
          }}
          UTC.
        </p>
        <p>
          Stock: {{ row.inputs.stock ?? 'Unknown' }} · Observed:
          {{
            row.inputs.stockObservedAt
              ? (row.inputs.stockObservedAt | date: 'yyyy-MM-dd HH:mm' : 'UTC')
              : 'Unknown'
          }}
          UTC. Source SKU: {{ row.inputs.providerSku || 'Missing / not provider-mapped' }}.
        </p>
        @if (!data.synthetic) {
          <p>
            Use the existing catalog form for current costs/constraints and the validated history
            form for dated authoritative observations. Current edits never rewrite sale snapshots.
            Edits to provider-mapped variants are retained and cause later imports to stop with
            LOCAL_EDIT_CONFLICT until operator reconciliation.
          </p>
          <div class="actions">
            <a [routerLink]="row.catalogHref">Complete catalog inputs</a
            ><a [routerLink]="row.historyHref">Review / record dated evidence</a>
          </div>
        } @else {
          <a [routerLink]="row.catalogHref">Inspect read-only product</a>
        }
      </section>
      <section class="readiness-card">
        <h2>Coverage</h2>
        <p>
          {{ row.coverage.orders }} completed orders · {{ row.coverage.lines }} lines ·
          {{ row.coverage.knownCostLines }} known-cost lines ·
          {{ row.coverage.merchandiseRefunds }} merchandise refund events.
        </p>
        <p>
          Observed sale days: {{ row.coverage.salesDays }}. First/last:
          {{ row.coverage.firstSale || 'Unknown' }} / {{ row.coverage.lastSale || 'Unknown' }}.
          Missing days are not proven zero demand.
        </p>
        <p>
          Model days: {{ row.demandDiagnostics.days }} · eligible:
          {{ row.demandDiagnostics.eligibleDays }} · unknown inventory:
          {{ row.demandDiagnostics.unknownDays }} · censored:
          {{ row.demandDiagnostics.censoredDays }} · distinct eligible prices:
          {{ row.demandDiagnostics.distinctPrices }}.
        </p>
      </section>
      <section class="readiness-card">
        <h2>What is present or missing</h2>
        <dl>
          @for (entry of row.dimensions | keyvalue; track entry.key) {
            <dt>{{ label(entry.key) }} · {{ entry.value.status }}</dt>
            <dd>
              <strong>{{ entry.value.code }}</strong><br />{{ entry.value.message
              }}<br />Provenance:
              {{ entry.value.provenance || 'Unknown' }}
            </dd>
          }
        </dl>
      </section>
      <section class="readiness-card">
        <h2>Unchanged model reasons</h2>
        <h3>Forecast</h3>
        <ul>
          @for (reason of row.forecastReasons; track reason) {
            <li>{{ label(reason) }}</li>
          }
        </ul>
        <h3>Demand diagnostics</h3>
        <ul>
          @for (reason of row.demandDiagnostics.reasons; track reason) {
            <li>{{ label(reason) }}</li>
          }
        </ul>
        <h3>Optimization</h3>
        <ul>
          @for (reason of row.optimizationReasons; track reason) {
            <li>{{ label(reason) }}</li>
          } @empty {
            <li>
              No existing optimizer blocker for this selected window. This is not a future
              performance guarantee.
            </li>
          }
        </ul>
      </section>
      <button z-button zType="outline" (click)="load()" [disabled]="busy()">
        Refresh variant assessment
      </button>
    }`,
  styles: [
    `
      .readiness-card {
        background: white;
        padding: 24px;
        margin: 24px 0;
        border: 1px solid #d4dfd7;
        border-radius: 10px;
      }
      p,
      li,
      dt,
      dd {
        font-size: 13px;
        line-height: 1.8;
        overflow-wrap: anywhere;
      }
      dt {
        font-weight: 600;
        margin-top: 20px;
      }
      dd {
        margin: 4px 0 20px;
      }
      h2 {
        font-size: 24px;
      }
      .actions {
        flex-wrap: wrap;
      }
      @media (max-width: 600px) {
        .readiness-card {
          padding: 18px 12px;
        }
        .page-title {
          font-size: 34px;
        }
      }
    `,
  ],
})
export class VariantReadiness {
  private readonly api = inject(OnboardingApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly result = signal<Detail | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  constructor() {
    this.load();
  }
  label(value: string) {
    return value.replaceAll('_', ' ').toLowerCase();
  }
  load() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .detail(
        this.route.snapshot.paramMap.get('id')!,
        this.route.snapshot.queryParamMap.get('startDate') || '',
        this.route.snapshot.queryParamMap.get('endDate') || '',
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (data) => this.result.set(data),
        error: (e) => this.error.set(apiError(e)),
      });
  }
}
