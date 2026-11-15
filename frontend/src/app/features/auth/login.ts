import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandMark } from '../../shared/merchant/brand-mark';
import { finalize } from 'rxjs';
import { SessionService, safeReturnUrl } from '../../core/session.service';
import { apiError } from '../catalog/services/catalog-api.service';
@Component({
  imports: [ZardButtonComponent, ZardInputComponent, ReactiveFormsModule, RouterLink, BrandMark],
  template: `
    <section class="editor">
      <a class="login-brand" routerLink="/" aria-label="Valora home"
        ><app-brand-mark size="large"
      /></a>
      <h1 class="page-title">Sign in</h1>
      <p>Sign in to explore the protected workspace.</p>
      @if (demoAccount(); as account) {
        <aside class="demo-access" aria-labelledby="demo-access-title">
          <div class="demo-heading">
            <h2 id="demo-access-title">Explore the demo</h2>
            <span class="demo-badge">Read-only</span>
          </div>
          <dl>
            <div>
              <dt>Account name</dt>
              <dd>
                <code>{{ account.username }}</code>
              </dd>
            </div>
            <div>
              <dt>Password</dt>
              <dd>
                <code>{{ account.password }}</code>
              </dd>
            </div>
          </dl>
          <button z-button zType="outline" class="demo-fill" type="button" (click)="fillDemo()">
            Use demo credentials
          </button>
        </aside>
      } @else {
        <p class="muted">
          Use the account provisioned for this installation. Public demo credentials are shown only
          in the isolated portfolio demo.
        </p>
      }
      @if (expired) {
        <p class="notice" role="status">
          Your session expired. Sign in again to return to your page. No request was automatically
          retried.
        </p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <form [formGroup]="form" (ngSubmit)="login()">
        <label
          >Account name<input
            z-input
            formControlName="username"
            autocomplete="username"
            maxlength="64"
            required /></label
        ><label
          >Password<input
            z-input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            maxlength="72"
            required /></label
        ><button z-button class="primary" [disabled]="busy() || form.invalid">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="muted">Your password is not saved in browser storage.</p>
    </section>
  `,
  styles: [
    `
      .editor {
        max-width: 480px;
        width: calc(100% - 32px);
        margin: 40px auto;
      }
      .login-brand {
        display: inline-flex;
        margin-bottom: 24px;
      }
      .demo-access {
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--muted);
        margin-top: 24px;
      }
      .demo-access h2 {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
      }
      .demo-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .demo-badge {
        font-size: 11px;
        color: var(--muted-foreground);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 3px 7px;
        white-space: nowrap;
      }
      .demo-access dl {
        display: grid;
        gap: 0;
        margin: 16px 0;
        padding: 0 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--background);
      }
      .demo-access dl div {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: 6px 12px;
        padding: 11px 0;
      }
      .demo-access dl div + div {
        border-top: 1px solid var(--border);
      }
      .demo-access dt {
        margin: 0;
        font-size: 13px;
        color: var(--muted-foreground);
      }
      .demo-access dd {
        font-size: 13px;
        margin: 0;
      }
      .demo-fill {
        width: 100%;
      }
      form,
      label {
        display: grid;
        gap: 10px;
      }
      form {
        gap: 22px;
        margin: 26px 0;
      }
      label {
        font-size: 13px;
      }
    `,
  ],
})
export class Login {
  demoAccount() {
    const value = this.session.value();
    return value?.mode === 'DEMO' && value.readOnly && value.loginRequired
      ? value.demoAccount
      : null;
  }
  fillDemo() {
    const account = this.demoAccount();
    if (account) this.form.setValue({ username: account.username, password: account.password });
  }
  readonly expired =
    inject(ActivatedRoute).snapshot.queryParamMap.get('reason') === 'session-expired';
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  constructor() {
    this.session.ensure().subscribe({
      next: (v) => {
        if (v.authenticated || (v.mode === 'DEMO' && !v.loginRequired))
          void this.router.navigateByUrl(this.destination());
      },
      error: () =>
        this.error.set('Session service unavailable. Check the backend connection and try again.'),
    });
  }
  private destination() {
    return safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  }
  login() {
    if (this.form.invalid || this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    const value = this.form.getRawValue();
    this.session
      .login(value.username, value.password)
      .pipe(
        finalize(() => {
          this.busy.set(false);
          this.form.controls.password.setValue('');
        }),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(this.destination()),
        error: (e) => this.error.set(apiError(e)),
      });
  }
}
