import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideChartNoAxesColumnIncreasing,
  lucideClipboardCheck,
  lucideArrowUpRight,
} from '@ng-icons/lucide';
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
export class Landing {}
