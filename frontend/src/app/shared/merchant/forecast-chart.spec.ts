import { TestBed } from '@angular/core/testing';
import { ForecastChart, forecastChartRows } from './forecast-chart';
import type { DemandDetail } from '../../features/forecasting/forecast-api.service';

describe('Forecast chart presentation data', () => {
  it('keeps observed and future points separate, preserves zero and exact forecast strings', () => {
    const detail = {
      history: [{ date: '2025-12-31', units: 0, censored: true }],
      forecast: {
        daily: [
          { date: '2026-01-01', expectedUnits: '14.123456789' },
          { date: '2026-01-02', expectedUnits: '0.0000' },
        ],
      },
    } as unknown as DemandDetail;
    const rows = forecastChartRows(detail);
    expect(rows[0]).toMatchObject({ observed: 0, forecast: null, censored: 0 });
    expect(rows[1]).toMatchObject({
      observed: null,
      forecastExact: '14.123456789',
      censored: null,
    });
    expect(rows[2]).toMatchObject({ observed: null, forecast: 0, forecastExact: '0.0000' });
    expect(detail.forecast.daily[0].expectedUnits).toBe('14.123456789');
  });
  it('limits only the displayed history and never fabricates a forecast for an unavailable result', () => {
    const history = Array.from({ length: 92 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 9, i + 1)).toISOString().slice(0, 10),
      units: i,
      censored: false,
    }));
    const rows = forecastChartRows({ history, forecast: { daily: [] } } as unknown as DemandDetail);
    expect(rows).toHaveLength(90);
    expect(rows[0].date).toBe(history[2].date);
    expect(rows.every((row) => row.forecast === null && row.forecastExact === null)).toBe(true);
    expect(history).toHaveLength(92);
  });
});

describe('Forecast date inspector', () => {
  it('initially selects the displayed forecast date and keeps the native selector in sync when stepping', async () => {
    TestBed.configureTestingModule({ imports: [ForecastChart] });
    const fixture = TestBed.createComponent(ForecastChart);
    fixture.componentRef.setInput('detail', {
      history: [{ date: '2025-12-31', units: 20, censored: false }],
      forecast: { daily: [{ date: '2026-01-01', expectedUnits: '14.0000' }] },
    } as unknown as DemandDetail);
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const readout = () => fixture.nativeElement.querySelector('.selected-point').textContent;
    expect(select.value).toBe('2026-01-01');
    expect(readout()).toContain('14.0000');
    (
      fixture.nativeElement.querySelector('[aria-label="Previous chart date"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(select.value).toBe('2025-12-31');
    expect(readout()).toContain('Observed');
    expect(readout()).toContain('20.0000');
    expect(
      (
        fixture.nativeElement.querySelector(
          '[aria-label="Previous chart date"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    select.value = '2026-01-01';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(readout()).toContain('Forecast');
    expect(readout()).toContain('14.0000');
    expect(
      (fixture.nativeElement.querySelector('[aria-label="Next chart date"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
