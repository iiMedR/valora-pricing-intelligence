import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSearch,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideRefreshCw,
  lucideArrowUpRight,
} from '@ng-icons/lucide';
import { ZardButtonComponent } from '../../shared/components/button';
import { ZardInputComponent } from '../../shared/components/input';
import { ProductThumbnail } from '../../shared/merchant/product-thumbnail';
import { formatMoney } from '../../shared/merchant/foundation';
import { PerformanceCoverage } from './performance-coverage';
import { Performance, PerformancePage, decimalText } from './analytics-api.service';

@Component({
  selector: 'app-product-performance',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    ZardButtonComponent,
    ZardInputComponent,
    ProductThumbnail,
    PerformanceCoverage,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideRefreshCw,
      lucideArrowUpRight,
    }),
  ],
  templateUrl: './product-performance.html',
  styleUrl: './product-performance.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPerformance {
  readonly data = input.required<PerformancePage>();
  readonly filters = input.required<FormGroup>();
  readonly update = output<void>();
  readonly pageChange = output<number>();
  readonly inspect = output<Performance>();
  readonly exact = decimalText;
  readonly count = (value: number) => value.toLocaleString('en');
  readonly amount = (value: string | null) => {
    const currency = this.data().range.currencyCode;
    const formatted = formatMoney(value, currency);
    return formatted.endsWith(' ' + currency)
      ? formatted.slice(0, -currency.length - 1)
      : formatted;
  };
  readonly label = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ').toLowerCase();
}
