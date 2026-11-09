import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, Params } from '@angular/router';
import { Product } from '../models/catalog.models';
import { ProductThumbnail } from '../../../shared/merchant/product-thumbnail';
import { StatusPill } from '../../../shared/merchant/foundation';
@Component({
  selector: 'app-product-entry',
  imports: [RouterLink, ProductThumbnail, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
    class="product-entry"
    [class.list-entry]="view() === 'list'"
    [routerLink]="['/products', product().id]"
    [queryParams]="context()"
    ><app-product-thumbnail [name]="product().name" />
    <div class="entry-identity">
      <h2>{{ product().name }}</h2>
      <p>{{ category() }}</p>
    </div>
    <app-status-pill [label]="product().status === 'ACTIVE' ? 'Active' : 'Archived'" /><span
      class="entry-action"
      >View variants<span class="sr-only"> for {{ product().name }}</span></span
    ></a
  >`,
  styleUrl: './product-entry.css',
})
export class ProductEntry {
  readonly product = input.required<Product>();
  readonly category = input('Uncategorized');
  readonly context = input<Params>({});
  readonly view = input<'grid' | 'list'>('grid');
}
