import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
} from '@ng-icons/lucide';
import { ZardButtonComponent } from '../components/button';
import { DemandDetail } from '../../features/forecasting/forecast-api.service';
import { decimalText } from '../../features/analytics/analytics-api.service';
import { ZardChartImports } from '../components/chart/chart.imports';
import { provideZardCharts } from '../components/chart/chart-echarts.provider';
import { ZardDarkMode, EDarkModes } from '../services/dark-mode';
import type {
  ZardChartConfig,
  ZardChartSeries,
  ZardChartOptionOverride,
} from '../components/chart/chart.types';
import {
  buildTooltipHtml,
  type ZardChartTooltipParam,
} from '../components/chart/chart-tooltip.formatter';

export function forecastChartRows(detail: DemandDetail) {
  const history = detail.history.slice(-90);
  return [
    ...history.map((day) => ({
      date: day.date,
      observed: day.units as number | null,
      forecast: null as number | null,
      forecastExact: null as string | null,
      censored: day.censored ? day.units : null,
    })),
    ...detail.forecast.daily.map((day) => ({
      date: day.date,
      observed: null as number | null,
      forecast:
        Number.isFinite(Number(day.expectedUnits)) && day.expectedUnits.trim() !== ''
          ? Number(day.expectedUnits)
          : null,
      forecastExact: day.expectedUnits,
      censored: null as number | null,
    })),
  ];
}

@Component({
  selector: 'app-forecast-chart',
  imports: [ZardChartImports, FormsModule, NgIcon, ZardButtonComponent],
  providers: [
    provideZardCharts(),
    provideIcons({ lucideCalendarDays, lucideChevronDown, lucideChevronLeft, lucideChevronRight }),
    { provide: ZardDarkMode, useValue: { themeMode: () => EDarkModes.LIGHT } },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="forecast-chart" aria-label="Observed units and expected sales forecast">
      @if (rows().length) {
        <div class="chart-toolbar">
          <div class="chart-legend">
            <span><i class="observed-key" aria-hidden="true"></i>Observed sales</span>
            @if (detail().forecast.daily.length) {
              <span><i class="forecast-key" aria-hidden="true"></i>Forecast</span>
            }
            @if (hasCensored()) {
              <span
                ><i class="censored-key" aria-hidden="true"></i>Stock-constrained observation</span
              >
            }
          </div>

          <div class="date-inspector" role="group" aria-label="Inspect chart values">
            <label class="date-control"
              ><span class="sr-only">Inspect chart date (UTC)</span
              ><ng-icon name="lucideCalendarDays" class="calendar-icon" aria-hidden="true" /><select
                [ngModel]="selectedDate()"
                (ngModelChange)="selected.set($event)"
                [ngModelOptions]="{ standalone: true }"
              >
                @for (row of rows(); track row.date) {
                  <option [value]="row.date">{{ fullDate(row.date) }}</option>
                }</select
              ><ng-icon name="lucideChevronDown" class="select-chevron" aria-hidden="true"
            /></label>
            <div class="date-navigation">
              <button
                z-button
                zType="outline"
                type="button"
                class="date-step"
                aria-label="Previous chart date"
                title="Previous date"
                (click)="moveDate(-1)"
                [disabled]="selectedIndex() <= 0"
              >
                <ng-icon name="lucideChevronLeft" aria-hidden="true" /></button
              ><button
                z-button
                zType="outline"
                type="button"
                class="date-step"
                aria-label="Next chart date"
                title="Next date"
                (click)="moveDate(1)"
                [disabled]="selectedIndex() >= rows().length - 1"
              >
                <ng-icon name="lucideChevronRight" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div class="selected-point" role="status" aria-live="polite">
          <span class="point-source" [class.is-forecast]="selectedRow()?.forecastExact != null">{{
            selectedRow()?.forecastExact != null ? 'Forecast' : 'Observed'
          }}</span
          ><strong>{{ selectedValue() }} <small>units</small></strong
          ><span class="selection-date">{{ fullDate(selectedDate()) }} UTC</span>
          @if (selectedRow()?.censored != null) {
            <span class="censored-note">Stock-constrained observation</span>
          }
        </div>
        @if (engineReady()) {
          <z-chart
            zType="area"
            [zConfig]="config"
            [zData]="rows()"
            [zSeries]="series"
            zXAxisKey="date"
            [zXAxisFormatter]="shortDate"
            [zYAxis]="true"
            zRenderer="svg"
            [zAnimation]="false"
            [zLazyRender]="false"
            [zOption]="options"
            class="h-72 w-full aspect-auto"
            ><z-chart-tooltip zIndicator="dot"
          /></z-chart>
        } @else if (engineError()) {
          <p role="alert">
            Chart could not load. Exact history and forecast values remain available below.
          </p>
        } @else {
          <p role="status">Loading sales and forecast chart…</p>
        }
        <p class="chart-note">
          Last {{ observedCount() }} observed days. Area fill shows units, not forecast uncertainty.
        </p>
      } @else {
        <p>No observed sales or forecast points in this period.</p>
      }
    </figure>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      figure {
        margin: 0;
      }
      .chart-legend,
      .chart-legend span {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chart-legend {
        gap: 12px 22px;
        margin: 8px 0 18px;
        font-size: 12px;
        color: var(--muted-foreground);
      }
      i {
        display: inline-block;
        width: 18px;
        border-top: 2px solid var(--foreground);
      }
      .forecast-key {
        border-top: 2px dashed var(--warning-foreground);
      }
      .censored-key {
        width: 6px;
        height: 6px;
        border: 0;
        border-radius: 50%;
        background: var(--error-foreground);
      }
      .chart-note {
        font-size: 11px;
        color: var(--muted-foreground);
        margin: 10px 0 14px;
      }

      .chart-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px 20px;
        margin-bottom: 14px;
      }
      .chart-toolbar .chart-legend {
        margin: 0;
      }
      .date-inspector,
      .date-navigation {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .date-control {
        display: block;
        position: relative;
        min-width: 0;
        margin: 0;
      }
      .date-control select {
        appearance: none;
        width: 170px;
        height: 40px;
        min-height: 40px;
        padding: 8px 30px 8px 34px;
        border: 1px solid var(--border);
        border-radius: 7px;
        background: var(--card);
        color: var(--foreground);
        font-size: 12px;
        cursor: pointer;
      }
      .date-control select:focus-visible {
        outline: 2px solid var(--interactive);
        outline-offset: 2px;
      }
      .calendar-icon,
      .select-chevron {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        color: var(--muted-foreground);
        font-size: 15px;
        pointer-events: none;
      }
      .calendar-icon {
        left: 11px;
      }
      .select-chevron {
        right: 10px;
        font-size: 13px;
      }
      .date-step {
        width: 36px;
        height: 40px;
        min-height: 40px;
        padding: 0;
      }
      .date-step ng-icon {
        font-size: 16px;
      }
      .selected-point {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px 14px;
        padding: 12px 14px;
        margin-bottom: 12px;
        background: var(--canvas);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 12px;
      }
      .point-source {
        padding: 3px 7px;
        border: 1px solid var(--border);
        border-radius: 5px;
        background: var(--card);
        font-size: 11px;
      }
      .point-source.is-forecast {
        border-color: var(--warning-border);
        color: var(--warning-foreground);
        background: var(--warning-surface);
      }
      .selected-point strong {
        font-size: 18px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .selected-point small {
        font-size: 12px;
        font-weight: 400;
        color: var(--muted-foreground);
      }
      .selection-date {
        margin-left: auto;
        color: var(--muted-foreground);
      }
      .censored-note {
        color: var(--error-foreground);
      }
      @media (max-width: 560px) {
        .date-inspector {
          width: 100%;
        }
        .date-control {
          flex: 1;
        }
        .date-control select {
          width: 100%;
        }
        .selection-date {
          width: 100%;
          margin: 0;
        }
      }
    `,
  ],
})
export class ForecastChart {
  readonly detail = input.required<DemandDetail>();
  readonly rows = computed(() => forecastChartRows(this.detail()));
  readonly observedCount = computed(() => Math.min(90, this.detail().history.length));
  readonly hasCensored = computed(() => this.rows().some((row) => row.censored !== null));
  readonly engineReady = signal(false);
  readonly engineError = signal(false);
  private engineRequested = false;
  readonly selected = signal('');
  readonly selectedDate = computed(() =>
    this.rows().some((row) => row.date === this.selected())
      ? this.selected()
      : (this.detail().forecast.daily[0]?.date ?? this.rows().at(-1)?.date ?? ''),
  );
  readonly selectedIndex = computed(() =>
    this.rows().findIndex((row) => row.date === this.selectedDate()),
  );
  moveDate(direction: number) {
    const row = this.rows()[this.selectedIndex() + direction];
    if (row) this.selected.set(row.date);
  }
  readonly fullDate = (date: string) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(date + 'T00:00:00Z'));
  readonly selectedRow = computed(() =>
    this.rows().find((row) => row.date === this.selectedDate()),
  );
  readonly selectedValue = computed(() => {
    const row = this.selectedRow();
    return decimalText(row?.forecastExact ?? (row?.observed == null ? null : String(row.observed)));
  });
  readonly config: ZardChartConfig = {
    observed: { label: 'Observed sales', color: 'var(--foreground)' },
    forecast: { label: 'Forecast', color: 'var(--warning-foreground)' },
    censored: { label: 'Stock-constrained observation', color: 'var(--error-foreground)' },
  };
  readonly series: ZardChartSeries[] = [
    { dataKey: 'observed', smooth: false, strokeWidth: 2, showSymbol: false, fillOpacity: 0.12 },
    { dataKey: 'forecast', smooth: false, strokeWidth: 2, showSymbol: false, fillOpacity: 0.1 },
    {
      dataKey: 'censored',
      type: 'line',
      smooth: false,
      strokeWidth: 0,
      showSymbol: true,
      symbolSize: 6,
    },
  ];
  readonly shortDate = (date: string) =>
    new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(date + 'T00:00:00Z'),
    );
  private readonly tooltip = (params: unknown) => {
    const points = params as ZardChartTooltipParam | ZardChartTooltipParam[];
    const first = Array.isArray(points) ? points[0] : points;
    const row = this.rows()[first?.dataIndex ?? -1];
    const visible = (Array.isArray(points) ? points : [points]).filter((point) => {
      if (point.seriesName === this.config['observed'].label) return row?.observed != null;
      if (point.seriesName === this.config['forecast'].label) return row?.forecast != null;
      if (point.seriesName === this.config['censored'].label) return row?.censored != null;
      return false;
    });
    if (!visible.length) return '';
    return buildTooltipHtml(visible, {
      indicator: 'dot',
      trigger: 'axis',
      hideLabel: false,
      hideIndicator: false,
      class: '',
      labelClass: '',
      config: this.config,
      colors: {},
      valueFormatter: (_value, name) =>
        decimalText(
          name === 'Forecast'
            ? row?.forecastExact
            : row?.observed == null
              ? null
              : String(row.observed),
        ) + ' units',
    });
  };
  readonly options: ZardChartOptionOverride = {
    textStyle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      fontSize: 12,
    },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: { axisLabel: { fontSize: 11, hideOverlap: true } },
    yAxis: { min: 0, name: 'Units', minInterval: 1, axisLabel: { fontSize: 11 } },
    series: [
      { connectNulls: false },
      { connectNulls: false, lineStyle: { type: 'dashed' } },
      { connectNulls: false },
    ],
    tooltip: { formatter: this.tooltip },
    aria: {
      enabled: true,
      description:
        'Daily observed sales and expected sales forecast. Black area: recorded sales. Dashed amber area: forecast. Red markers: stock-constrained observations. Zero baseline; no uncertainty interval is claimed. Exact values are available in the date inspector and tables.',
    },
  };
  constructor() {
    const destroy = inject(DestroyRef);
    effect(() => {
      if (!this.rows().length || this.engineRequested) return;
      this.engineRequested = true;
      void import('../components/chart/chart-echarts.registry')
        .then(() => {
          if (!destroy.destroyed) this.engineReady.set(true);
        })
        .catch(() => {
          if (!destroy.destroyed) this.engineError.set(true);
        });
    });
  }
}
