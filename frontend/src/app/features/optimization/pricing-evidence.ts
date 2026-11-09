import { ChangeDetectionStrategy, Component, computed, input, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Evaluation } from './optimization-api.service';
import { EvaluationHistory } from './evaluation-history';
import {
  actionable,
  pricingLabel,
  pricingReason,
} from '../../shared/merchant/pricing-presentation';
import { SensitivitySummary, decisionNumber } from '../../shared/merchant/decision-summary';
import { explainReason, statusLabel } from '../../core/presentation';
@Component({
  selector: 'app-pricing-evidence',
  imports: [DatePipe, RouterLink, EvaluationHistory, SensitivitySummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pricing-evidence.html',
  styleUrl: './pricing-evidence.css',
})
export class PricingEvidence {
  readonly evaluation = input.required<Evaluation>();
  readonly history = viewChild(EvaluationHistory);
  readonly saving = computed(() => this.history()?.saving() ?? false);
  readonly eligible = actionable;
  readonly label = pricingLabel;
  readonly reason = pricingReason;
  readonly explain = explainReason;
  readonly status = statusLabel;
  readonly number = decisionNumber;
  readonly chart = computed(() => {
    const e = this.evaluation(),
      points = actionable(e) ? e.sensitivity : [];
    if (points.length < 2) return null;
    const low = Number(points[0].price),
      high = Number(points.at(-1)!.price),
      vals = points.map((p) => Number(p.estimatedContribution));
    if (![low, high, ...vals].every(Number.isFinite) || high <= low) return null;
    const min = Math.min(0, ...vals),
      max = Math.max(0, ...vals),
      x = (n: number) => 45 + ((n - low) / (high - low)) * 710,
      y = (n: number) => 190 - ((n - min) / (max - min || 1)) * 160;
    return {
      points: points
        .map((p) => x(Number(p.price)) + ',' + y(Number(p.estimatedContribution)))
        .join(' '),
      min,
      max,
      low,
      high,
      zero: y(0),
      dots: points.map((p) => ({
        ...p,
        x: x(Number(p.price)),
        y: y(Number(p.estimatedContribution)),
      })),
    };
  });
}
