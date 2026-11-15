import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { decisionNumber } from '../../shared/merchant/decision-summary';
import { Metrics } from './analytics-api.service';

@Component({
  selector: 'app-performance-coverage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="coverage"
    [class.complete]="metrics().costCoverageState === 'COMPLETE'"
    [class.partial]="metrics().costCoverageState === 'PARTIAL'"
  >
    <span>{{ state() }}</span>
    @let value = percent();
    @if (value !== null) {
      <progress
        max="100"
        [value]="value"
        [attr.aria-label]="'Known-cost sales coverage for ' + productName()"
      ></progress>
    }
    <small>{{
      metrics().salesCostCoveragePercent === null
        ? 'No sales denominator'
        : number(metrics().salesCostCoveragePercent) + '% of sales lines'
    }}</small>
  </div>`,
  styles: [
    `
      .coverage {
        min-width: 110px;
      }
      span {
        font-size: 11px;
      }
      .complete > span {
        color: var(--success-foreground);
      }
      .partial > span {
        color: var(--warning-foreground);
      }
      small {
        display: block;
        margin-top: 5px;
        color: var(--muted-foreground);
        font-size: 10px;
      }
      progress {
        display: block;
        width: 96px;
        height: 4px;
        border: 0;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 7px;
        background: var(--muted);
        accent-color: var(--warning-foreground);
      }
      progress::-webkit-progress-bar {
        background: var(--muted);
      }
      progress::-webkit-progress-value {
        background: var(--warning-foreground);
      }
      progress::-moz-progress-bar {
        background: var(--warning-foreground);
      }
      .complete progress {
        accent-color: var(--success-foreground);
      }
      .complete progress::-webkit-progress-value {
        background: var(--success-foreground);
      }
      .complete progress::-moz-progress-bar {
        background: var(--success-foreground);
      }
    `,
  ],
})
export class PerformanceCoverage {
  readonly metrics = input.required<Metrics>();
  readonly productName = input.required<string>();
  readonly number = decisionNumber;
  readonly state = computed(() => {
    const value = this.metrics().costCoverageState;
    return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ').toLowerCase();
  });
  readonly percent = computed(() => {
    const value = this.metrics().salesCostCoveragePercent;
    return value !== null && /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value))
      ? Number(value)
      : null;
  });
}
