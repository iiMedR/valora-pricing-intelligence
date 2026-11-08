import { ReadinessChecklist } from '../../shared/merchant/primitives';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnboardingApi, Summary, Variants } from './onboarding-api';
import { SyncPanel } from '../store-connection/sync-panel';
import { apiError } from '../catalog/services/catalog-api.service';
@Component({
  imports: [
    ReadinessChecklist,
    ZardButtonComponent,
    ZardInputComponent,
    DatePipe,
    KeyValuePipe,
    FormsModule,
    RouterLink,
    SyncPanel,
  ],
  template: `
    <p class="eyebrow">STORE SETUP · READ-ONLY DIAGNOSTICS</p>
    <h1 class="page-title">Onboarding &amp; data readiness</h1>
    <p>Connect store → Sync data → Review coverage → Complete business inputs → Check readiness.</p>
    <p class="notice">
      Data imported, ready for analytics, forecast evaluable and eligible for optimization are
      different states. No assessment applies prices or starts an import.
    </p>
    @if (error()) {
      <p class="error" role="alert">
        {{ error() }} The last displayed assessment may be stale.
        <button z-button zType="outline" (click)="load()" [disabled]="busy()">
          Retry assessment
        </button>
      </p>
    }
    @if (busy()) {
      <p role="status">Assessing persisted records…</p>
    }
    @if (summary(); as s) {
      @if (s.synthetic) {
        <p class="notice">
          <strong>Synthetic demo · read-only.</strong> No real connection, import or merchant edit
          controls are available.
        </p>
      }
      @if (!s.synthetic) {
        <section class="readiness-card">
          <h2>Your setup path</h2>
          <app-readiness-checklist [items]="setupSteps(s)" />
        </section>
      }
      <section class="readiness-card">
        <h2>{{ label(s.workflowState) }}</h2>
        <p>{{ s.workflowExplanation }}</p>
        <p>
          Connection: {{ label(s.connectionStatus) }} · Latest import:
          {{ s.synchronization.latest?.state || 'None' }}
        </p>
        <p>
          Last completed import through (UTC):
          {{
            s.synchronization.lastSuccessfulSync
              ? (s.synchronization.lastSuccessfulSync | date: 'yyyy-MM-dd HH:mm' : 'UTC')
              : 'Unknown / no completed import'
          }}
        </p>
        <p class="muted">
          Assessed {{ s.window.assessedAt | date: 'yyyy-MM-dd HH:mm:ss' : 'UTC' }} UTC · scope
          {{ label(s.scope) }}.
        </p>
        @if (s.synchronization.latest; as job) {
          <p>Job attempts: {{ job.attempts }}. {{ job.errorCode || 'No recorded job error.' }}</p>
          @for (point of s.synchronization.checkpoints; track point.resource) {
            <p>
              {{ point.resource }}: {{ point.complete ? 'Complete' : 'Pending / checkpoint saved' }}
            </p>
          }
        }
        @if (!s.synthetic) {
          <div class="actions">
            <a routerLink="/store-connection">Connect / inspect store</a
            ><a routerLink="/settings">Business settings</a>
          </div>
        }
      </section>

      <section class="readiness-card">
        <h2>Prioritized checklist</h2>
        <ol>
          @for (check of s.checklist; track check.code) {
            <li>
              {{ check.message }}
              <a
                [routerLink]="check.href.split('?')[0].split('#')[0]"
                [queryParams]="
                  check.href.includes('status=') ? { status: check.href.split('status=')[1] } : null
                "
                (click)="
                  check.href.includes('status=') && applyStatus(check.href.split('status=')[1])
                "
                >Review</a
              >
            </li>
          }
        </ol>
      </section>
      <details class="readiness-card">
        <summary>Persisted coverage counts</summary>
        <dl class="counts">
          @for (entry of s.counts | keyvalue; track entry.key) {
            <div>
              <dt>{{ label(entry.key) }}</dt>
              <dd>{{ entry.value }}</dd>
            </div>
          }
        </dl>
        <p>
          Sale-day counts do not prove daily coverage. Unknown costs, deferred orders and
          unsupported refund components remain limitations.
        </p>
      </details>
      @if (!s.synthetic) {
        <details class="readiness-card">
          <summary>Explicit import and resume controls</summary>
          <app-sync-panel />
        </details>
      }
      <section class="readiness-card" id="variant-readiness">
        <h2>Variant readiness</h2>
        <p>
          Current input freshness is assessed now. Model diagnostics use {{ s.window.startDate }} to
          {{ s.window.endDate }} (exclusive), as of
          {{ s.window.modelAsOf | date: 'yyyy-MM-dd HH:mm' : 'UTC' }} UTC. A historical evaluation
          is not present-day eligibility.
        </p>
        <form class="filters" (ngSubmit)="apply()">
          <label
            >Search variants<input
              z-input
              name="search"
              [(ngModel)]="search"
              maxlength="100"
              type="search"
          /></label>
          <label
            >Review filter<select name="status" [(ngModel)]="status">
              @for (option of filters; track option) {
                <option [value]="option">{{ label(option) }}</option>
              }
            </select></label
          >
          <label>Start date (UTC)<input z-input name="from" type="date" [(ngModel)]="from" /></label
          ><label
            >End date, exclusive (UTC)<input z-input name="to" type="date" [(ngModel)]="to"
          /></label>
          <label
            >Rows per page<select name="size" [(ngModel)]="size">
              <option [ngValue]="5">5</option>
              <option [ngValue]="10">10</option>
            </select></label
          >
          <button z-button class="primary" [disabled]="busy()">Apply filters</button
          ><button z-button zType="outline" type="button" (click)="load()" [disabled]="busy()">
            Refresh assessment
          </button>
        </form>
        @if (variants(); as rows) {
          @if (rows.results.totalElements === 0) {
            <div class="empty">
              <h3>No variants in this view</h3>
              <p>Connect/import data or review the filter. Empty history is not zero demand.</p>
              @if (!s.synthetic) {
                <a routerLink="/products">Open catalog</a>
              }
            </div>
          } @else {
            <div
              class="table-scroll"
              tabindex="0"
              role="region"
              aria-label="Variant readiness table, scroll horizontally if needed"
            >
              <table>
                <thead>
                  <tr>
                    <th>Variant / source</th>
                    <th>Data imported</th>
                    <th>Ready for analytics</th>
                    <th>Forecast evaluable</th>
                    <th>Eligible for optimization</th>
                    <th>Next review</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rows.results.content; track row.variant.variantId) {
                    <tr>
                      <td>
                        <a
                          [routerLink]="['/onboarding/variants', row.variant.variantId]"
                          [queryParams]="{ startDate: from, endDate: to }"
                          >{{ row.variant.sku }}</a><br />{{ row.variant.productName }} ·
                        {{ row.inputs.mappingSource }}<br />{{ row.variant.status }}
                      </td>
                      <td>
                        {{
                          row.inputs.mappingSource === 'SHOPIFY'
                            ? 'Provider-mapped'
                            : row.inputs.mappingSource === 'DEMO'
                              ? 'Synthetic'
                              : 'Manual / unmapped'
                        }}<br />{{ row.coverage.lines }} completed lines
                      </td>
                      <td>{{ label(row.analytics.status) }}</td>
                      <td>{{ label(row.forecasting.status) }}<br />{{ row.forecastStatus }}</td>
                      <td>
                        {{
                          row.optimizationStatus === 'ACTIONABLE'
                            ? 'Existing gates pass'
                            : 'Abstains'
                        }}<br />{{ row.optimizationStatus }}
                      </td>
                      <td>
                        <a
                          [routerLink]="['/onboarding/variants', row.variant.variantId]"
                          [queryParams]="{ startDate: from, endDate: to }"
                          >Explain readiness</a
                        >
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <div class="actions pagination">
            <button z-button zType="outline" (click)="move(-1)" [disabled]="busy() || page === 0">
              Previous</button
            ><span>Page {{ page + 1 }} · {{ rows.results.totalElements }} matching variants</span
            ><button
              z-button
              zType="outline"
              (click)="move(1)"
              [disabled]="busy() || page + 1 >= rows.results.totalPages"
            >
              Next
            </button>
          </div>
        }
      </section>
      <p class="muted">
        Readiness never certifies causal elasticity, calibrated uncertainty or complete financial
        reconciliation. Review variant reasons and source records before making a pricing decision.
      </p>
    }
  `,
  styles: [
    `
      .readiness-card {
        background: white;
        border: 1px solid #d4dfd7;
        border-radius: 10px;
        padding: 24px;
        margin: 24px 0;
      }
      p,
      li,
      td,
      th,
      label,
      dt,
      dd {
        font-size: 13px;
        line-height: 1.8;
        overflow-wrap: anywhere;
      }
      li {
        margin-bottom: 14px;
      }
      h2 {
        font-size: 24px;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
      }
      .filters label {
        display: grid;
        gap: 6px;
        max-width: 100%;
      }
      input,
      select {
        max-width: 100%;
        box-sizing: border-box;
      }
      .table-scroll {
        overflow-x: auto;
        margin-top: 22px;
        max-width: 100%;
      }
      table {
        min-width: 800px;
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 14px;
        vertical-align: top;
        border-bottom: 1px solid #d4dfd7;
      }
      .counts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
      }
      dd {
        margin: 0;
        font-weight: 600;
      }
      .pagination {
        margin-top: 20px;
        flex-wrap: wrap;
      }
      summary {
        cursor: pointer;
        font-weight: 600;
      }
      @media (max-width: 600px) {
        .readiness-card {
          padding: 18px 12px;
        }
        .filters {
          display: grid;
        }
        .page-title {
          font-size: 32px;
        }
      }
    `,
  ],
})
export class Onboarding {
  setupSteps(s: Summary) {
    return [
      { label: 'Sign in', href: '/login', complete: true },
      {
        label: 'Connect Shopify',
        href: '/store-connection',
        complete: s.synchronization.connected,
      },
      {
        label: 'Sync data',
        href: '/store-connection',
        description: s.synchronization.lastSuccessfulSync
          ? 'Import available; review its coverage'
          : 'No completed import',
      },
      { label: 'Review products and costs', href: '/products' },
      { label: 'Inspect data readiness', href: '/onboarding' },
      { label: 'Explore insights', href: '/analytics' },
    ];
  }
  private readonly api = inject(OnboardingApi);
  private readonly destroy = inject(DestroyRef);
  readonly summary = signal<Summary | null>(null);
  readonly variants = signal<Variants | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly filters = [
    'ALL',
    'ACTIVE',
    'ARCHIVED',
    'MISSING_COST',
    'STALE_INVENTORY',
    'LOCAL_CONFLICT',
    'MISSING_PROVIDER_SKU',
  ];
  search = '';
  status = inject(ActivatedRoute).snapshot.queryParamMap.get('status') || 'ALL';
  from = '';
  to = '';
  size = 5;
  page = 0;
  constructor() {
    this.load();
  }
  label(value: string) {
    return value.replaceAll('_', ' ').toLowerCase();
  }
  apply() {
    this.page = 0;
    this.load();
  }
  applyStatus(value: string) {
    this.status = value;
    this.apply();
  }
  move(delta: number) {
    this.page += delta;
    this.load();
  }
  load() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    forkJoin({
      summary: this.api.summary(this.from, this.to),
      variants: this.api.variants(
        this.page,
        this.size,
        this.search,
        this.status,
        this.from,
        this.to,
      ),
    })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.summary.set(result.summary);
          this.variants.set(result.variants);
          this.from = result.summary.window.startDate;
          this.to = result.summary.window.endDate;
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }
}
