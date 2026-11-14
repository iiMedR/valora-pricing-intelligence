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
    <h1 class="page-title">What should I fix next?</h1>
    <p class="readiness-intro">
      Start with the highest-priority data issues below. Completing these inputs helps evaluation;
      it does not guarantee a price suggestion.
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
      <section class="readiness-card priority-card">
        <div class="priority-heading">
          <h2>Your next steps</h2>
          <span class="priority-label">In priority order</span>
        </div>
        @if (!s.checklist.length) {
          <p class="muted">
            No priority actions returned for this assessment. Review detailed checks before making a
            pricing decision.
          </p>
        }
        <ol class="priority-checklist">
          @for (check of allSteps() ? s.checklist : s.checklist.slice(0, 3); track check.code) {
            <li>
              <div class="check-copy">
                <h3>{{ checkTitle(check.code) }}</h3>
                <p>{{ checkDescription(check.code, check.message, s) }}</p>
              </div>
              <a
                z-button
                zType="outline"
                class="review-link"
                [routerLink]="check.href.split('?')[0].split('#')[0]"
                [fragment]="check.href.includes('#') ? check.href.split('#')[1] : undefined"
                [queryParams]="
                  check.href.includes('status=') ? { status: check.href.split('status=')[1] } : null
                "
                (click)="
                  checksOpen.set(true);
                  check.href.includes('status=') && applyStatus(check.href.split('status=')[1])
                "
                >Fix / review<span class="sr-only">: {{ checkTitle(check.code) }}</span></a
              >
            </li>
          }
        </ol>
        @if (s.checklist.length > 3) {
          <button z-button zType="outline" (click)="allSteps.set(!allSteps())">
            {{ allSteps() ? 'Show priority steps' : 'Show all next steps' }}
          </button>
        }
      </section>
      <div class="import-summary">
        <p class="muted">
          <strong>{{
            s.synthetic
              ? 'Synthetic demo: no live store connection'
              : s.synchronization.connected
                ? 'Shopify connected'
                : 'Shopify not connected'
          }}</strong>
          · Import:
          {{
            s.synchronization.latest ? label(s.synchronization.latest.state) : 'No import recorded'
          }}
        </p>
        <p class="muted">
          Last successful import through:
          {{
            s.synchronization.lastSuccessfulSync
              ? (s.synchronization.lastSuccessfulSync | date: 'yyyy-MM-dd HH:mm' : 'UTC') + ' UTC'
              : 'No completed import'
          }}
        </p>
      </div>
      <details
        class="merchant-details"
        [open]="checksOpen()"
        (toggle)="checksOpen.set($any($event.target).open)"
      >
        <summary>Detailed data checks</summary>
        <p class="muted">
          Imported records, usable analytics, supported forecasts and eligible price suggestions are
          different checks. Viewing this page never starts an import or changes a price.
        </p>
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
                {{ point.resource }}:
                {{ point.complete ? 'Complete' : 'Pending / checkpoint saved' }}
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
            Current input freshness is assessed now. Model diagnostics use
            {{ s.window.startDate }} to {{ s.window.endDate }} (exclusive), as of
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
            <label
              >Start date (UTC)<input z-input name="from" type="date" [(ngModel)]="from" /></label
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
          reconciliation. Review variant reasons and source records before making a pricing
          decision.
        </p>
      </details>
    }
  `,
  styles: [
    `
      .readiness-card {
        background: var(--card);
        border: 1px solid var(--border);
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
        font-size: 18px;
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
        border-bottom: 1px solid var(--border);
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
      .readiness-intro {
        max-width: 80ch;
        color: var(--muted-foreground);
        font-size: 14px;
      }
      .priority-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }
      .priority-heading h2 {
        margin: 0;
      }
      .priority-label {
        font-size: 12px;
        color: var(--warning-foreground);
        background: var(--warning-surface);
        border-radius: 999px;
        padding: 3px 9px;
      }
      .priority-checklist {
        list-style: none;
        counter-reset: priority;
        padding: 0;
        margin: 0;
      }
      .priority-checklist li {
        counter-increment: priority;
        display: grid;
        grid-template-columns: 32px minmax(0, 1fr) auto;
        align-items: start;
        gap: 14px;
        padding: 22px 0;
        margin: 0;
        border-bottom: 1px solid var(--border);
      }
      .priority-checklist li:last-child {
        border-bottom: 0;
      }
      .priority-checklist li::before {
        content: counter(priority);
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        margin-top: 2px;
        border: 1px solid var(--warning-border);
        border-radius: 8px;
        background: var(--warning-surface);
        color: var(--warning-foreground);
        font-size: 13px;
        font-weight: 600;
      }
      .check-copy h3 {
        font-size: 15px;
        margin: 0 0 5px;
      }
      .check-copy p {
        max-width: 80ch;
        margin: 0;
        color: var(--muted-foreground);
        line-height: 1.65;
      }
      .review-link {
        color: var(--interactive-foreground);
        text-decoration: none;
      }
      .import-summary {
        padding: 16px 20px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .import-summary p {
        margin: 0;
      }
      .import-summary p + p {
        margin-top: 6px;
      }
      @media (max-width: 600px) {
        .readiness-card {
          padding: 18px 12px;
        }
        .filters {
          display: grid;
        }
        .page-title {
          font-size: 26px;
        }
        .priority-checklist li {
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 10px;
        }
        .review-link {
          grid-column: 2;
          justify-self: start;
        }
        .import-summary {
          padding: 16px;
        }
      }
    `,
  ],
})
export class Onboarding {
  readonly allSteps = signal(false);
  readonly checksOpen = signal(!!inject(ActivatedRoute).snapshot.queryParamMap.get('status'));
  checkTitle(code: string) {
    return (
      (
        {
          CONNECT_STORE: 'Connect your Shopify store',
          IMPORT_OR_RESUME: 'Import or resume your store data',
          RECONCILE_LOCAL_EDITS: 'Review conflicting product edits',
          COMPLETE_COSTS: 'Add missing unit costs',
          REVIEW_INVENTORY: 'Review stock information',
          REVIEW_SALES_COVERAGE: 'Bring in completed sales',
          CHECK_VARIANT_DIAGNOSTICS: 'See why products do not have suggestions',
        } as Record<string, string>
      )[code] ?? 'Review this data issue'
    );
  }
  checkDescription(code: string, fallback: string, s: Summary) {
    const counts = s.counts;
    switch (code) {
      case 'CONNECT_STORE':
        return 'Authorize your store so its records can be imported. Connecting does not start an import.';
      case 'IMPORT_OR_RESUME':
        return 'Start an import, or resume the last one. Then review which records and dates were covered.';
      case 'RECONCILE_LOCAL_EDITS':
        return `${counts['local_conflicts'] ?? 'Some'} local edits conflict with imported records. Review them before resuming imports.`;
      case 'COMPLETE_COSTS':
        return `${counts['missing_cost'] ?? 'Some'} variants need a unit variable cost and its effective date. Cost cannot be inferred from the selling price.`;
      case 'REVIEW_INVENTORY': {
        const affected: string[] = [];
        if ((counts['stale_or_uncertain_stock'] ?? 0) > 0)
          affected.push(
            `${counts['stale_or_uncertain_stock']} variants have stale or uncertain stock information`,
          );
        if ((counts['unknown_stock'] ?? 0) > 0)
          affected.push(`${counts['unknown_stock']} have unknown stock information`);
        return `${affected.length ? affected.join('; ') : 'Review unknown or stale stock information'}. Review dated inventory records; a new snapshot cannot repair missing past availability.`;
      }
      case 'REVIEW_SALES_COVERAGE':
        return 'No completed sales were found in this period. Import or review your orders; missing history does not mean nobody wanted the product.';
      case 'CHECK_VARIANT_DIAGNOSTICS':
        return 'Review the sales history and price-response evidence for each product. Imported records alone do not make a price suggestion reliable.';
      default:
        return fallback;
    }
  }
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
  from = inject(ActivatedRoute).snapshot.queryParamMap.get('startDate') || '';
  to = inject(ActivatedRoute).snapshot.queryParamMap.get('endDate') || '';
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
