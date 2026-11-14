import { ChangeDetectionStrategy, Component, input } from '@angular/core';
/** Original user-supplied Valora raster assets; no reconstructed V or substituted wordmark. */
@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.large]': "size() === 'large'" },
  template: `<img
      class="symbol"
      src="/brand/valora-icon-64.png"
      srcset="/brand/valora-icon-128.png 2x"
      width="32"
      height="32"
      alt=""
    /><span class="wordmark"
      ><img src="/brand/valora-wordmark-light.png" width="840" height="210" alt="Valora"
    /></span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        vertical-align: middle;
      }
      .symbol {
        width: 32px;
        height: 32px;
        object-fit: contain;
        flex: none;
      }
      .wordmark {
        display: block;
        width: 106px;
        height: 34px;
        overflow: hidden;
      }
      .wordmark img {
        display: block;
        width: 164px;
        max-width: none;
        height: 41px;
      }
      :host(.large) {
        gap: 10px;
      }
      :host(.large) .symbol {
        width: 44px;
        height: 44px;
      }
      :host(.large) .wordmark {
        width: 132px;
        height: 44px;
      }
      :host(.large) .wordmark img {
        width: 205px;
        height: 51.25px;
      }
    `,
  ],
})
export class BrandMark {
  readonly size = input<'default' | 'large'>('default');
}
