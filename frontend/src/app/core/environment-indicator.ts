import { EnvironmentDetails } from './environment-details';
import { Component, inject, signal, output } from '@angular/core';
import { EnvironmentService } from './environment.service';

@Component({
  selector: 'app-environment-indicator',
  imports: [EnvironmentDetails],
  template: `
    @if (environment(); as mode) {
      <button
        type="button"
        class="workspace-mode-toggle"
        aria-haspopup="dialog"
        (click)="detailsOpen.set(true)"
      >
        {{
          mode.synthetic
            ? 'Demo · Read-only'
            : mode.businessMode === 'SAAS_SUBSCRIPTION'
              ? 'SaaS workspace'
              : 'Normal workspace'
        }}
      </button>
      @if (detailsOpen()) {
        @defer {
          <app-environment-details [environment]="mode" (closed)="detailsOpen.set(false)" />
        } @placeholder {
          <span role="status">Opening workspace details…</span>
        } @error {
          <span role="alert">Workspace details could not load. Reload this page to try again.</span>
        }
      }
    }
    @if (error()) {
      <div class="environment-warning" role="alert">
        Environment unverified. Check the backend connection before interpreting records.
        <button class="workspace-mode-toggle" type="button" (click)="load()" [disabled]="loading()">
          Retry environment
        </button>
      </div>
    } @else if (loading() && !environment()) {
      <p class="environment-check" role="status">Checking application environment…</p>
    }
  `,
})
export class EnvironmentIndicator {
  readonly businessMode = output<string>();
  readonly detailsOpen = signal(false);
  private readonly workspace = inject(EnvironmentService);
  readonly environment = this.workspace.value;
  readonly loading = this.workspace.loading;
  readonly error = this.workspace.error;
  constructor() {
    this.load();
  }
  load() {
    this.workspace.load((value) => this.businessMode.emit(value.businessMode ?? 'ECOMMERCE'));
  }
}
