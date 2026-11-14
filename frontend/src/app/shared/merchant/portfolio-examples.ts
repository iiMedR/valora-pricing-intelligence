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
      @if (startingPoints()) {
        <div class="starting-links" aria-label="Portfolio starting points">
          @for (example of startingExamples; track example.sku) {
            <a
              [routerLink]="['/products']"
              [queryParams]="{ search: example.productName, page: 0, view: 'grid' }"
              [class.failure-link]="example.failure"
              >{{ example.title
              }}<span>{{
                example.failure ? 'Known synthetic failure' : 'Synthetic example'
              }}</span></a
            >
          }
        </div>
      }
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
        background: var(--card);
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
      .starting-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 12px 0;
      }
      .starting-links a {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 12px;
        color: var(--interactive-foreground);
        font-weight: 600;
        padding: 10px 12px;
        min-height: 44px;
        background: var(--interactive-surface);
        text-decoration: none;
      }
      .starting-links span {
        font-size: 12px;
        font-weight: 400;
        color: var(--muted-foreground);
      }
      .starting-links .failure-link {
        color: var(--error-foreground);
        background: var(--error-surface);
        border-color: var(--error-border);
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
  readonly startingPoints = input(false);
  readonly examples = PORTFOLIO_EXAMPLES;
  readonly startingExamples = PORTFOLIO_EXAMPLES.filter((e) =>
    ['PORT-ELASTIC_HIGH-1', 'PORT-PROMOTION-1', 'PORT-SPARSE-1'].includes(e.sku),
  );
}
@Component({
  selector: 'app-portfolio-story',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (portfolio.example(sku()); as example) {
    @if (compact() && !example.failure) {
      <details class="story">
        <summary>Synthetic example · {{ example.title }}</summary>
        <p>{{ example.context }}</p>
      </details>
    } @else {
      <aside
        class="story"
        [class.known-failure]="example.failure"
        aria-label="Synthetic portfolio context"
      >
        <strong
          >{{ example.failure ? 'Known synthetic failure' : 'Synthetic example' }} ·
          {{ example.title }}</strong
        >
        <p>{{ example.context }}</p>
        @if (example.failure) {
          <p>Approval is not evidence of correctness. No price is applied.</p>
        }
      </aside>
    }
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
      .story {
        background: var(--canvas);
        border-radius: 0 8px 8px 0;
      }
      .known-failure {
        color: var(--error-foreground);
        background: var(--error-surface);
        border-color: var(--error-foreground);
      }
      .known-failure p {
        color: var(--error-foreground);
      }
    `,
  ],
})
export class PortfolioStory {
  readonly portfolio = inject(PortfolioContext);
  readonly sku = input.required<string>();
  readonly compact = input(false);
}

@Component({
  selector: 'app-portfolio-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (portfolio.exampleByName(productName()); as example) {
    <span [class.known-failure]="example.failure">{{
      example.failure ? 'Known synthetic failure' : example.title
    }}</span>
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
      .known-failure {
        color: var(--error-foreground);
        border-color: var(--error-border);
      }
    `,
  ],
})
export class PortfolioBadge {
  readonly portfolio = inject(PortfolioContext);
  readonly productName = input.required<string>();
}
