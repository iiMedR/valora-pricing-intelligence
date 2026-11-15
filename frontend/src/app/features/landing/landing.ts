import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideChartNoAxesColumnIncreasing,
  lucideClipboardCheck,
  lucideArrowUpRight,
} from '@ng-icons/lucide';
import { EnvironmentService } from '../../core/environment.service';
import { BrandMark } from '../../shared/merchant/brand-mark';
import { LandingIntegrations } from './landing-integrations';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, NgIcon, BrandMark, LandingIntegrations],
  viewProviders: [
    provideIcons({
      lucideArrowLeftRight,
      lucideChartNoAxesColumnIncreasing,
      lucideClipboardCheck,
      lucideArrowUpRight,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private readonly environment = inject(EnvironmentService);
  // The portfolio runs as a separate local installation outside a verified demo workspace.
  readonly demoHref = computed(() =>
    this.environment.value()?.mode === 'DEMO' ? '/login' : 'http://localhost:4207/login',
  );
  readonly signInHref = () => '/login';
  constructor() {
    this.environment.load();
  }
}
