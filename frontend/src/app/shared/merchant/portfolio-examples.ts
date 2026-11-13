import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioContext, PORTFOLIO_EXAMPLES } from '../../core/portfolio-context';
@Component({
  selector: 'app-portfolio-examples',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (portfolio.active()) {
    <section class="examples" aria-labelledby="portfolio-examples-title">
      <h2 id="portfolio-examples-title">Explore the portfolio</h2>
      <p>
        Synthetic examples. Compare financial calculations, experimental suggestions and cases where
        the model gets it wrong.
      </p>
      <details>
        <summary>Choose an example</summary>
        <div class="example-links">
          @for (example of examples; track example.sku) {
            <a
              [routerLink]="['/products']"
              [queryParams]="{ search: example.productName, page: 0, view: 'grid' }"
            >
              <strong
                >{{ example.failure ? 'Known synthetic failure · ' : ''
                }}{{ example.title }}</strong
              ><span>{{ example.context }}</span>
            </a>
          }
        </div>
      </details>
    </section>
  }`,
  styles: [
    `
      .examples {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px 20px;
        margin: 16px 0 24px;
      }
      h2 {
        font-size: 16px;
        margin: 0 0 6px;
      }
      p {
        font-size: 13px;
        color: var(--muted-foreground);
        max-width: 76ch;
        margin: 0 0 12px;
      }
      summary {
        cursor: pointer;
        min-height: 32px;
        font-size: 13px;
      }
      .example-links {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 8px;
      }
      a {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 13px;
        overflow-wrap: anywhere;
      }
      a span {
        color: var(--muted-foreground);
      }
      a:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 3px;
      }
      @media (max-width: 600px) {
        .example-links {
          grid-template-columns: 1fr;
        }
        .examples {
          padding: 14px;
        }
      }
    `,
  ],
})
export class PortfolioExamples {
  readonly portfolio = inject(PortfolioContext);
  readonly examples = PORTFOLIO_EXAMPLES;
}
@Component({
  selector: 'app-portfolio-story',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (portfolio.example(sku()); as example) {
    <aside class="story" aria-label="Synthetic portfolio context">
      <strong
        >{{ example.failure ? 'Known synthetic failure' : 'Synthetic example' }} ·
        {{ example.title }}</strong
      >
      <p>{{ example.context }}</p>
      @if (example.failure) {
        <p>Approval is not evidence of correctness. No price is applied.</p>
      }
    </aside>
  }`,
  styles: [
    `
      .story {
        border-inline-start: 3px solid currentColor;
        padding: 10px 14px;
        margin: 12px 0;
        font-size: 13px;
        max-width: 80ch;
      }
      .story p {
        margin: 5px 0;
        color: var(--muted-foreground);
      }
    `,
  ],
})
export class PortfolioStory {
  readonly portfolio = inject(PortfolioContext);
  readonly sku = input.required<string>();
}

@Component({
  selector: 'app-portfolio-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (portfolio.exampleByName(productName()); as example) {
    <span>{{ example.failure ? 'Known synthetic failure' : example.title }}</span>
  }`,
  styles: [
    `
      span {
        display: inline-block;
        font-size: 12px;
        font-weight: 500;
        border-top: 1px solid var(--border);
        padding-top: 7px;
        margin-top: 7px;
        line-height: 1.4;
      }
    `,
  ],
})
export class PortfolioBadge {
  readonly portfolio = inject(PortfolioContext);
  readonly productName = input.required<string>();
}
