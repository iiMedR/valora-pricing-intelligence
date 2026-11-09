import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalFocus } from './confirmation';
import { ZardButtonComponent } from '../shared/components/button';
import type { ApplicationEnvironment } from './environment-indicator';
@Component({
  selector: 'app-environment-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalFocus, ZardButtonComponent],
  template: `<dialog
    appModal
    class="explanation-dialog"
    aria-labelledby="workspace-mode-title"
    (modalCancelled)="closed.emit()"
  >
    <div class="section-heading">
      <h2 id="workspace-mode-title">Your workspace</h2>
      <button z-button zType="outline" autofocus (click)="closed.emit()">Close</button>
    </div>
    @if (environment().synthetic) {
      <p>
        <strong>Synthetic Demo Data</strong> · Anonymous, read-only browsing. Generated records, not
        real business sales.
      </p>
      <p>Historical sample sales: 1 January–31 December 2025.</p>
      <p>
        {{ environment().datasetVersion }} ·
        {{
          environment().datasetState === 'READY' ? 'Dataset initialized' : 'Dataset not initialized'
        }}
      </p>
      <a href="http://localhost:4200">Open normal workspace</a>
    } @else {
      <p>Your business records. Looking for seeded examples?</p>
      <a href="http://localhost:4201/products">Open the read-only synthetic demo</a>
    }
  </dialog>`,
})
export class EnvironmentDetails {
  readonly environment = input.required<ApplicationEnvironment>();
  readonly closed = output<void>();
}
