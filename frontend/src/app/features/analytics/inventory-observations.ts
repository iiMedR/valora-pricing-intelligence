import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@/shared/components/button';
import { Inventory } from './analytics-api.service';
@Component({
  selector: 'app-inventory-observations',
  imports: [DatePipe, DecimalPipe, RouterLink, ZardButtonComponent],
  templateUrl: './inventory-observations.html',
  styleUrl: './inventory-observations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryObservations {
  readonly stock = input.required<Inventory>();
  readonly page = input.required<number>();
  readonly pageChange = output<number>();
  label(value: string) {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());
  }
  stockLabel(value: string) {
    return value === 'KNOWN_STOCKOUT' ? 'Observed stockout' : this.label(value);
  }
}
