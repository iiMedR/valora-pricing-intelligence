import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideTriangleAlert } from '@ng-icons/lucide';
/** A labeled, frozen historical portfolio illustration, not a live recommendation. */
@Component({
  selector: 'app-landing-preview',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideArrowRight, lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-preview.html',
  styleUrl: './landing-preview.css',
})
export class LandingPreview {}
