import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProductThumbnail } from '../../shared/merchant/product-thumbnail';
import { ZardButtonComponent } from '@/shared/components/button';
import { Variant, Readiness } from './forecast-api.service';
@Component({
  selector: 'app-forecast-product-choice',
  imports: [ProductThumbnail, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article [class.is-selected]="selected()">
      <div class="identity">
        <app-product-thumbnail [name]="variant().productName" />
        <div>
          <h2>{{ variant().productName }}</h2>
          <p>{{ variant().name }} · {{ variant().sku }}</p>
        </div>
      </div>
      <div class="history">
        <div>
          <span>Usable sales history</span
          ><strong
            >{{ readiness().eligibleDays }} <span>/ {{ readiness().days }} days</span></strong
          >
        </div>
        @if (readiness().days > 0) {
          <progress
            [value]="readiness().eligibleDays"
            [max]="readiness().days"
            [attr.aria-label]="'Usable sales days for ' + variant().sku"
          ></progress>
        }
      </div>
      <button
        z-button
        zType="outline"
        (click)="inspect.emit(variant())"
        [attr.aria-label]="'Inspect demand for ' + variant().sku"
      >
        {{ selected() ? 'View selected forecast' : 'View sales forecast' }}
      </button>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      article {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--card);
      }
      article:hover {
        border-color: var(--input);
      }
      article.is-selected {
        border-color: var(--interactive);
        background: var(--interactive-surface);
      }
      .identity {
        display: flex;
        gap: 12px;
        align-items: center;
        min-width: 0;
      }
      app-product-thumbnail {
        width: 40px;
        height: 40px;
        flex: none;
        --product-thumbnail-size: 16px;
      }
      .identity > div {
        min-width: 0;
      }
      h2 {
        margin: 0 0 5px;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.4;
      }
      p {
        margin: 0;
        font-size: 11px;
        color: var(--muted-foreground);
        overflow-wrap: anywhere;
      }
      .history {
        margin-top: auto;
      }
      .history > div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--muted-foreground);
      }
      strong {
        color: var(--foreground);
        font-weight: 600;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      strong span {
        color: var(--muted-foreground);
        font-weight: 400;
      }
      progress {
        appearance: none;
        display: block;
        width: 100%;
        height: 4px;
        margin: 10px 0 0;
        border: 0;
        border-radius: 4px;
        overflow: hidden;
        background: var(--muted);
        color: var(--interactive);
      }
      progress::-webkit-progress-bar {
        background: var(--muted);
      }
      progress::-webkit-progress-value {
        background: var(--interactive);
        border-radius: 4px;
      }
      progress::-moz-progress-bar {
        background: var(--interactive);
      }
      button {
        width: 100%;
        color: var(--interactive-foreground);
        margin-top: 0;
      }
      @media (max-width: 400px) {
        article {
          padding: 16px;
        }
      }
    `,
  ],
})
export class ForecastProductChoice {
  readonly variant = input.required<Variant>();
  readonly readiness = input.required<Readiness>();
  readonly selected = input(false);
  readonly inspect = output<Variant>();
}
