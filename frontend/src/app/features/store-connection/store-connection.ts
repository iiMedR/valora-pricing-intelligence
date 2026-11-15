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
import { SyncPanel, type SyncStatus } from './sync-panel';
import { IntegrationGuide } from './integration-guide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSettings2,
  lucideCircleAlert,
  lucidePlug,
  lucideShieldCheck,
  lucideCloudDownload,
  lucideLockKeyhole,
  lucideArrowRight,
  lucideCircleCheck,
  lucideLink2,
  lucideWarehouse,
  lucideRefreshCw,
} from '@ng-icons/lucide';
@Component({
  imports: [
    ZardButtonComponent,
    ZardInputComponent,
    ModalFocus,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    SyncPanel,
    IntegrationGuide,
    NgIcon,
  ],
  templateUrl: './store-connection.html',
  styleUrl: './store-connection.css',
  providers: [
    provideIcons({
      lucideSettings2,
      lucideCircleAlert,
      lucidePlug,
      lucideShieldCheck,
      lucideCloudDownload,
      lucideLockKeyhole,
      lucideArrowRight,
      lucideCircleCheck,
      lucideLink2,
      lucideWarehouse,
      lucideRefreshCw,
    }),
  ],
})
export class StoreConnection {
  private readonly api = inject(StoreApi);
  private readonly navigate = inject(SHOPIFY_NAVIGATE);
  readonly result = signal<StoreStatus | null>(null);
  readonly syncStatus = signal<SyncStatus | null>(null);
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
  importLabel() {
    const sync = this.syncStatus();
    if (!sync) return 'Status unavailable';
    if (sync.latest)
      return (
        (
          {
            PENDING: 'Queued',
            RUNNING: 'Importing',
            SUCCEEDED: 'Completed',
            PARTIAL: 'Partially imported',
            FAILED: 'Needs attention',
          } as Record<string, string>
        )[sync.latest.state] ?? 'Review import'
      );
    return sync.lastSuccessfulSync ? 'Previously imported' : 'Not imported yet';
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
