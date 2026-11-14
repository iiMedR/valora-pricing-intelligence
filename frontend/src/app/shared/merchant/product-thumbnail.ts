import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideNotebookPen,
  lucideArmchair,
  lucideUtensils,
  lucideShoppingBag,
  lucidePackage,
} from '@ng-icons/lucide';
/** Only public, credential-free supported image locations. Current catalog DTO has no image field. */
export function productImageSource(
  source: string | null | undefined,
  base = document.baseURI,
): string | null {
  if (!source) return null;
  try {
    const url = new URL(source, base),
      origin = new URL(base).origin;
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)
    )
      return null;
    if (url.origin === origin && /^\/(assets|images)\//.test(url.pathname)) return url.href;
    return url.protocol === 'https:' && url.hostname === 'cdn.shopify.com' && !url.port
      ? url.href
      : null;
  } catch {
    return null;
  }
}
@Component({
  selector: 'app-product-thumbnail',
  imports: [NgIcon],
  viewProviders: [
    provideIcons({
      lucideNotebookPen,
      lucideArmchair,
      lucideUtensils,
      lucideShoppingBag,
      lucidePackage,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (safeSource(); as source) {
      <img
        [src]="source"
        [alt]="name()"
        width="256"
        height="192"
        loading="lazy"
        decoding="async"
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        (error)="failed.set(source)"
      />
    } @else {
      <span
        class="thumbnail-placeholder"
        role="img"
        [attr.aria-label]="'No image available for ' + name()"
      >
        @if (categoryIcon(); as icon) {
          <ng-icon [name]="icon" aria-hidden="true" />
          <small aria-hidden="true">{{ category() }} illustration</small>
        } @else {
          <span aria-hidden="true">{{ initials() }}</span>
        }
      </span>
    }`,
  styles: [
    `
      :host {
        display: block;
        aspect-ratio: 4/3;
        overflow: hidden;
        border-radius: 10px;
        background: var(--muted);
        color: var(--muted-foreground);
      }
      img,
      .thumbnail-placeholder {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .thumbnail-placeholder:has(ng-icon) {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 12px;
        background: var(--illustration-surface);
      }
      ng-icon {
        font-size: var(--product-thumbnail-size, 42px);
        stroke-width: 1.2;
      }
      small {
        font-size: 11px;
        font-weight: 400;
        letter-spacing: 0;
      }
      .thumbnail-placeholder {
        display: grid;
        place-items: center;
        font-size: var(--product-thumbnail-size, clamp(24px, 3vw, 40px));
        font-weight: 500;
        letter-spacing: -1px;
      }
    `,
  ],
})
export class ProductThumbnail {
  readonly name = input.required<string>();
  readonly source = input<string | null>(null);
  readonly category = input('');
  readonly categoryIcon = computed(() => {
    const icons: Record<string, string> = {
      Stationery: 'lucideNotebookPen',
      Home: 'lucideArmchair',
      Kitchen: 'lucideUtensils',
      Accessories: 'lucideShoppingBag',
      Pantry: 'lucidePackage',
    };
    return icons[this.category()] ?? null;
  });
  readonly failed = signal('');
  readonly safeSource = computed(() => {
    const source = productImageSource(this.source());
    return source && source !== this.failed() ? source : null;
  });
  readonly initials = computed(
    () =>
      this.name()
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0] || '')
        .join('')
        .toUpperCase() || '?',
  );
}
