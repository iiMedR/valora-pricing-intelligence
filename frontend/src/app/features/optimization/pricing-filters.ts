import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
@Component({
  selector: 'app-pricing-filters',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, ZardButtonComponent, ZardInputComponent],
  templateUrl: './pricing-filters.html',
  styleUrl: './pricing-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingFilters {
  readonly filters = input.required<FormGroup>();
  readonly isDemo = input(false);
  readonly update = output<void>();
  readonly clear = output<void>();
  readonly demoPeriod = output<void>();
}
