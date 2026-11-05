import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
@Component({
  imports: [RouterLink],
  template: `<section>
    <p class="eyebrow">SHOPIFY AUTHORIZATION</p>
    <h1 class="page-title">Authorization outcome</h1>
    <p role="status">{{ message }}</p>
    <p>Connection status is verified by the server. Importing data requires a separate explicit action.</p>
    <a routerLink="/store-connection">Check store connection</a> ·
    <a routerLink="/login">Sign in</a>
  </section>`,
})
export class CallbackOutcome {
  readonly message: string;
  constructor() {
    const route = inject(ActivatedRoute),
      router = inject(Router);
    const value = route.snapshot.queryParamMap.get('outcome');
    const outcome = value === 'connected' || value === 'denied' ? value : 'failed';
    this.message =
      outcome === 'connected'
        ? 'Authorization returned. Check the verified connection status.'
        : outcome === 'denied'
          ? 'Authorization was denied. You can start a new attempt.'
          : 'Authorization could not be completed. Your session or authorization may have expired. Sign in and try again.';
    void router.navigateByUrl('/store-connection/callback?outcome=' + outcome, {
      replaceUrl: true,
    });
  }
}
