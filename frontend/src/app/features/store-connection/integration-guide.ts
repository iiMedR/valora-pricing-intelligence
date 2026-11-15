import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideArrowUpRight, lucideShieldCheck } from '@ng-icons/lucide';
@Component({
  selector: 'app-integration-guide',
  imports: [RouterLink, NgIcon],
  templateUrl: './integration-guide.html',
  styleUrl: './integration-guide.css',
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucideArrowUpRight,
      lucideShieldCheck,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationGuide {
  readonly connected = input(false);
  readonly imported = input(false);
  readonly demo = input(false);
}
