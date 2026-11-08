import { ZardBadgeComponent } from '../components/badge';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModalFocus } from '../../core/confirmation';
import { ZardButtonComponent } from '../components/button';
/** Display-only rounding; financial calculations remain on the server. */
export function formatMoney(
  value: string | null | undefined,
  currency: string,
  locale = 'en',
): string {
  if (value == null || !/^-?\d+(\.\d+)?$/.test(value)) return 'Unavailable';
  let digits: number;
  try {
    digits =
      new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    return 'Unavailable';
  }
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  const padded = fraction.padEnd(digits + 1, '0');
  let units = BigInt(whole) * 10n ** BigInt(digits) + BigInt(padded.slice(0, digits) || '0');
  if (Number(padded[digits]) >= 5) units++;
  const scale = 10n ** BigInt(digits);
  const integer = units / scale;
  const decimal = (units % scale).toString().padStart(digits, '0');
  const parts = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).formatToParts(negative ? -integer : integer);
  let text = parts.map((p) => (p.type === 'fraction' ? decimal : p.value)).join('');
  if (negative && integer === 0n && units > 0n)
    text =
      new Intl.NumberFormat(locale)
        .formatToParts(-1)
        .filter((p) => p.type === 'minusSign')
        .map((p) => p.value)
        .join('') + text;
  return text + ' ' + currency;
}
let explanationId = 0;
@Component({
  selector: 'app-explain-more',
  imports: [ModalFocus, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button z-button zType="outline" type="button" (click)="show()" aria-haspopup="dialog">
      {{ label() }}
    </button>
    @if (open()) {
      <dialog
        appModal
        class="explanation-dialog"
        [attr.aria-labelledby]="id"
        (modalCancelled)="open.set(false)"
      >
        <div class="section-heading">
          <h2 [id]="id">{{ title() }}</h2>
          <button z-button zType="outline" autofocus type="button" (click)="open.set(false)">
            Close
          </button>
        </div>
        <div class="explanation-content"><ng-content /></div>
      </dialog>
    }`,
})
export class ExplainMore {
  readonly label = input('What does this mean?');
  readonly title = input.required<string>();
  readonly open = signal(false);
  readonly id = 'explanation-' + ++explanationId;
  show() {
    if (!document.querySelector('dialog[open]')) this.open.set(true);
  }
}
@Component({
  selector: 'app-product-identity',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="product-identity">
    <span class="product-image-fallback" role="img" aria-label="No product image available">{{
      initials()
    }}</span>
    <div>
      <a [routerLink]="['/products', productId()]">{{ name() }}</a>
      @if (subtitle()) {
        <p class="muted">{{ subtitle() }}</p>
      }
    </div>
  </div>`,
})
export class ProductIdentity {
  readonly name = input.required<string>();
  readonly productId = input.required<string>();
  readonly subtitle = input('');
  initials() {
    return this.name()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s.charAt(0))
      .join('')
      .toUpperCase();
  }
}
@Component({
  selector: 'app-status-pill',
  imports: [ZardBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<z-badge zType="secondary" class="status-pill">{{ label() }}</z-badge>`,
})
export class StatusPill {
  readonly label = input.required<string>();
}
@Component({
  selector: 'app-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label class="search-field">{{ label() }}<ng-content /></label>`,
})
export class SearchField {
  readonly label = input('Search products');
}
@Component({
  selector: 'app-insight-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="insight-summary">
    <h2>{{ title() }}</h2>
    <p>{{ description() }}</p>
    <div class="actions"><ng-content /></div>
  </section>`,
})
export class InsightSummary {
  readonly title = input.required<string>();
  readonly description = input('');
}
