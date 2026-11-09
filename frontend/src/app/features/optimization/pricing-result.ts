import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, Params } from '@angular/router';
import { Evaluation } from './optimization-api.service';
import { ProductThumbnail } from '../../shared/merchant/product-thumbnail';
import { StatusPill, formatMoney } from '../../shared/merchant/foundation';
import {
  pricingLabel,
  pricingReason,
  actionable,
} from '../../shared/merchant/pricing-presentation';
import { ZardButtonComponent } from '../../shared/components/button';
@Component({
  selector: 'app-pricing-result',
  imports: [RouterLink, ProductThumbnail, StatusPill, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let d = evaluation();
    <article class="pricing-row" [attr.aria-label]="d.variant.sku + ' pricing insight'">
      <app-product-thumbnail [name]="d.variant.productName" />
      <div class="pricing-identity">
        <a [routerLink]="['/products', d.variant.productId]" [queryParams]="catalogQuery()">{{
          d.variant.productName
        }}</a>
        <p>{{ d.variant.name }} · {{ d.variant.sku }}</p>
      </div>
      <dl>
        <dt>Current variant price</dt>
        <dd>{{ money(d.inputs.currentPrice, d.window.currencyCode) }}</dd>
      </dl>
      <app-status-pill [label]="label(d)" /><button
        z-button
        zType="outline"
        [id]="'pricing-open-' + d.variant.variantId"
        type="button"
        (click)="inspect.emit(d.variant.variantId)"
        [attr.aria-label]="'Review insight for ' + d.variant.sku"
      >
        Review insight
      </button>
      <p class="row-reason">{{ reason(d) }}</p>
    </article>`,
  styles: [
    `
      :host {
        display: block;
      }
      .pricing-row {
        display: grid;
        grid-template-columns: 48px minmax(0, 1.6fr) minmax(130px, 1fr) minmax(130px, 1fr) auto;
        gap: 12px 20px;
        align-items: center;
        padding: 18px 0;
        border-bottom: 1px solid var(--border);
      }
      app-product-thumbnail {
        width: 48px;
        aspect-ratio: 1;
        --product-thumbnail-size: 18px;
      }
      .pricing-identity {
        min-width: 0;
      }
      .pricing-identity a {
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .pricing-identity p {
        overflow-wrap: anywhere;
      }
      .pricing-identity p,
      dt {
        font-size: 13px;
        color: var(--muted-foreground);
        margin: 4px 0;
      }
      dl {
        margin: 0;
      }
      dd {
        margin: 0;
        font-weight: 600;
        font-size: 16px;
        overflow-wrap: anywhere;
      }
      .row-reason {
        grid-column: 2/-1;
        margin: 0;
        font-size: 14px;
        color: var(--muted-foreground);
      }
      @media (max-width: 1200px) {
        .pricing-row {
          grid-template-columns: 48px minmax(0, 1fr) auto;
        }
        .pricing-row dl {
          grid-column: 2;
        }
        .pricing-row app-status-pill {
          grid-column: 3;
          grid-row: 1;
        }
        .pricing-row button {
          grid-column: 3;
          grid-row: 2;
        }
        .row-reason {
          grid-column: 2/-1;
        }
      }
      @media (max-width: 600px) {
        .pricing-row {
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 12px;
        }
        app-product-thumbnail {
          width: 40px;
        }
        .pricing-row app-status-pill {
          grid-column: 2;
          grid-row: auto;
        }
        .pricing-row dl {
          grid-column: 2;
        }
        .pricing-row button {
          grid-column: 2;
          grid-row: auto;
          justify-self: start;
        }
        .row-reason {
          grid-column: 2;
        }
      }
    `,
  ],
})
export class PricingResult {
  readonly evaluation = input.required<Evaluation>();
  readonly catalogQuery = input<Params>({});
  readonly inspect = output<string>();
  readonly money = formatMoney;
  readonly label = pricingLabel;
  readonly reason = pricingReason;
  readonly eligible = actionable;
}
