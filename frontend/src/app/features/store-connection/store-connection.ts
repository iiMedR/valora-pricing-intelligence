import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { ModalFocus } from '../../core/confirmation';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  StoreApi,
  StoreStatus,
  SHOPIFY_NAVIGATE,
  validAuthorizationUrl,
} from './store-api.service';
import { apiError } from '../catalog/services/catalog-api.service';
import { SyncPanel } from './sync-panel';
@Component({
  imports: [
    ZardButtonComponent,
    ZardInputComponent,
    ModalFocus,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    SyncPanel,
  ],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">SETTINGS · SINGLE BUSINESS</p>
        <h1 class="page-title">Store Connection</h1>
        <p class="muted">Authorize Shopify access, then explicitly import store data.</p>
      </div>
      <a routerLink="/settings">Business settings</a>
    </div>
    @if (error()) {
      <div class="error" role="alert">
        {{ error() }}
        <button z-button zType="outline" (click)="load()" [disabled]="busy()">Retry status</button>
      </div>
    }
    @if (loading()) {
      <p role="status">Checking store connection…</p>
    } @else if (result(); as store) {
      <section class="connection-card">
        <h2>
          {{
            store.status === 'CONNECTED'
              ? 'Connected to Shopify'
              : store.status === 'DEMO_DISABLED'
                ? 'Synthetic demo — connections disabled'
                : 'Connection status: ' + label(store.status)
          }}
        </h2>
        @if (store.status === 'DEMO_DISABLED') {
          <p>
            This workspace contains synthetic data and permits read-only browsing. Real Shopify
            connections and credentials are disabled.
          </p>
        } @else {
          @if (!store.configured) {
            <p class="notice">
              Server configuration is required before Shopify authorization. Authorization remains
              disabled until configuration is complete.
            </p>
          }
          @if (store.status === 'CONNECTED') {
            <p class="notice">
              Connected authorization is separate from import completion. Check synchronization
              below.
            </p>
            <p>Authorization is not a claim that catalog, inventory, orders or costs are ready.</p>
          }
          @if (store.status === 'PENDING') {
            <p>
              Authorization pending. Complete Shopify approval in this browser, or start a new
              attempt.
            </p>
          }
          @if (store.status === 'REAUTHORIZATION_REQUIRED') {
            <p>
              Access has expired. Import jobs attempt server-side refresh; if renewal fails,
              disconnect and authorize again.
            </p>
          }
          @if (store.shop) {
            <dl>
              <dt>Canonical shop</dt>
              <dd>{{ store.shop }}</dd>
              <dt>Granted scopes</dt>
              <dd>{{ store.scopes.join(', ') || 'Not granted' }}</dd>
              <dt>Connected (UTC)</dt>
              <dd>
                {{
                  store.connectedAt
                    ? (store.connectedAt | date: 'yyyy-MM-dd HH:mm' : 'UTC')
                    : 'Not connected'
                }}
              </dd>
              <dt>Access expires (UTC)</dt>
              <dd>
                {{
                  store.accessExpiresAt
                    ? (store.accessExpiresAt | date: 'yyyy-MM-dd HH:mm' : 'UTC')
                    : 'Unavailable'
                }}
              </dd>
            </dl>
          }
          @if (store.lastError) {
            <p role="status">{{ errorLabel(store.lastError) }}</p>
          }
          @if (store.status !== 'CONNECTED' && store.status !== 'REAUTHORIZATION_REQUIRED') {
            <form (ngSubmit)="connect()">
              <label
                >Shopify shop domain<input
                  z-input
                  [formControl]="shop"
                  placeholder="your-store.myshopify.com"
                  autocomplete="off"
                  maxlength="80"
                  required
              /></label>
              <p class="muted">
                Use the canonical myshopify.com domain, without https://, paths or ports.
              </p>
              <button
                z-button
                class="primary"
                [disabled]="busy() || shop.invalid || !store.configured"
              >
                {{ busy() ? 'Working…' : 'Connect to Shopify' }}
              </button>
            </form>
          }
          @if (store.shop) {
            <button
              z-button
              zType="outline"
              class="disconnect"
              (click)="confirming.set(true)"
              [disabled]="busy()"
            >
              Disconnect Shopify
            </button>
          }
          <button z-button zType="outline" (click)="load()" [disabled]="busy()">
            Refresh status
          </button>
        }
      </section>
    }
    <app-sync-panel />
    @if (confirming() && result()?.status !== 'DEMO_DISABLED') {
      <dialog
        appModal
        (modalCancelled)="confirming.set(false)"
        class="confirmation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disconnect-title"
      >
        <h2 id="disconnect-title">Disconnect Shopify?</h2>
        <p>
          This removes local provider credentials and requests app uninstall from Shopify. Existing
          catalog and historical records remain here. If remote revocation fails, remove the app in
          Shopify admin.
        </p>
        <div class="actions">
          <button z-button zType="outline" (click)="disconnect()" [disabled]="busy()">
            Confirm disconnect</button
          ><button
            z-button
            zType="outline"
            autofocus
            (click)="confirming.set(false)"
            [disabled]="busy()"
          >
            Cancel
          </button>
        </div>
      </dialog>
    }
  `,
  styles: [
    `
      .connection-card {
        background: white;
        border: 1px solid #d4dfd7;
        border-radius: 10px;
        padding: 26px;
        margin: 24px 0;
        max-width: 760px;
      }
      .connection-card h2 {
        font-size: 22px;
      }
      .notice {
        padding: 16px;
        background: #fff1c7;
        border-radius: 6px;
      }
      p,
      dd {
        font-size: 13px;
        line-height: 1.8;
        overflow-wrap: anywhere;
      }
      label {
        display: grid;
        gap: 10px;
        font-size: 13px;
      }
      form {
        margin: 24px 0;
      }
      dd {
        margin: 4px 0 16px;
      }
      dt {
        font-size: 12px;
        font-weight: 600;
      }
      .disconnect {
        margin: 16px 12px 16px 0;
      }
      .confirmation {
        border: 2px solid #a06933;
      }
      .actions {
        flex-wrap: wrap;
      }
      @media (max-width: 600px) {
        .connection-card,
        .confirmation {
          padding: 18px 12px;
        }
        .page-title {
          font-size: 34px;
        }
      }
    `,
  ],
})
export class StoreConnection {
  private readonly api = inject(StoreApi);
  private readonly navigate = inject(SHOPIFY_NAVIGATE);
  readonly result = signal<StoreStatus | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly confirming = signal(false);
  readonly shop = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.myshopify\.com$/),
    ],
  });
  constructor() {
    this.load();
  }
  label(value: string) {
    return value.replaceAll('_', ' ').toLowerCase();
  }
  errorLabel(value: string) {
    return (
      (
        {
          AUTHORIZATION_DENIED: 'Shopify authorization was denied. No access token was retained.',
          TOKEN_EXCHANGE_FAILED: 'Authorization could not be completed. Start a new attempt.',
          REMOTE_REVOCATION_UNCONFIRMED:
            'Local credentials were removed. Remote uninstall was not confirmed; remove the app in Shopify admin.',
        } as Record<string, string>
      )[value] ?? 'Connection needs attention. Start a new authorization attempt.'
    );
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .status()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.result.set(r),
        error: (e) => {
          this.result.set(null);
          this.error.set(apiError(e));
        },
      });
  }
  connect() {
    if (
      this.shop.invalid ||
      this.busy() ||
      !this.result()?.configured ||
      this.result()?.status === 'DEMO_DISABLED'
    )
      return;
    const shop = this.shop.value.trim().toLowerCase();
    this.busy.set(true);
    this.error.set('');
    this.api
      .connect(shop)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) => {
          if (validAuthorizationUrl(r.authorizationUrl, shop)) this.navigate(r.authorizationUrl);
          else this.error.set('Authorization destination could not be verified.');
        },
        error: (e) => this.error.set(apiError(e)),
      });
  }
  disconnect() {
    if (!this.confirming() || this.result()?.status === 'DEMO_DISABLED') return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .disconnect()
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.confirming.set(false);
        }),
      )
      .subscribe({ next: (r) => this.result.set(r), error: (e) => this.error.set(apiError(e)) });
  }
}
