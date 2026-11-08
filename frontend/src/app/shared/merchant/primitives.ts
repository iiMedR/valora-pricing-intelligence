import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ZardCardImports } from '../components/card';
import { ZardButtonComponent } from '../components/button';
import { ZardSkeletonComponent } from '../components/skeleton';
import { ZardEmptyComponent } from '../components/empty';
import { ZardAlertComponent } from '../components/alert';
import { ZardTooltipDirective } from '../components/tooltip';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo } from '@ng-icons/lucide';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="merchant-page-header">
    <div>
      <h1>{{ title() }}</h1>
      <p class="muted">{{ description() }}</p>
    </div>
    <ng-content />
  </div>`,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input('');
}

@Component({
  selector: 'app-metric-card',
  imports: [ZardCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<z-card
    ><z-card-header><z-card-description [zDescription]="label()" /></z-card-header
    ><z-card-content
      ><p class="merchant-metric">{{ value() }}</p>
      <p class="metric-context">{{ context() }}</p></z-card-content
    ></z-card
  >`,
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly context = input('');
}

@Component({
  selector: 'app-status-notice',
  imports: [ZardAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<z-alert [zTitle]="title()" [zDescription]="description()" />`,
})
export class StatusNotice {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

@Component({
  selector: 'app-empty-state',
  imports: [ZardEmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<z-empty [zTitle]="title()" [zDescription]="description()" />
    <div class="empty-state-actions"><ng-content /></div>`,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

@Component({
  selector: 'app-error-state',
  imports: [ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div role="alert" class="error">
    <h2>{{ title() }}</h2>
    <p>{{ description() }}</p>
    <button z-button zType="outline" type="button" (click)="retry.emit()">Try again</button>
  </div>`,
})
export class ErrorState {
  readonly title = input('Could not load your overview');
  readonly description = input(
    'Your records have not changed. Check the connection and try again.',
  );
  readonly retry = output<void>();
}

@Component({
  selector: 'app-loading-skeleton',
  imports: [ZardSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div role="status" aria-label="Loading overview" class="loading-cards">
    @for (item of [1, 2, 3, 4]; track item) {
      <z-skeleton class="h-28 w-full" />
    }
    <span class="sr-only">Loading overview…</span>
  </div>`,
})
export class LoadingSkeleton {}

@Component({
  selector: 'app-help-tooltip',
  imports: [ZardTooltipDirective, ZardButtonComponent, NgIcon],
  viewProviders: [provideIcons({ lucideInfo })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    z-button
    zType="ghost"
    type="button"
    [zTooltip]="text()"
    zTrigger="click"
    [attr.aria-label]="text()"
  >
    <ng-icon name="lucideInfo" aria-hidden="true" />
  </button>`,
})
export class HelpTooltip {
  readonly text = input.required<string>();
}

@Component({
  selector: 'app-data-freshness',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="freshness">
    {{ label() }}:
    {{
      timestamp()
        ? (timestamp() | date: 'yyyy-MM-dd HH:mm' : 'UTC') + ' UTC'
        : 'No completed import'
    }}
  </p>`,
})
export class DataFreshness {
  readonly label = input('Last successful import through');
  readonly timestamp = input<string | null>(null);
}

export interface ChecklistItem {
  label: string;
  href: string;
  description?: string;
  complete?: boolean;
}
@Component({
  selector: 'app-readiness-checklist',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul class="readiness-list">
    @for (item of items(); track item.label) {
      <li>
        <a [routerLink]="item.href"
          ><span class="check-marker" aria-hidden="true">{{ item.complete ? '✓' : '○' }}</span
          ><span
            >{{ item.label }}
            @if (item.description) {
              <small>{{ item.description }}</small>
            }</span
          ><span aria-hidden="true">›</span></a
        >
      </li>
    }
  </ul>`,
})
export class ReadinessChecklist {
  readonly items = input.required<ChecklistItem[]>();
}

@Component({
  selector: 'app-chart-panel',
  imports: [ZardCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<z-card class="[--card-spacing:20px]"
    ><z-card-header
      ><h2 z-card-title [zTitle]="title()" class="text-base font-semibold m-0"></h2>
      <z-card-description [zDescription]="description()" /></z-card-header
    ><z-card-content><ng-content /></z-card-content
  ></z-card>`,
})
export class ChartPanel {
  readonly title = input.required<string>();
  readonly description = input('');
}

@Component({
  selector: 'app-responsive-data-table, app-responsive-data-list',
  styles: [
    ':host { display:block; min-width:0; max-width:100%; } .scroll-region { overflow-x:auto; }',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="scroll-region" role="region" [attr.aria-label]="label()" tabindex="0">
    <ng-content />
  </div>`,
})
export class ResponsiveDataTable {
  readonly label = input.required<string>();
}

// Foundation names reuse the established Zard-backed primitives.
export {
  MetricCard as StatCard,
  StatusNotice as InlineNotice,
  ResponsiveDataTable as ResponsiveDataList,
};
