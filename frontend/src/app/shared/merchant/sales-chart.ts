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
import { DatePipe } from '@angular/common';
import { Trends, decimalText } from '../../features/analytics/analytics-api.service';
import { ResponsiveDataTable } from './primitives';
import { ZardChartImports } from '../components/chart/chart.imports';
import type {
  ZardChartConfig,
  ZardChartSeries,
  ZardChartOptionOverride,
} from '../components/chart/chart.types';
import {
  buildTooltipHtml,
  type ZardChartTooltipParam,
} from '../components/chart/chart-tooltip.formatter';
import { ZardDarkMode, EDarkModes } from '../services/dark-mode';
import { provideZardCharts } from '../components/chart/chart-echarts.provider';

/** Coordinates are approximate; the table and selected value retain server decimals. */
@Component({
  selector: 'app-sales-chart',
  imports: [DatePipe, ResponsiveDataTable, ZardChartImports],
  // This milestone supports the accepted light theme; do not change the user's
  // document or localStorage merely because a chart was mounted.
  providers: [
    provideZardCharts(),
    { provide: ZardDarkMode, useValue: { themeMode: () => EDarkModes.LIGHT } },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().content.length) {
      @if (engineReady()) {
        <z-chart
          zType="line"
          [zConfig]="chartConfig()"
          [zData]="chartData()"
          [zSeries]="series"
          zXAxisKey="date"
          [zXAxisFormatter]="shortPeriod"
          [zYAxis]="true"
          [zYAxisFormatter]="axisValue"
          zRenderer="svg"
          [zAnimation]="false"
          [zLazyRender]="false"
          [zOption]="chartOptions()"
          class="h-64 w-full aspect-auto"
        >
          <z-chart-tooltip zIndicator="dot" />
        </z-chart>
      } @else if (engineError()) {
        <p role="alert">Chart could not load. Inspect exact sales values below.</p>
      } @else {
        <p role="status">Loading sales chart…</p>
      }
      <details>
        <summary>Inspect exact sales values</summary>
        <label class="chart-selector"
          >Inspect a period
          <select (change)="selected.set($any($event.target).value)" [value]="selectedDate()">
            @for (point of data().content; track point.date) {
              <option [value]="point.date">
                {{
                  point.date
                    | date: (data().granularity === 'MONTH' ? 'MMMM yyyy' : 'dd MMM yyyy') : 'UTC'
                }}
              </option>
            }
          </select>
        </label>
        <p role="status" class="chart-value">
          {{ selectedDate() }} ·
          <strong>{{ money(selectedValue()) }} {{ data().range.currencyCode }}</strong>
        </p>
        <app-responsive-data-table label="Net sales data">
          <table>
            <caption>
              Net sales by reporting period ·
              {{
                data().range.currencyCode
              }}
              · UTC
            </caption>
            <thead>
              <tr>
                <th scope="col">Period starting (UTC)</th>
                <th scope="col">Net sales</th>
              </tr>
            </thead>
            <tbody>
              @for (point of data().content; track point.date) {
                <tr>
                  <th scope="row">{{ point.date }}</th>
                  <td>{{ money(point.metrics.netSales) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </app-responsive-data-table>
      </details>
    } @else {
      <p class="muted">No sales observations in this period.</p>
    }
  `,
  styleUrl: './sales-chart.css',
})
export class SalesChart {
  readonly engineReady = signal(false);
  readonly engineError = signal(false);
  private engineRequested = false;
  constructor() {
    const destroy = inject(DestroyRef);
    // ngx-echarts cannot cancel an in-flight loader. Load before mounting its
    // directive so a fast route change cannot initialize a detached element.
    effect(() => {
      if (!this.data().content.length || this.engineRequested) return;
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
  readonly data = input.required<Trends>();
  readonly selected = signal('');
  readonly money = decimalText;
  readonly selectedDate = computed(() =>
    this.data().content.some((p) => p.date === this.selected())
      ? this.selected()
      : (this.data().content[0]?.date ?? ''),
  );
  readonly selectedValue = computed(
    () => this.data().content.find((p) => p.date === this.selectedDate())?.metrics.netSales ?? null,
  );
  readonly chartData = computed(() =>
    this.data().content.map((row) => ({ date: row.date, netSales: Number(row.metrics.netSales) })),
  );
  readonly chartConfig = computed<ZardChartConfig>(() => ({
    netSales: {
      label: 'Net sales · ' + this.data().range.currencyCode,
      color: 'var(--foreground)',
    },
  }));
  readonly series: ZardChartSeries[] = [
    { dataKey: 'netSales', smooth: true, strokeWidth: 2, showSymbol: false },
  ];
  readonly shortPeriod = (value: string) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      ...(this.data().granularity === 'MONTH' ? {} : { day: 'numeric' as const }),
      timeZone: 'UTC',
    }).format(new Date(value + 'T00:00:00Z'));
  readonly axisValue = (value: number) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  private readonly tooltip = (params: unknown) => {
    const points = params as ZardChartTooltipParam | ZardChartTooltipParam[];
    const point = Array.isArray(points) ? points[0] : points;
    const row = this.data().content[point?.dataIndex ?? -1];
    return buildTooltipHtml(points, {
      indicator: 'dot',
      trigger: 'axis',
      hideLabel: false,
      hideIndicator: false,
      class: '',
      labelClass: '',
      config: this.chartConfig(),
      colors: { ['Net sales · ' + this.data().range.currencyCode]: 'var(--foreground)' },
      valueFormatter: () =>
        decimalText(row?.metrics.netSales ?? null) + ' ' + this.data().range.currencyCode,
    });
  };
  readonly chartOptions = computed<ZardChartOptionOverride>(() => {
    const values = this.chartData().map((row) => row.netSales);
    return {
      textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        fontSize: 11,
      },
      grid: { left: 8, right: 12, top: 22, bottom: 8, containLabel: true },
      yAxis: {
        min: Math.min(0, ...values),
        max: Math.max(0, ...values) || 1,
        name: this.data().range.currencyCode,
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 11 },
      },
      xAxis: { axisLabel: { fontSize: 11, hideOverlap: true } },
      series: [{ smoothMonotone: 'x' }],
      tooltip: { formatter: this.tooltip },
    };
  });
}
