import { ZardInputComponent } from '@/shared/components/input';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionService, safeReturnUrl } from '../../core/session.service';
import { apiError } from '../catalog/services/catalog-api.service';
@Component({
  imports: [ZardButtonComponent, ZardInputComponent, ReactiveFormsModule],
  template: `
    <section class="editor">
      <p class="eyebrow">LOCAL ADMINISTRATOR</p>
      <h1 class="page-title">Sign in</h1>
      <p>
        Use the account provisioned by your local administrator. Demo browsing requires no account.
      </p>
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
        margin: 35px auto;
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
        if (v.authenticated || v.mode === 'DEMO')
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
