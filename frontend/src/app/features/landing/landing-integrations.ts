import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowUpRight,
  lucidePackage,
  lucideReceiptText,
  lucideWarehouse,
  lucideShieldCheck,
} from '@ng-icons/lucide';
import { LandingPreview } from './landing-preview';
@Component({
  selector: 'app-landing-integrations',
  imports: [RouterLink, NgIcon, LandingPreview],
  templateUrl: './landing-integrations.html',
  styleUrl: './landing-integrations.css',
  viewProviders: [
    provideIcons({
      lucideArrowUpRight,
      lucidePackage,
      lucideReceiptText,
      lucideWarehouse,
      lucideShieldCheck,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingIntegrations {}
